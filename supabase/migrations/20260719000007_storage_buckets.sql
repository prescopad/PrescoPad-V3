-- Storage buckets for persisted PDFs. Both private — access is via signed
-- URLs minted either by clinic-member RLS-gated reads or by the
-- get-shared-prescription Edge Function (service-role key, for the public
-- unauthenticated share flow).
insert into storage.buckets (id, name, public)
  values ('prescription-pdfs', 'prescription-pdfs', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('casebook-pdfs', 'casebook-pdfs', false)
  on conflict (id) do nothing;

-- Path convention: {clinic_id}/{prescription_id}.pdf and
-- {clinic_id}/{patient_id}/{timestamp}.pdf — the first path segment is the
-- clinic_id, checked against current_clinic_ids() via storage.foldername.
create policy prescription_pdfs_select_clinic_members on storage.objects
  for select using (
    bucket_id = 'prescription-pdfs'
    and (storage.foldername(name))[1]::uuid in (select current_clinic_ids())
  );

create policy casebook_pdfs_select_clinic_members on storage.objects
  for select using (
    bucket_id = 'casebook-pdfs'
    and (storage.foldername(name))[1]::uuid in (select current_clinic_ids())
  );

-- Edge Functions write via the service-role key, which bypasses RLS
-- entirely — no client INSERT/UPDATE/DELETE policy is defined on either
-- bucket, so the client can only ever read a PDF it's authorized for, never
-- write/overwrite one directly.
