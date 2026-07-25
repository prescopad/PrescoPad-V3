-- generate_doctor_code(): 6-char uppercase-alnum code, loop-and-check for
-- uniqueness — mirrors backend_python/app/utils/hash.py generate_doctor_code
-- + auth_service.py _unique_doctor_code.
create or replace function generate_unique_doctor_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  exists_already boolean;
begin
  loop
    candidate := (
      select string_agg(substr(chars, ceil(random() * length(chars))::int, 1), '')
      from generate_series(1, 6)
    );
    select exists(select 1 from profiles where doctor_code = candidate) into exists_already;
    if not exists_already then
      return candidate;
    end if;
  end loop;
end;
$$;

-- handle_new_user: fires on first successful OTP verification (Supabase
-- auto-creates auth.users on first verifyOtp). Reads role from
-- raw_user_meta_data (client passes data: { role } to signInWithOtp),
-- provisions a profiles row, and — for doctors — also a clinic +
-- clinic_members owner row. No wallet row (dropped from schema).
--
-- Disabled during the one-time Mongo->Postgres data migration (see the
-- migration script) so historical profiles/clinics can be inserted with
-- their real created_at timestamps instead of fresh trigger defaults.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_role text;
  new_clinic_id uuid;
begin
  new_role := coalesce(new.raw_user_meta_data ->> 'role', 'doctor');

  insert into profiles (id, role, phone, is_profile_complete)
    values (new.id, new_role, new.phone, false);

  if new_role = 'doctor' then
    insert into clinics (name, owner_id, solo_mode)
      values ('Dr. Clinic (' || new.phone || ')', new.id, true)
      returning id into new_clinic_id;

    insert into clinic_members (clinic_id, profile_id, member_role)
      values (new_clinic_id, new.id, 'owner');

    update profiles
      set clinic_id = new_clinic_id,
          doctor_code = generate_unique_doctor_code()
      where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- complete_doctor_registration: atomically finishes doctor onboarding,
-- either creating a fresh clinic's details (default path) or joining an
-- existing clinic via the owner's doctor_code (new multi-doctor path).
create or replace function complete_doctor_registration(
  p_name text,
  p_specialty text default null,
  p_reg_number text default null,
  p_clinic_name text default null,
  p_clinic_address text default null,
  p_clinic_phone text default null,
  p_clinic_email text default null,
  p_join_clinic_code text default null
)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target_doctor profiles;
  updated_row profiles;
begin
  if p_join_clinic_code is not null then
    select * into target_doctor from profiles
      where doctor_code = p_join_clinic_code and role = 'doctor';

    if target_doctor is null then
      raise exception 'Invalid doctor code';
    end if;

    insert into connection_requests (clinic_id, doctor_id, requester_id, requester_role, initiated_by)
      values (target_doctor.clinic_id, target_doctor.id, auth.uid(), 'doctor', 'requester');
  else
    update clinics
      set name = coalesce(p_clinic_name, name),
          address = coalesce(p_clinic_address, address),
          phone = coalesce(p_clinic_phone, phone),
          email = coalesce(p_clinic_email, email)
      where owner_id = auth.uid();
  end if;

  update profiles
    set name = p_name,
        specialty = p_specialty,
        reg_number = p_reg_number,
        is_profile_complete = true
    where id = auth.uid()
    returning * into updated_row;

  return updated_row;
end;
$$;

create or replace function complete_assistant_registration(
  p_name text,
  p_qualification text default null,
  p_experience_years int default null,
  p_city text default null,
  p_address text default null
)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row profiles;
begin
  update profiles
    set name = p_name,
        specialty = p_qualification,
        experience_years = p_experience_years,
        city = p_city,
        address = p_address,
        is_profile_complete = true
    where id = auth.uid()
    returning * into updated_row;

  return updated_row;
end;
$$;
