-- consultation_payments: the plain cash/online charge record collected from
-- the patient. This is the ONLY billing table — the internal PrescoPad
-- wallet system (balance/recharge/deduct/transactions) is dropped entirely
-- per the user's decision to remove the wallet feature end-to-end.
create table consultation_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  clinic_id uuid not null references clinics(id),
  prescription_id text references prescriptions(id),
  amount numeric not null,
  method text not null check (method in ('cash', 'online')),
  notes text,
  created_at timestamptz not null default now()
);

create index consultation_payments_prescription_id_idx on consultation_payments (prescription_id);
create index consultation_payments_clinic_id_idx on consultation_payments (clinic_id);

create or replace function record_consultation_payment(
  p_prescription_id text,
  p_amount numeric,
  p_method text,
  p_notes text default null
)
returns consultation_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  rx prescriptions;
  new_row consultation_payments;
begin
  select * into rx from prescriptions where id = p_prescription_id;
  if rx is null then
    raise exception 'Prescription not found';
  end if;

  insert into consultation_payments (user_id, clinic_id, prescription_id, amount, method, notes)
    values (auth.uid(), rx.clinic_id, p_prescription_id, p_amount, p_method, p_notes)
    returning * into new_row;

  update prescriptions set charge_amount = p_amount where id = p_prescription_id;

  return new_row;
end;
$$;

-- casebook_shares: mirrors prescription_shares, for the new consolidated
-- case-summary PDF export feature.
create table casebook_shares (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id),
  clinic_id uuid not null references clinics(id),
  storage_path text not null,
  share_token text unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index casebook_shares_patient_id_idx on casebook_shares (patient_id);
