-- Audit finding: admin_create_clinic already accepted a p_city parameter and
-- both frontend/website admin "create/edit clinic" UIs have a real, working
-- City field (list display + create/edit form) — but clinics had no city
-- column, so the value was silently discarded on create, and
-- admin_update_clinic didn't even accept the parameter, so editing a
-- clinic's city did nothing. This adds the column and wires it through both
-- functions so the existing UI actually works.
alter table clinics add column city text;

-- create or replace does NOT replace a function when the argument list
-- changes shape — Postgres treats it as a new overload, leaving the old
-- 4-arg admin_update_clinic reachable (and now silently ignoring city on
-- any call site still using it). Drop the old signature explicitly.
drop function if exists admin_update_clinic(uuid, text, text, text);

create or replace function admin_create_clinic(p_name text, p_address text default null, p_phone text default null, p_city text default null)
returns clinics
language plpgsql
security definer
set search_path = public
as $$
declare
  new_row clinics;
begin
  perform assert_admin();
  if p_name is null or trim(p_name) = '' then
    raise exception 'Clinic name is required';
  end if;
  insert into clinics (name, address, phone, city, solo_mode) values (trim(p_name), p_address, p_phone, p_city, true) returning * into new_row;
  return new_row;
end;
$$;

create or replace function admin_update_clinic(
  p_clinic_id uuid,
  p_name text default null,
  p_address text default null,
  p_phone text default null,
  p_city text default null
)
returns clinics
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row clinics;
begin
  perform assert_admin();
  update clinics
    set name = coalesce(p_name, name),
        address = coalesce(p_address, address),
        phone = coalesce(p_phone, phone),
        city = coalesce(p_city, city)
    where id = p_clinic_id
    returning * into updated_row;

  if updated_row is null then
    raise exception 'Clinic not found';
  end if;

  return updated_row;
end;
$$;

grant execute on function admin_update_clinic(uuid, text, text, text, text) to authenticated;
