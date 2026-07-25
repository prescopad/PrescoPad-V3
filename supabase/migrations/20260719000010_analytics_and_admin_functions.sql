-- get_analytics: per-clinic analytics aggregation, replaces
-- backend_python/app/services/analytics_service.py. Earnings are now sourced
-- entirely from consultation_payments (wallet dropped from schema).
create or replace function get_analytics(p_clinic_id uuid, p_period text default 'today')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  range_start timestamptz;
  range_end timestamptz := now();
  result jsonb;
begin
  if p_period = 'week' then
    range_start := range_end - interval '7 days';
  elsif p_period = 'month' then
    range_start := range_end - interval '30 days';
  else
    range_start := date_trunc('day', range_end);
  end if;

  select jsonb_build_object(
    'prescriptions', jsonb_build_object(
      'total', (select count(*) from prescriptions where clinic_id = p_clinic_id and created_at between range_start and range_end and is_deleted = false),
      'finalized', (select count(*) from prescriptions where clinic_id = p_clinic_id and status = 'finalized' and created_at between range_start and range_end and is_deleted = false),
      'draft', (select count(*) from prescriptions where clinic_id = p_clinic_id and status = 'draft' and created_at between range_start and range_end and is_deleted = false)
    ),
    'earnings', jsonb_build_object(
      'consultationIncome', coalesce((select sum(amount) from consultation_payments where clinic_id = p_clinic_id and created_at between range_start and range_end), 0),
      'netEarnings', coalesce((select sum(amount) from consultation_payments where clinic_id = p_clinic_id and created_at between range_start and range_end), 0),
      'prescriptionRevenue', coalesce((select sum(charge_amount) from prescriptions where clinic_id = p_clinic_id and created_at between range_start and range_end and is_deleted = false), 0)
    ),
    'patients', jsonb_build_object(
      'newPatients', (select count(*) from patients where clinic_id = p_clinic_id and created_at between range_start and range_end and is_deleted = false),
      'totalPatients', (select count(*) from patients where clinic_id = p_clinic_id and is_deleted = false)
    ),
    'consultations', jsonb_build_object(
      'totalConsultations', (select count(*) from queue where clinic_id = p_clinic_id and added_at between range_start and range_end and is_deleted = false),
      'completed', (select count(*) from queue where clinic_id = p_clinic_id and status = 'completed' and added_at between range_start and range_end and is_deleted = false),
      'cancelled', (select count(*) from queue where clinic_id = p_clinic_id and status = 'cancelled' and added_at between range_start and range_end and is_deleted = false),
      'avgWaitMinutes', 0,
      'avgConsultMinutes', 0
    ),
    'popular', jsonb_build_object(
      'topMedicines', (
        select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', cnt) order by cnt desc), '[]'::jsonb)
        from (
          select m.value ->> 'medicine_name' as name, count(*) as cnt
          from prescriptions p, jsonb_array_elements(p.medicines) as m(value)
          where p.clinic_id = p_clinic_id and p.created_at between range_start and range_end and p.is_deleted = false
          group by m.value ->> 'medicine_name'
          order by cnt desc
          limit 5
        ) t
      ),
      'topTests', (
        select coalesce(jsonb_agg(jsonb_build_object('name', name, 'count', cnt) order by cnt desc), '[]'::jsonb)
        from (
          select lt.value ->> 'test_name' as name, count(*) as cnt
          from prescriptions p, jsonb_array_elements(p.lab_tests) as lt(value)
          where p.clinic_id = p_clinic_id and p.created_at between range_start and range_end and p.is_deleted = false
          group by lt.value ->> 'test_name'
          order by cnt desc
          limit 5
        ) t
      )
    )
  ) into result;

  return result;
end;
$$;

grant execute on function get_analytics(uuid, text) to authenticated;

-- Admin platform-wide functions. Restricted to role='admin' callers via an
-- explicit check inside each function (SECURITY DEFINER bypasses RLS, so the
-- role check IS the authorization boundary here).
create or replace function assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin access required';
  end if;
end;
$$;

