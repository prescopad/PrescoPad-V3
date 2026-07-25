-- Helper RPCs so the Mongo->Postgres migration script (supabase/scripts/
-- migrate_mongo_to_postgres.mjs) can disable/re-enable handle_new_user via
-- the service-role client instead of requiring a manual SQL Editor step.
-- Service-role only in practice (no grant to `authenticated`) since these
-- alter trigger state platform-wide.
create or replace function migration_disable_new_user_trigger()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table auth.users disable trigger on_auth_user_created;
end;
$$;

create or replace function migration_enable_new_user_trigger()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table auth.users enable trigger on_auth_user_created;
end;
$$;
