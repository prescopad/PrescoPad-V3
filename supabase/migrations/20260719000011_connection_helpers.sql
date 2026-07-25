-- invite_assistant: doctor invites an assistant by phone — creates a pending
-- connection_requests row initiated by the doctor (mirrors
-- backend_python/app/services/connection_service.py invite_assistant).
create or replace function invite_assistant(p_assistant_phone text)
returns connection_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_assistant profiles;
  caller_clinic_id uuid;
  new_row connection_requests;
begin
  select clinic_id into caller_clinic_id from profiles where id = auth.uid();
  if caller_clinic_id is null then
    raise exception 'Caller has no clinic';
  end if;

  select * into target_assistant from profiles where phone = p_assistant_phone and role = 'assistant';
  if target_assistant is null then
    raise exception 'No assistant found with that phone number';
  end if;

  insert into connection_requests (clinic_id, doctor_id, requester_id, requester_role, initiated_by)
    values (caller_clinic_id, auth.uid(), target_assistant.id, 'assistant', 'doctor')
    returning * into new_row;

  return new_row;
end;
$$;

grant execute on function invite_assistant(text) to authenticated;

-- disconnect_assistant: removes an assistant from the clinic (clinic_members
-- delete + clear profiles.clinic_id) — solo_mode recompute happens
-- automatically via the existing clinic_members trigger.
create or replace function disconnect_assistant(p_assistant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_clinic_id uuid;
begin
  select clinic_id into caller_clinic_id from profiles where id = auth.uid();
  if caller_clinic_id is null then
    raise exception 'Caller has no clinic';
  end if;

  delete from clinic_members where clinic_id = caller_clinic_id and profile_id = p_assistant_id and member_role = 'assistant';
  update profiles set clinic_id = null where id = p_assistant_id and clinic_id = caller_clinic_id and role = 'assistant';
end;
$$;

grant execute on function disconnect_assistant(uuid) to authenticated;

-- get_team: doctors + assistants in the caller's clinic (mirrors
-- connection_service.get_team).
create or replace function get_team()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_clinic_id uuid;
  result jsonb;
begin
  select clinic_id into caller_clinic_id from profiles where id = auth.uid();
  if caller_clinic_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) into result
    from (
      select id, name, phone, role, last_active_at, specialty, reg_number, experience_years, address, city
      from profiles
      where clinic_id = caller_clinic_id and id != auth.uid()
      order by role, name
    ) p;

  return result;
end;
$$;

grant execute on function get_team() to authenticated;

-- list_clinics: for the assistant "select hospital" / doctor "join existing
-- clinic" flows — returns clinics with their owning doctor's name/specialty.
create or replace function list_clinics(p_search text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) into result
    from (
      select
        cl.id, cl.name, cl.address, cl.phone, cl.owner_id,
        owner.name as "doctorName",
        owner.specialty as "doctorSpecialty"
      from clinics cl
      left join profiles owner on owner.id = cl.owner_id
      where p_search is null or cl.name ilike '%' || p_search || '%'
      order by cl.name
      limit 50
    ) c;

  return result;
end;
$$;

grant execute on function list_clinics(text) to authenticated;

-- get_doctors_by_clinic: for the assistant "select doctor" step and the
-- multi-doctor useClinicStore listing.
create or replace function get_doctors_by_clinic(p_clinic_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb) into result
    from (
      select id, name, specialty, reg_number, doctor_code
      from profiles
      where clinic_id = p_clinic_id and role = 'doctor' and is_active = true
      order by name
    ) d;

  return result;
end;
$$;

grant execute on function get_doctors_by_clinic(uuid) to authenticated;

-- get_pending_connection_requests: requests targeting the caller (as doctor)
-- or made by the caller (as requester), joined with names for display.
create or replace function get_pending_connection_requests()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into result
    from (
      select
        cr.id, cr.doctor_id as "doctorId", cr.requester_id as "assistantId",
        cr.initiated_by as "initiatedBy", cr.status, cr.created_at as "createdAt",
        doc.name as "doctorName", req.name as "assistantName", cl.name as "clinicName",
        req.specialty as "qualification", req.experience_years as "experienceYears",
        req.city, req.address as "assistantAddress", req.phone as "assistantPhone"
      from connection_requests cr
      left join profiles doc on doc.id = cr.doctor_id
      left join profiles req on req.id = cr.requester_id
      left join clinics cl on cl.id = cr.clinic_id
      where cr.status = 'pending'
        and (cr.doctor_id = auth.uid() or cr.requester_id = auth.uid())
      order by cr.created_at desc
    ) r;

  return result;
end;
$$;

grant execute on function get_pending_connection_requests() to authenticated;
