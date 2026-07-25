-- patients
create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  name text not null,
  age int,
  gender text check (gender in ('male', 'female', 'other')),
  weight numeric,
  phone text,
  address text,
  blood_group text,
  allergies text,
  -- Redesigned casebook: one consolidated summary per patient, replacing the
  -- old per-prescription casebook_entries[] timeline.
  case_summary text,
  case_summary_updated_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_clinic_id_name_idx on patients (clinic_id, name);
create index patients_clinic_id_active_idx on patients (clinic_id) where is_deleted = false;

create trigger patients_set_updated_at
  before update on patients
  for each row execute function set_updated_at();

-- queue_counters: atomic per-clinic-per-day token sequence, replaces the
-- Mongo `counters` collection's queue_token:{clinic}:{date} keys.
create table queue_counters (
  clinic_id uuid not null references clinics(id),
  date date not null,
  seq int not null default 0,
  primary key (clinic_id, date)
);

create or replace function next_queue_token(p_clinic_id uuid, p_date date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  next_seq int;
begin
  insert into queue_counters (clinic_id, date, seq)
    values (p_clinic_id, p_date, 1)
    on conflict (clinic_id, date) do update set seq = queue_counters.seq + 1
    returning seq into next_seq;
  return next_seq;
end;
$$;

-- queue
create table queue (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  patient_id uuid not null references patients(id),
  status text not null default 'waiting' check (status in ('waiting', 'in_progress', 'completed', 'cancelled')),
  added_by uuid references profiles(id),
  token_number int not null,
  notes text,
  consultation_type text,
  added_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now()
);

create index queue_clinic_id_added_at_idx on queue (clinic_id, added_at);

create trigger queue_set_updated_at
  before update on queue
  for each row execute function set_updated_at();

create or replace function add_to_queue(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_notes text,
  p_consultation_type text
)
returns queue
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token int;
  new_row queue;
begin
  new_token := next_queue_token(p_clinic_id, current_date);

  insert into queue (clinic_id, patient_id, added_by, token_number, notes, consultation_type)
    values (p_clinic_id, p_patient_id, auth.uid(), new_token, p_notes, p_consultation_type)
    returning * into new_row;

  return new_row;
end;
$$;

create or replace function remove_from_queue(p_queue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update queue set is_deleted = true, updated_at = now() where id = p_queue_id;
end;
$$;

-- prescriptions
create sequence if not exists prescription_id_seq;

create or replace function generate_prescription_id()
returns text
language sql
as $$
  select 'RX-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(md5(nextval('prescription_id_seq')::text || random()::text), 1, 8));
$$;

create table prescriptions (
  id text primary key default generate_prescription_id(),
  clinic_id uuid not null references clinics(id),
  doctor_id uuid not null references profiles(id),
  patient_id uuid references patients(id),
  -- denormalized patient snapshot, same as today
  patient_name text,
  patient_age int,
  patient_gender text,
  patient_phone text,
  consultation_type text,
  chief_complaint text,
  diagnosis text,
  advice text,
  follow_up_date date,
  symptoms text[],
  vitals jsonb,
  referred_to text,
  medicines jsonb not null default '[]'::jsonb,
  lab_tests jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  -- Doctor-entered consultation charge. Assistants get SELECT on the whole
  -- row via RLS, which is what makes this visible to them — no separate
  -- endpoint/column-level grant needed.
  charge_amount numeric,
  signature text,
  pdf_hash text,
  pdf_storage_path text,
  finalized_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prescriptions_clinic_patient_created_idx on prescriptions (clinic_id, patient_id, created_at desc);
create index prescriptions_clinic_created_idx on prescriptions (clinic_id, created_at);
create index prescriptions_doctor_id_idx on prescriptions (doctor_id);

create trigger prescriptions_set_updated_at
  before update on prescriptions
  for each row execute function set_updated_at();

-- prescription_shares: split out of the prescription row so the public share
-- Edge Function never needs broad SELECT on prescriptions.
create table prescription_shares (
  id uuid primary key default gen_random_uuid(),
  prescription_id text not null references prescriptions(id),
  clinic_id uuid not null,
  share_token text not null unique,
  expires_at timestamptz not null,
  download_count int not null default 0,
  created_at timestamptz not null default now()
);

create index prescription_shares_prescription_id_idx on prescription_shares (prescription_id);

create or replace function get_or_create_share_token(p_prescription_id text)
returns prescription_shares
language plpgsql
security definer
set search_path = public
as $$
declare
  existing prescription_shares;
  rx prescriptions;
  new_row prescription_shares;
begin
  select * into existing
    from prescription_shares
    where prescription_id = p_prescription_id and expires_at > now()
    order by created_at desc
    limit 1;

  if existing is not null then
    return existing;
  end if;

  select * into rx from prescriptions where id = p_prescription_id;
  if rx is null then
    raise exception 'Prescription not found';
  end if;

  insert into prescription_shares (prescription_id, clinic_id, share_token, expires_at)
    values (
      p_prescription_id,
      rx.clinic_id,
      encode(gen_random_bytes(24), 'hex'),
      now() + interval '7 days'
    )
    returning * into new_row;

  return new_row;
end;
$$;

-- finalize_prescription: atomic status transition + charge_amount write.
-- No wallet deduction step (wallet dropped from schema per user decision).
create or replace function finalize_prescription(
  p_prescription_id text,
  p_signature text,
  p_pdf_hash text,
  p_charge_amount numeric default null
)
returns prescriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row prescriptions;
begin
  update prescriptions
    set status = 'finalized',
        signature = p_signature,
        pdf_hash = p_pdf_hash,
        charge_amount = coalesce(p_charge_amount, charge_amount),
        finalized_at = now()
    where id = p_prescription_id
      and doctor_id = auth.uid()
      and status = 'draft'
    returning * into updated_row;

  if updated_row is null then
    raise exception 'Prescription not found, not owned by caller, or already finalized';
  end if;

  return updated_row;
end;
$$;

-- Rebuild patients.case_summary whenever a prescription is finalized —
-- one consolidated paragraph, replacing the old per-entry timeline logic.
create or replace function regenerate_case_summary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  summary text;
  medicine_names text;
begin
  if new.status <> 'finalized' or new.patient_id is null then
    return new;
  end if;

  select string_agg(m.value ->> 'medicineName', ', ')
    into medicine_names
    from jsonb_array_elements(new.medicines) with ordinality as m(value, ordinal)
    where m.ordinal <= 3;

  summary := coalesce(new.diagnosis || '. ', '');
  if medicine_names is not null then
    summary := summary || 'Prescribed ' || medicine_names || '. ';
  end if;
  if new.referred_to is not null then
    summary := summary || 'Referred to ' || new.referred_to || '. ';
  end if;
  if new.follow_up_date is not null then
    summary := summary || 'Follow-up on ' || to_char(new.follow_up_date, 'DD Mon YYYY') || '.';
  end if;

  update patients
    set case_summary = trim(summary),
        case_summary_updated_at = now()
    where id = new.patient_id;

  return new;
end;
$$;

create trigger prescriptions_regenerate_case_summary
  after update of status on prescriptions
  for each row
  when (new.status = 'finalized')
  execute function regenerate_case_summary();

-- prescription_drafts, prescription_templates, custom_medicines,
-- custom_lab_tests: straightforward translations of their Mongo shapes.
create table prescription_drafts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  doctor_id uuid not null references profiles(id),
  patient_id uuid references patients(id),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prescription_drafts_clinic_id_idx on prescription_drafts (clinic_id);

create trigger prescription_drafts_set_updated_at
  before update on prescription_drafts
  for each row execute function set_updated_at();

create table prescription_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  doctor_id uuid not null references profiles(id),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prescription_templates_clinic_id_idx on prescription_templates (clinic_id);

create trigger prescription_templates_set_updated_at
  before update on prescription_templates
  for each row execute function set_updated_at();

create table custom_medicines (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  name text not null,
  type text,
  strength text,
  manufacturer text,
  usage_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (clinic_id, name)
);

create table custom_lab_tests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id),
  name text not null,
  category text,
  usage_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (clinic_id, name)
);

-- Reference catalogs: shared, read-only, no clinic_id. Seeded via a
-- service-role script (port of scripts/seed_medicine_catalog.py).
create table medicines_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  strength text,
  manufacturer text
);

create table lab_tests_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text
);
