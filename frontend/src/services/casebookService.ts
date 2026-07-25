import { supabase } from './supabase';
import { Patient } from '../types/patient.types';

/**
 * Reads the consolidated case summary for a patient straight off the
 * `patients` row. The summary is regenerated server-side (Postgres trigger)
 * whenever a prescription is finalized, so this is just a thin read.
 */
export async function getCaseSummary(patientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('patients')
    .select('case_summary')
    .eq('id', patientId)
    .single();

  if (error) throw new Error(error.message || 'Failed to load case summary.');
  return (data?.case_summary as string | null) ?? null;
}

/** Convenience helper for callers that already have a fetched Patient object. */
export function caseSummaryFromPatient(patient: Patient): string | null {
  return patient.caseSummary ?? null;
}

/**
 * Invokes the `generate-casebook-pdf` Edge Function to build a fresh,
 * properly formatted multi-section casebook PDF (patient info, case
 * overview, full visit history) and returns a short-lived signed URL to it.
 */
export async function downloadCasebookPdf(patientId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-casebook-pdf', {
    body: { patientId },
  });

  if (error) throw new Error(error.message || 'Failed to generate casebook PDF.');
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error('Casebook PDF URL was not returned.');
  return url;
}
