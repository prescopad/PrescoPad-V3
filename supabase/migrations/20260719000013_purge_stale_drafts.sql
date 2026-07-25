-- purge_stale_drafts: deletes draft prescriptions older than 24h that were
-- never finalized (mirrors backend_python/app/main.py
-- _purge_stale_drafts_loop). Called by the purge-stale-drafts Edge Function,
-- itself invoked by an external scheduler (GitHub Actions cron/cron-job.org)
-- since pg_cron requires a paid add-on.
create or replace function purge_stale_drafts()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  delete from prescriptions
    where status = 'draft'
      and created_at < now() - interval '24 hours';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
