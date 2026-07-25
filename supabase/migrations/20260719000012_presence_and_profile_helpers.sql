-- heartbeat: updates the caller's last_active_at, used for online-presence
-- detection (replaces POST /auth/heartbeat).
create or replace function heartbeat()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set last_active_at = now() where id = auth.uid();
end;
$$;

grant execute on function heartbeat() to authenticated;

-- get_doctor_status: online/offline status of every doctor in the caller's
-- clinic (15-minute activity window, mirrors clinic_service.get_doctor_status).
create or replace function get_doctor_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_clinic_id uuid;
  threshold timestamptz := now() - interval '15 minutes';
  result jsonb;
begin
  select clinic_id into caller_clinic_id from profiles where id = auth.uid();
  if caller_clinic_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb) into result
    from (
      select
        id, name,
        (last_active_at is not null and last_active_at > threshold) as is_online,
        last_active_at
      from profiles
      where clinic_id = caller_clinic_id and role = 'doctor'
      order by name
    ) d;

  return result;
end;
$$;

grant execute on function get_doctor_status() to authenticated;
