-- Audit finding: prescriptions_insert_doctor's WITH CHECK verified
-- doctor_id = auth.uid() and clinic membership, but never actually checked
-- the caller's role — so an assistant could insert a prescription row with
-- doctor_id set to their OWN id (nonsensical data, "a prescription by an
-- assistant"), since doctor_id = auth.uid() trivially holds for their own
-- uid. Confirmed live during the production-readiness audit: an assistant
-- test user successfully inserted a prescriptions row. Add the missing
-- role check so only an actual doctor-role profile can insert.
drop policy if exists prescriptions_insert_doctor on prescriptions;

create policy prescriptions_insert_doctor on prescriptions
  for insert with check (
    doctor_id = auth.uid()
    and clinic_id in (select current_clinic_ids())
    and exists (
      select 1 from profiles where id = auth.uid() and role = 'doctor'
    )
  );
