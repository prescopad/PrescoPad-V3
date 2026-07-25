-- Audit finding: get_or_create_share_token() calls gen_random_bytes(), which
-- lives in the `extensions` schema (where Supabase installs pgcrypto), but
-- the function's `set search_path = public` excludes that schema — so every
-- call to this function fails with "function gen_random_bytes(integer) does
-- not exist". This is the RPC behind the doctor-to-patient prescription
-- share-link feature (used by generate-prescription-pdf/get-shared-prescription
-- and both apps' "share via WhatsApp" flows) — confirmed broken via a live
-- test call during the production-readiness audit. Fix: include `extensions`
-- in the function's search_path.
create or replace function get_or_create_share_token(p_prescription_id text)
returns prescription_shares
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  existing prescription_shares;
  rx prescriptions;
  new_row prescription_shares;
begin
  select * into existing
    from prescription_shares
    where prescription_id = p_prescription_id and expires_at > now()
    order by created_at desc
    limit 1;

  if existing is not null then
    return existing;
  end if;

  select * into rx from prescriptions where id = p_prescription_id;
  if rx is null then
    raise exception 'Prescription not found';
  end if;

  insert into prescription_shares (prescription_id, clinic_id, share_token, expires_at)
    values (
      p_prescription_id,
      rx.clinic_id,
      encode(gen_random_bytes(24), 'hex'),
      now() + interval '7 days'
    )
    returning * into new_row;

  return new_row;
end;
$$;
