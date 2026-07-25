-- Fix admin_get_overview()'s `revenue` block: it still carried over the old
-- wallet-shaped totalCredits/totalDebits/totalRefunds fields (debits/refunds
-- hardcoded to 0, dead weight since wallet was dropped from the schema).
-- Replace with a cash/online breakdown matching admin_revenue_breakdown()'s
-- actual consultation_payments-based model.
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
      'totalCash', coalesce((select sum(amount) from consultation_payments where method = 'cash'), 0),
      'totalOnline', coalesce((select sum(amount) from consultation_payments where method = 'online'), 0),
      'platformGross', coalesce((select sum(amount) from consultation_payments), 0)
    ),
    'generatedAt', now_ts
  ) into result;

  return result;
end;
$$;
