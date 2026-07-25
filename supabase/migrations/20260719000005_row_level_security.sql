-- current_clinic_ids(): the set of clinic_ids the calling auth.uid() belongs
-- to, via clinic_members (falling back to profiles.clinic_id for
-- single-clinic users who may not yet have a clinic_members row, e.g.
-- immediately after signup before the trigger inserts one — defensive only).
create or replace function current_clinic_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select clinic_id from clinic_members where profile_id = auth.uid()
  union
  select clinic_id from profiles where id = auth.uid() and clinic_id is not null;
$$;

-- profiles
alter table profiles enable row level security;

create policy profiles_select_own_or_clinic on profiles
  for select using (
    id = auth.uid()
    or clinic_id in (select current_clinic_ids())
  );

create policy profiles_update_own on profiles
  for update using (id = auth.uid());

-- clinics
alter table clinics enable row level security;

create policy clinics_select_members on clinics
  for select using (id in (select current_clinic_ids()));

create policy clinics_update_owner_or_doctor on clinics
  for update using (
    owner_id = auth.uid()
    or id in (
      select clinic_id from clinic_members
      where profile_id = auth.uid() and member_role in ('owner', 'doctor')
    )
  );

-- clinic_members
alter table clinic_members enable row level security;

create policy clinic_members_select_own_clinic on clinic_members
  for select using (clinic_id in (select current_clinic_ids()));

-- connection_requests
alter table connection_requests enable row level security;

create policy connection_requests_select on connection_requests
  for select using (requester_id = auth.uid() or doctor_id = auth.uid());

create policy connection_requests_insert on connection_requests
  for insert with check (requester_id = auth.uid() or doctor_id = auth.uid());

create policy connection_requests_update on connection_requests
  for update using (requester_id = auth.uid() or doctor_id = auth.uid());

-- patients / queue / prescription_drafts / prescription_templates /
-- custom_medicines / custom_lab_tests: full CRUD for any clinic member
-- (doctor or assistant) — matches today's undifferentiated access, and
-- implements "full clinic-wide sharing" for multi-doctor clinics.
alter table patients enable row level security;
create policy patients_all_clinic_members on patients
  for all using (clinic_id in (select current_clinic_ids()))
  with check (clinic_id in (select current_clinic_ids()));

alter table queue enable row level security;
create policy queue_all_clinic_members on queue
  for all using (clinic_id in (select current_clinic_ids()))
  with check (clinic_id in (select current_clinic_ids()));

alter table prescription_drafts enable row level security;
create policy prescription_drafts_all_clinic_members on prescription_drafts
  for all using (clinic_id in (select current_clinic_ids()))
  with check (clinic_id in (select current_clinic_ids()));

alter table prescription_templates enable row level security;
create policy prescription_templates_all_clinic_members on prescription_templates
  for all using (clinic_id in (select current_clinic_ids()))
  with check (clinic_id in (select current_clinic_ids()));

alter table custom_medicines enable row level security;
create policy custom_medicines_all_clinic_members on custom_medicines
  for all using (clinic_id in (select current_clinic_ids()))
  with check (clinic_id in (select current_clinic_ids()));

alter table custom_lab_tests enable row level security;
create policy custom_lab_tests_all_clinic_members on custom_lab_tests
  for all using (clinic_id in (select current_clinic_ids()))
  with check (clinic_id in (select current_clinic_ids()));

-- prescriptions: SELECT for any clinic member — this is what makes
-- charge_amount visible to assistants, no extra column-level grant needed.
alter table prescriptions enable row level security;

create policy prescriptions_select_clinic_members on prescriptions
  for select using (clinic_id in (select current_clinic_ids()));

create policy prescriptions_insert_doctor on prescriptions
  for insert with check (
    doctor_id = auth.uid()
    and clinic_id in (select current_clinic_ids())
  );

create policy prescriptions_update_doctor_draft_only on prescriptions
  for update using (
    doctor_id = auth.uid()
    and status = 'draft'
  );
-- No delete policy: soft-delete only, via is_deleted, through the above
-- update policy (doctor, draft rows only) or a service-role admin path.

-- prescription_shares: clinic-member SELECT/INSERT for the owning clinic.
-- The public get-shared-prescription Edge Function bypasses RLS via the
-- service-role key (an anonymous patient has no auth.uid()).
alter table prescription_shares enable row level security;

create policy prescription_shares_select_clinic_members on prescription_shares
  for select using (clinic_id in (select current_clinic_ids()));

create policy prescription_shares_insert_clinic_members on prescription_shares
  for insert with check (clinic_id in (select current_clinic_ids()));

-- casebook_shares: same pattern as prescription_shares.
alter table casebook_shares enable row level security;

create policy casebook_shares_select_clinic_members on casebook_shares
  for select using (clinic_id in (select current_clinic_ids()));

create policy casebook_shares_insert_clinic_members on casebook_shares
  for insert with check (clinic_id in (select current_clinic_ids()));

-- consultation_payments: SELECT for any clinic member (assistants included —
-- this is the direct mechanism for "assistant sees charge amount"); INSERT
-- restricted to doctor role.
alter table consultation_payments enable row level security;

create policy consultation_payments_select_clinic_members on consultation_payments
  for select using (clinic_id in (select current_clinic_ids()));

create policy consultation_payments_insert_doctor on consultation_payments
  for insert with check (
    clinic_id in (select current_clinic_ids())
    and exists (
      select 1 from profiles where id = auth.uid() and role = 'doctor'
    )
  );

-- medicines_catalog / lab_tests_catalog: read-only reference data, no client
-- writes (seeded via service-role script).
alter table medicines_catalog enable row level security;
create policy medicines_catalog_select_all on medicines_catalog
  for select using (auth.uid() is not null);

alter table lab_tests_catalog enable row level security;
create policy lab_tests_catalog_select_all on lab_tests_catalog
  for select using (auth.uid() is not null);
