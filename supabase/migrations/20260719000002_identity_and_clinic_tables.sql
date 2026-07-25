-- profiles: replaces the doctors / assistants / admins Mongo collections.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('doctor', 'assistant', 'admin')),
  phone text not null,
  name text,
  specialty text, -- doctor: specialty; assistant: qualification (same overload as today)
  reg_number text, -- doctor only
  experience_years int, -- assistant only
  address text,
  city text,
  signature_url text, -- doctor only, Cloudinary URL
  clinic_id uuid, -- FK added after clinics exists below; nullable "primary clinic"
  doctor_code text unique, -- doctors only
  is_profile_complete boolean not null default false,
  is_active boolean not null default true,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_role_phone_key on profiles (role, phone);
create index profiles_clinic_id_idx on profiles (clinic_id);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- clinics
create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text,
  address text,
  phone text,
  email text,
  logo_url text,
  qr_code_url text,
  owner_id uuid references profiles(id),
  solo_mode boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_clinic_id_fkey foreign key (clinic_id) references clinics(id);

create trigger clinics_set_updated_at
  before update on clinics
  for each row execute function set_updated_at();

-- clinic_members: source of truth for clinic access once a clinic has
-- multiple doctors and/or assistants. profiles.clinic_id remains a simple
-- "primary clinic" pointer for the common single-clinic case.
create table clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  member_role text not null check (member_role in ('owner', 'doctor', 'assistant')),
  joined_at timestamptz not null default now(),
  unique (clinic_id, profile_id)
);

create index clinic_members_profile_id_idx on clinic_members (profile_id);
create index clinic_members_clinic_id_idx on clinic_members (clinic_id);

-- Recompute clinics.solo_mode whenever clinic_members changes: solo_mode is
-- true only when there is exactly one owner/doctor member and zero assistant
-- members. Replaces the scattered manual solo_mode flips in the old
-- connection_service.py.
create or replace function recompute_solo_mode()
returns trigger
language plpgsql
as $$
declare
  target_clinic_id uuid;
  doctor_count int;
  assistant_count int;
begin
  target_clinic_id := coalesce(new.clinic_id, old.clinic_id);

  select count(*) filter (where member_role in ('owner', 'doctor')),
         count(*) filter (where member_role = 'assistant')
    into doctor_count, assistant_count
    from clinic_members
    where clinic_id = target_clinic_id;

  update clinics
    set solo_mode = (doctor_count <= 1 and assistant_count = 0)
    where id = target_clinic_id;

  return null;
end;
$$;

create trigger clinic_members_recompute_solo_mode
  after insert or delete on clinic_members
  for each row execute function recompute_solo_mode();

-- connection_requests: generalizes the old assistant-only invite/join flow to
-- also allow a second doctor to join an existing clinic via the owner's
-- doctor_code.
create table connection_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id),
  doctor_id uuid references profiles(id), -- inviting/target doctor (clinic owner)
  requester_id uuid not null references profiles(id), -- assistant or joining doctor
  requester_role text not null check (requester_role in ('assistant', 'doctor')),
  initiated_by text not null check (initiated_by in ('doctor', 'requester')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index connection_requests_requester_id_idx on connection_requests (requester_id);
create index connection_requests_doctor_id_idx on connection_requests (doctor_id);
create index connection_requests_status_idx on connection_requests (status);

create trigger connection_requests_set_updated_at
  before update on connection_requests
  for each row execute function set_updated_at();

-- Accepting a connection request inserts the requester into clinic_members
-- (as either 'doctor' or 'assistant') and marks the request accepted, in one
-- atomic transaction.
create or replace function accept_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req connection_requests;
begin
  select * into req from connection_requests where id = p_request_id for update;

  if req is null then
    raise exception 'Connection request not found';
  end if;

  if req.status <> 'pending' then
    raise exception 'Connection request is not pending';
  end if;

  if req.doctor_id <> auth.uid() then
    raise exception 'Only the target doctor can accept this request';
  end if;

  insert into clinic_members (clinic_id, profile_id, member_role)
    values (req.clinic_id, req.requester_id, req.requester_role)
    on conflict (clinic_id, profile_id) do nothing;

  update profiles set clinic_id = req.clinic_id where id = req.requester_id;

  update connection_requests set status = 'accepted' where id = p_request_id;
end;
$$;

create or replace function reject_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update connection_requests
    set status = 'rejected'
    where id = p_request_id
      and doctor_id = auth.uid()
      and status = 'pending';
end;
$$;
