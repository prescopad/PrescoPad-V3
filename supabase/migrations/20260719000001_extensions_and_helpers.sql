-- Extensions
create extension if not exists pgcrypto;

-- updated_at trigger helper, reused by every table below
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
