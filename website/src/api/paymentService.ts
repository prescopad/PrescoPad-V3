import { supabase } from './supabase';

export type PaymentMethod = 'cash' | 'online';

export interface ConsultationPayment {
  id: string;
  prescriptionId: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
}

/** Records a plain cash/online charge for a finalized prescription — no
 * wallet/balance involved. Also writes prescriptions.charge_amount via the
 * record_consultation_payment Postgres function, which is what makes the
 * amount visible to assistants (RLS already grants them SELECT on the
 * prescriptions row). */
export async function recordConsultationPayment(
  prescriptionId: string,
  amount: number,
  method: PaymentMethod,
  notes?: string
): Promise<ConsultationPayment> {
  const { data, error } = await supabase.rpc('record_consultation_payment', {
    p_prescription_id: prescriptionId,
    p_amount: amount,
    p_method: method,
    p_notes: notes ?? null,
  });

  if (error || !data) {
    throw new Error(error?.message || 'Failed to record payment.');
  }

  return {
    id: data.id,
    prescriptionId: data.prescription_id,
    amount: data.amount,
    method: data.method,
    createdAt: data.created_at,
  };
}

/** Fetches the recorded charge amount + method for a single prescription —
 * used by the assistant-facing "charge visibility" UI. */
export async function getPaymentForPrescription(prescriptionId: string): Promise<ConsultationPayment | null> {
  const { data, error } = await supabase
    .from('consultation_payments')
    .select('*')
    .eq('prescription_id', prescriptionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    prescriptionId: data.prescription_id,
    amount: data.amount,
    method: data.method,
    createdAt: data.created_at,
  };
}
