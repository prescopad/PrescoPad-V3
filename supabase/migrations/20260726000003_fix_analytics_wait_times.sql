-- Audit finding: get_analytics() hardcoded avgWaitMinutes/avgConsultMinutes
-- to 0 despite queue.added_at/started_at/completed_at existing to compute
-- real averages. Wait time = started_at - added_at (time in queue before
-- consult began); consult time = completed_at - started_at (time actually
-- spent in consult). Only rows where both timestamps are present are
-- averaged — a queue item still waiting/in-progress has no completed_at yet
-- and must not be counted as a zero-minute consult.
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
  avg_wait_minutes numeric;
  avg_consult_minutes numeric;
begin
  if p_period = 'week' then
    range_start := range_end - interval '7 days';
  elsif p_period = 'month' then
    range_start := range_end - interval '30 days';
  else
    range_start := date_trunc('day', range_end);
  end if;

  select avg(extract(epoch from (started_at - added_at)) / 60)
    into avg_wait_minutes
    from queue
    where clinic_id = p_clinic_id
      and added_at between range_start and range_end
      and is_deleted = false
      and started_at is not null;

  select avg(extract(epoch from (completed_at - started_at)) / 60)
    into avg_consult_minutes
    from queue
    where clinic_id = p_clinic_id
      and added_at between range_start and range_end
      and is_deleted = false
      and started_at is not null
      and completed_at is not null;

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
      'avgWaitMinutes', round(coalesce(avg_wait_minutes, 0), 1),
      'avgConsultMinutes', round(coalesce(avg_consult_minutes, 0), 1)
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
