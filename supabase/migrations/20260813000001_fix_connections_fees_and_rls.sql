-- 20260813000001_fix_connections_fees_and_rls.sql
-- 1. Fix invite_assistant phone matching with last 10 digits
-- 2. Fix accept_connection_request and reject_connection_request authorization for assistants and doctors
-- 3. Update consultation_payments RLS to allow all clinic members (assistants included) to record payments

-- ── 1. invite_assistant ──────────────────────────────────────────────────────
create or replace function invite_assistant(p_assistant_phone text)
returns connection_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_assistant profiles;
  caller_clinic_id uuid;
  clean_input_phone text;
  new_row connection_requests;
begin
  select clinic_id into caller_clinic_id from profiles where id = auth.uid();
  if caller_clinic_id is null then
    raise exception 'Caller has no clinic';
  end if;

  clean_input_phone := right(regexp_replace(p_assistant_phone, '\D', '', 'g'), 10);
  if length(clean_input_phone) < 10 then
    raise exception 'Please enter a valid 10-digit phone number';
  end if;

  select * into target_assistant from profiles
    where role = 'assistant'
      and right(regexp_replace(phone, '\D', '', 'g'), 10) = clean_input_phone
    limit 1;

  if target_assistant is null then
    raise exception 'No assistant found with that phone number. Please ensure the assistant has registered first.';
  end if;

  -- Check if already connected to this clinic
  if target_assistant.clinic_id = caller_clinic_id then
    raise exception 'Assistant is already connected to your clinic.';
  end if;

  -- Check if existing pending request exists
  select * into new_row from connection_requests
    where clinic_id = caller_clinic_id
      and requester_id = target_assistant.id
      and status = 'pending'
    limit 1;

  if new_row is not null then
    return new_row;
  end if;

  insert into connection_requests (clinic_id, doctor_id, requester_id, requester_role, initiated_by)
    values (caller_clinic_id, auth.uid(), target_assistant.id, 'assistant', 'doctor')
    returning * into new_row;

  return new_row;
end;
$$;

grant execute on function invite_assistant(text) to authenticated;

-- ── 2. accept_connection_request ─────────────────────────────────────────────
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

  -- Allow the recipient to accept:
  -- If initiated by doctor -> recipient is requester_id (the assistant)
  -- If initiated by requester/assistant -> recipient is doctor_id (the doctor)
  if req.initiated_by = 'doctor' then
    if req.requester_id <> auth.uid() and req.doctor_id <> auth.uid() then
      raise exception 'Only the invited assistant can accept this invitation';
    end if;
  else
    if req.doctor_id <> auth.uid() and req.requester_id <> auth.uid() then
      raise exception 'Only the target doctor can accept this request';
    end if;
  end if;

  insert into clinic_members (clinic_id, profile_id, member_role)
    values (req.clinic_id, req.requester_id, req.requester_role)
    on conflict (clinic_id, profile_id) do nothing;

  update profiles set clinic_id = req.clinic_id where id = req.requester_id;

  update connection_requests set status = 'accepted' where id = p_request_id;
end;
$$;

grant execute on function accept_connection_request(uuid) to authenticated;

-- ── 3. reject_connection_request ─────────────────────────────────────────────
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
      and (doctor_id = auth.uid() or requester_id = auth.uid())
      and status = 'pending';
end;
$$;

grant execute on function reject_connection_request(uuid) to authenticated;

-- ── 4. RLS for consultation_payments ─────────────────────────────────────────
drop policy if exists consultation_payments_insert_doctor on consultation_payments;
drop policy if exists consultation_payments_insert_clinic_members on consultation_payments;

create policy consultation_payments_insert_clinic_members on consultation_payments
  for insert with check (
    clinic_id in (select current_clinic_ids())
  );
