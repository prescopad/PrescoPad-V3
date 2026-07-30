-- Add is_mlc, attach_certificate, and attach_receipt columns to prescriptions table
alter table prescriptions
  add column if not exists is_mlc boolean default false,
  add column if not exists attach_certificate jsonb default null,
  add column if not exists attach_receipt jsonb default null;
