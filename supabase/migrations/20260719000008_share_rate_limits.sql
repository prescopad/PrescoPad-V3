-- share_rate_limits: IP-based rate limiting for the public
-- get-shared-prescription Edge Function. Edge Functions are stateless across
-- invocations, so the old in-memory _DOWNLOAD_LIMITS dict has no equivalent —
-- this table replaces it with the same upsert-and-increment pattern as
-- queue_counters. Windows are 1-hour buckets; the function checks a max
-- count per (ip, window_start) pair.
create table share_rate_limits (
  ip text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (ip, window_start)
);

create index share_rate_limits_window_idx on share_rate_limits (window_start);

create or replace function check_and_increment_share_rate_limit(
  p_ip text,
  p_max_per_hour int default 30
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window timestamptz := date_trunc('hour', now());
  new_count int;
begin
  insert into share_rate_limits (ip, window_start, count)
    values (p_ip, current_window, 1)
    on conflict (ip, window_start) do update set count = share_rate_limits.count + 1
    returning count into new_count;

  return new_count <= p_max_per_hour;
end;
$$;
