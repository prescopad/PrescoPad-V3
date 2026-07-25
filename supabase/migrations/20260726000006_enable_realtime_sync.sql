-- Enable Realtime broadcasting for clinical and operational sync tables
-- Allows sub-second state synchronization between Website and Mobile App.

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table queue;
alter publication supabase_realtime add table patients;
alter publication supabase_realtime add table prescriptions;
alter publication supabase_realtime add table presence;
alter publication supabase_realtime add table wallets;
alter publication supabase_realtime add table connection_requests;