create or replace function admin_get_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  now_ts timestamptz := now();
  today_start timestamptz := date_trunc('day', now_ts);
  week_start timestamptz := now_ts - interval '7 days';
  month_start timestamptz := now_ts - interval '30 days';
  online_threshold timestamptz := now_ts - interval '15 minutes';
begin
  perform assert_admin();

  select jsonb_build_object(
    'users', jsonb_build_object(
      'doctors', (select count(*) from profiles where role = 'doctor' and is_active = true),
      'assistants', (select count(*) from profiles where role = 'assistant' and is_active = true),
      'admins', (select count(*) from profiles where role = 'admin' and is_active = true),
      'onlineDoctors', (select count(*) from profiles where role = 'doctor' and is_active = true and last_active_at >= online_threshold)
    ),
    'clinics', jsonb_build_object('total', (select count(*) from clinics)),
    'patients', jsonb_build_object('total', (select count(*) from patients where is_deleted = false)),
    'prescriptions', jsonb_build_object(
      'total', (select count(*) from prescriptions where is_deleted = false),
      'finalized', (select count(*) from prescriptions where status = 'finalized' and is_deleted = false),
      'today', (select count(*) from prescriptions where created_at >= today_start and is_deleted = false),
      'week', (select count(*) from prescriptions where created_at >= week_start and is_deleted = false),
      'month', (select count(*) from prescriptions where created_at >= month_start and is_deleted = false)
    ),
    'revenue', jsonb_build_object(
      'totalCredits', coalesce((select sum(amount) from consultation_payments), 0),
      'totalDebits', 0,
      'totalRefunds', 0,
      'platformGross', coalesce((select sum(amount) from consultation_payments), 0)
    ),
    'generatedAt', now_ts
  ) into result;

  return result;
end;
$$;

grant execute on function admin_get_overview() to authenticated;

create or replace function admin_list_users(
  p_role text default null,
  p_search text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  users jsonb;
begin
  perform assert_admin();

  select count(*) into total
    from profiles
    where (p_role is null or role = p_role)
      and (p_search is null or name ilike '%' || p_search || '%' or phone ilike '%' || p_search || '%');

  select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) into users
    from (
      select id, role, phone, name, clinic_id, is_active, created_at, last_active_at
      from profiles
      where (p_role is null or role = p_role)
        and (p_search is null or name ilike '%' || p_search || '%' or phone ilike '%' || p_search || '%')
      order by created_at desc
      limit p_limit offset p_offset
    ) p;

  return jsonb_build_object('total', total, 'users', users);
end;
$$;

grant execute on function admin_list_users(text, text, int, int) to authenticated;

create or replace function admin_list_clinics(
  p_search text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  clinics_json jsonb;
begin
  perform assert_admin();

  select count(*) into total from clinics where (p_search is null or name ilike '%' || p_search || '%');

  select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) into clinics_json
    from (
      select
        cl.*,
        (select count(*) from profiles where clinic_id = cl.id and role = 'doctor' and is_active = true) as "doctorCount",
        (select count(*) from profiles where clinic_id = cl.id and role = 'assistant' and is_active = true) as "assistantCount",
        (select count(*) from prescriptions where clinic_id = cl.id and is_deleted = false) as "prescriptionCount"
      from clinics cl
      where (p_search is null or cl.name ilike '%' || p_search || '%')
      order by cl.created_at desc
      limit p_limit offset p_offset
    ) c;

  return jsonb_build_object('total', total, 'clinics', clinics_json);
end;
$$;

grant execute on function admin_list_clinics(text, int, int) to authenticated;

create or replace function admin_list_patients(
  p_search text default null,
  p_limit int default 100,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  patients_json jsonb;
begin
  perform assert_admin();

  select count(*) into total
    from patients
    where is_deleted = false
      and (p_search is null or name ilike '%' || p_search || '%' or phone ilike '%' || p_search || '%');

  select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) into patients_json
    from (
      select id, name, phone, age, gender, clinic_id, created_at
      from patients
      where is_deleted = false
        and (p_search is null or name ilike '%' || p_search || '%' or phone ilike '%' || p_search || '%')
      order by created_at desc
      limit p_limit offset p_offset
    ) p;

  return jsonb_build_object('total', total, 'patients', patients_json);
end;
$$;

grant execute on function admin_list_patients(text, int, int) to authenticated;

create or replace function admin_list_prescriptions(
  p_clinic_id uuid default null,
  p_limit int default 100,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  rx_json jsonb;
begin
  perform assert_admin();

  select count(*) into total from prescriptions where is_deleted = false and (p_clinic_id is null or clinic_id = p_clinic_id);

  select coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) into rx_json
    from (
      select id, clinic_id, patient_name, diagnosis, status, charge_amount, created_at
      from prescriptions
      where is_deleted = false and (p_clinic_id is null or clinic_id = p_clinic_id)
      order by created_at desc
      limit p_limit offset p_offset
    ) r;

  return jsonb_build_object('total', total, 'prescriptions', rx_json);
end;
$$;

grant execute on function admin_list_prescriptions(uuid, int, int) to authenticated;

create or replace function admin_revenue_breakdown(p_period text default 'month')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  range_start timestamptz;
  now_ts timestamptz := now();
  total_income numeric;
  cash_income numeric;
  online_income numeric;
begin
  perform assert_admin();

  if p_period = 'today' then
    range_start := date_trunc('day', now_ts);
  elsif p_period = 'week' then
    range_start := now_ts - interval '7 days';
  else
    range_start := now_ts - interval '30 days';
  end if;

  select coalesce(sum(amount), 0) into total_income from consultation_payments where created_at between range_start and now_ts;
  select coalesce(sum(amount), 0) into cash_income from consultation_payments where method = 'cash' and created_at between range_start and now_ts;
  select coalesce(sum(amount), 0) into online_income from consultation_payments where method = 'online' and created_at between range_start and now_ts;

  return jsonb_build_object(
    'period', p_period,
    'byType', jsonb_build_object(
      'cash', jsonb_build_object('total', cash_income, 'count', (select count(*) from consultation_payments where method = 'cash' and created_at between range_start and now_ts)),
      'online', jsonb_build_object('total', online_income, 'count', (select count(*) from consultation_payments where method = 'online' and created_at between range_start and now_ts))
    ),
    'platformRevenue', total_income,
    'generatedAt', now_ts
  );
end;
$$;

grant execute on function admin_revenue_breakdown(text) to authenticated;

create or replace function admin_set_user_active(p_user_id uuid, p_is_active boolean)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row profiles;
begin
  perform assert_admin();
  update profiles set is_active = p_is_active where id = p_user_id returning * into updated_row;
  if updated_row is null then
    raise exception 'User not found';
  end if;
  return updated_row;
end;
$$;

grant execute on function admin_set_user_active(uuid, boolean) to authenticated;

create or replace function admin_promote_to_admin(p_user_id uuid)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row profiles;
begin
  perform assert_admin();
  update profiles set role = 'admin' where id = p_user_id returning * into updated_row;
  if updated_row is null then
    raise exception 'User not found';
  end if;
  return updated_row;
end;
$$;

grant execute on function admin_promote_to_admin(uuid) to authenticated;

create or replace function admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform assert_admin();
  if exists (select 1 from profiles where id = p_user_id and role = 'admin') then
    raise exception 'Cannot delete admin users';
  end if;
  delete from profiles where id = p_user_id;
end;
$$;

grant execute on function admin_delete_user(uuid) to authenticated;

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
  insert into clinics (name, address, phone, solo_mode) values (trim(p_name), p_address, p_phone, true) returning * into new_row;
  return new_row;
end;
$$;

grant execute on function admin_create_clinic(text, text, text, text) to authenticated;

create or replace function admin_update_clinic(
  p_clinic_id uuid,
  p_name text default null,
  p_address text default null,
  p_phone text default null
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
        phone = coalesce(p_phone, phone)
    where id = p_clinic_id
    returning * into updated_row;
  if updated_row is null then
    raise exception 'Clinic not found';
  end if;
  return updated_row;
end;
$$;

grant execute on function admin_update_clinic(uuid, text, text, text) to authenticated;

create or replace function admin_delete_clinic(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform assert_admin();
  delete from clinics where id = p_clinic_id;
end;
$$;

grant execute on function admin_delete_clinic(uuid) to authenticated;
