import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { Patient, PatientFormData } from '../types/patient.types';
import type {
  Prescription,
  PrescriptionDraft,
  PrescriptionMedicine,
  PrescriptionLabTest,
  PrescriptionStatus,
  PrescriptionTemplate,
} from '../types/prescription.types';
import type { QueueItem, QueueStatus } from '../types/queue.types';
import type { Medicine, LabTest } from '../types/medicine.types';
import { SAMPLE_MEDICINES, SAMPLE_LAB_TESTS } from '../constants/sampleCatalog';

function currentClinicId(): string {
  const clinicId = useAuthStore.getState().user?.clinicId;
  if (!clinicId) throw new Error('No clinic associated with the current user.');
  return clinicId;
}

function throwOnError(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING HELPERS (snake_case Postgres rows → camelCase frontend) — mirrors
// frontend/src/services/dataService.ts exactly, same wire format.
// ═══════════════════════════════════════════════════════════════════════════════

function mapPatient(row: Record<string, unknown>): Patient {
  return {
    id: row.id as string,
    name: row.name as string,
    age: row.age as number,
    gender: row.gender as Patient['gender'],
    weight: (row.weight as number) ?? null,
    phone: (row.phone as string) ?? '',
    address: (row.address as string) ?? '',
    bloodGroup: (row.blood_group as string) ?? '',
    allergies: (row.allergies as string) ?? '',
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? '',
    caseSummary: (row.case_summary as string) ?? null,
    caseSummaryUpdatedAt: (row.case_summary_updated_at as string) ?? null,
  };
}

function mapQueueItem(row: Record<string, unknown>): QueueItem {
  const patient = row.patients as Record<string, unknown> | undefined;
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    status: row.status as QueueStatus,
    addedBy: row.added_by as string,
    notes: (row.notes as string) ?? '',
    tokenNumber: row.token_number as number,
    consultationType: row.consultation_type as 'new' | 'follow_up' | undefined,
    addedAt: row.added_at as string,
    startedAt: (row.started_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    patient: patient ? {
      id: patient.id as string,
      name: patient.name as string,
      age: patient.age as number,
      gender: patient.gender as Patient['gender'],
      weight: (patient.weight as number) ?? null,
      phone: (patient.phone as string) ?? '',
      address: (patient.address as string) ?? '',
      bloodGroup: (patient.blood_group as string) ?? '',
      allergies: (patient.allergies as string) ?? '',
      createdAt: '',
      updatedAt: '',
    } : undefined,
  };
}

function mapPrescription(row: Record<string, unknown>): Prescription {
  const medicines = ((row.medicines as Record<string, unknown>[]) ?? []).map(mapPrescriptionMedicine);
  const labTests = ((row.lab_tests as Record<string, unknown>[]) ?? []).map(mapPrescriptionLabTest);
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    patientName: row.patient_name as string,
    patientAge: row.patient_age as number,
    patientGender: row.patient_gender as string,
    patientPhone: (row.patient_phone as string) ?? '',
    consultationType: row.consultation_type as 'new' | 'follow_up' | undefined,
    doctorId: row.doctor_id as string,
    diagnosis: row.diagnosis as string,
    advice: (row.advice as string) ?? '',
    followUpDate: (row.follow_up_date as string) ?? null,
    symptoms: (row.symptoms as string[]) ?? [],
    referredTo: (row.referred_to as string) ?? '',
    pdfPath: null,
    pdfHash: (row.pdf_hash as string) ?? null,
    signature: (row.signature as string) ?? null,
    status: row.status as PrescriptionStatus,
    chargeAmount: (row.charge_amount as number) ?? null,
    medicines,
    labTests,
    createdAt: row.created_at as string,
  };
}

function mapPrescriptionTemplate(row: Record<string, unknown>): PrescriptionTemplate {
  const data = (row.data as Record<string, unknown>) ?? {};
  const medicines = ((data.medicines as Record<string, unknown>[]) ?? []).map(mapPrescriptionMedicine);
  const labTests = ((data.lab_tests as Record<string, unknown>[]) ?? []).map(mapPrescriptionLabTest);
  return {
    id: row.id as string,
    name: row.name as string,
    diagnosis: (data.diagnosis as string) ?? '',
    advice: (data.advice as string) ?? '',
    symptoms: (data.symptoms as string[]) ?? [],
    referredTo: (data.referred_to as string) ?? '',
    medicines,
    labTests,
    createdAt: row.created_at as string,
  };
}

function mapPrescriptionMedicine(row: Record<string, unknown>): PrescriptionMedicine {
  return {
    id: (row.id as string) ?? '',
    prescriptionId: (row.prescription_id as string) ?? '',
    medicineName: (row.medicine_name as string) ?? '',
    type: (row.type as string) ?? '',
    dosage: (row.dosage as string) ?? '',
    frequency: (row.frequency as string) ?? '',
    duration: (row.duration as string) ?? '',
    timing: (row.timing as string) ?? '',
    notes: (row.notes as string) ?? '',
  };
}

function mapPrescriptionLabTest(row: Record<string, unknown>): PrescriptionLabTest {
  return {
    id: (row.id as string) ?? '',
    prescriptionId: (row.prescription_id as string) ?? '',
    testName: (row.test_name as string) ?? '',
    category: (row.category as string) ?? '',
    notes: (row.notes as string) ?? '',
  };
}

function mapCatalogMedicine(row: Record<string, unknown>): Medicine {
  return {
    id: row.id as string,
    name: row.name as string,
    type: (row.type ?? 'Tablet') as Medicine['type'],
    strength: (row.strength as string) ?? '',
    manufacturer: (row.manufacturer as string) ?? '',
    isCustom: false,
    usageCount: 0,
  };
}

function mapCustomMedicine(row: Record<string, unknown>): Medicine {
  return { ...mapCatalogMedicine(row), isCustom: true, usageCount: (row.usage_count as number) ?? 0 };
}

function mapCatalogLabTest(row: Record<string, unknown>): LabTest {
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) ?? '',
    isCustom: false,
    usageCount: 0,
  };
}

function mapCustomLabTest(row: Record<string, unknown>): LabTest {
  return { ...mapCatalogLabTest(row), isCustom: true, usageCount: (row.usage_count as number) ?? 0 };
}

function medicinesToJsonb(medicines: { medicineName: string; type: string; dosage: string; frequency: string; duration: string; timing: string; notes: string }[]) {
  return medicines.map((m) => ({
    medicine_name: m.medicineName,
    type: m.type,
    dosage: m.dosage,
    frequency: m.frequency,
    duration: m.duration,
    timing: m.timing,
    notes: m.notes,
  }));
}

function labTestsToJsonb(labTests: { testName: string; category: string; notes: string }[]) {
  return labTests.map((t) => ({
    test_name: t.testName,
    category: t.category,
    notes: t.notes,
  }));
}

function mergeByName<T extends { name: string }>(primary: T[], secondary: T[]): T[] {
  const seen = new Set(primary.map((m) => m.name.toLowerCase()));
  const merged = [...primary];
  for (const item of secondary) {
    if (!seen.has(item.name.toLowerCase())) {
      seen.add(item.name.toLowerCase());
      merged.push(item);
    }
  }
  return merged;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPatients(search?: string, limit = 100, offset = 0): Promise<Patient[]> {
  let query = supabase
    .from('patients')
    .select('*')
    .eq('clinic_id', currentClinicId())
    .eq('is_deleted', false)
    .order('name')
    .range(offset, offset + limit - 1);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  throwOnError(error, 'Failed to load patients.');
  return (data ?? []).map(mapPatient);
}

export async function getPatientsPage(search?: string, limit = 50, offset = 0): Promise<{ patients: Patient[]; total: number }> {
  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('clinic_id', currentClinicId())
    .eq('is_deleted', false)
    .order('name')
    .range(offset, offset + limit - 1);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error, count } = await query;
  throwOnError(error, 'Failed to load patients.');
  return { patients: (data ?? []).map(mapPatient), total: count ?? 0 };
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const { data, error } = await supabase.from('patients').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapPatient(data);
}

export async function createPatient(data: PatientFormData): Promise<Patient> {
  const { data: row, error } = await supabase
    .from('patients')
    .insert({
      clinic_id: currentClinicId(),
      name: data.name,
      age: parseInt(data.age) || 0,
      gender: data.gender,
      weight: data.weight ? parseFloat(data.weight) : null,
      phone: data.phone,
      address: data.address,
      blood_group: data.bloodGroup,
      allergies: data.allergies,
    })
    .select()
    .single();
  throwOnError(error, 'Failed to create patient.');
  return mapPatient(row);
}

export async function updatePatient(id: string, data: Partial<PatientFormData>): Promise<Patient | null> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.age !== undefined) payload.age = parseInt(data.age) || 0;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.weight !== undefined) payload.weight = data.weight ? parseFloat(data.weight) : null;
  if (data.phone !== undefined) payload.phone = data.phone;
  if (data.address !== undefined) payload.address = data.address;
  if (data.bloodGroup !== undefined) payload.blood_group = data.bloodGroup;
  if (data.allergies !== undefined) payload.allergies = data.allergies;

  const { data: row, error } = await supabase.from('patients').update(payload).eq('id', id).select().single();
  throwOnError(error, 'Failed to update patient.');
  return mapPatient(row);
}

export async function getRecentPatients(limit = 10): Promise<Patient[]> {
  return getPatients(undefined, limit, 0);
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from('patients').update({ is_deleted: true }).eq('id', id);
  throwOnError(error, 'Failed to delete patient.');
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchQueue(filters: { status?: string; date?: string; todayOnly?: boolean }): Promise<QueueItem[]> {
  let query = supabase
    .from('queue')
    .select('*, patients(*)')
    .eq('clinic_id', currentClinicId())
    .eq('is_deleted', false)
    .order('added_at', { ascending: true });

  if (filters.status) query = query.eq('status', filters.status);

  const targetDate = filters.date ?? (filters.todayOnly !== false ? new Date().toISOString().slice(0, 10) : undefined);
  if (targetDate) {
    query = query.gte('added_at', `${targetDate}T00:00:00`).lt('added_at', `${targetDate}T23:59:59.999`);
  }

  const { data, error } = await query;
  throwOnError(error, 'Failed to load queue.');
  return (data ?? []).map(mapQueueItem);
}

export async function getTodayQueue(): Promise<QueueItem[]> {
  return fetchQueue({ todayOnly: true });
}

function computeStats(items: QueueItem[]) {
  return {
    total: items.length,
    waiting: items.filter((i) => i.status === 'waiting').length,
    inProgress: items.filter((i) => i.status === 'in_progress').length,
    completed: items.filter((i) => i.status === 'completed').length,
  };
}

export async function getTodayStats(): Promise<{ total: number; waiting: number; inProgress: number; completed: number }> {
  return computeStats(await getTodayQueue());
}

export async function addToQueue(patientId: string, _addedBy: string, notes?: string, consultationType?: string): Promise<QueueItem> {
  const { data, error } = await supabase.rpc('add_to_queue', {
    p_clinic_id: currentClinicId(),
    p_patient_id: patientId,
    p_notes: notes ?? '',
    p_consultation_type: consultationType ?? 'new',
  });
  throwOnError(error, 'Failed to add to queue.');
  return mapQueueItem(data);
}

export async function updateQueueStatus(id: string, status: QueueStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'in_progress') patch.started_at = new Date().toISOString();
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  const { error } = await supabase.from('queue').update(patch).eq('id', id);
  throwOnError(error, 'Failed to update queue status.');
}

export async function removeFromQueue(id: string): Promise<void> {
  const { error } = await supabase.rpc('remove_from_queue', { p_queue_id: id });
  throwOnError(error, 'Failed to remove from queue.');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createPrescription(draft: PrescriptionDraft, doctorId: string): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .insert({
      clinic_id: currentClinicId(),
      doctor_id: doctorId,
      patient_id: draft.patientId,
      patient_name: draft.patientName,
      patient_age: parseInt(draft.patientAge) || 0,
      patient_gender: draft.patientGender,
      patient_phone: draft.patientPhone,
      consultation_type: draft.consultationType,
      diagnosis: draft.diagnosis,
      advice: draft.advice,
      follow_up_date: draft.followUpDate || null,
      symptoms: draft.symptoms,
      referred_to: draft.referredTo || null,
      medicines: medicinesToJsonb(draft.medicines as PrescriptionMedicine[]),
      lab_tests: labTestsToJsonb(draft.labTests as PrescriptionLabTest[]),
    })
    .select()
    .single();
  throwOnError(error, 'Failed to create prescription.');
  return mapPrescription(data);
}

export async function getPrescriptionById(id: string): Promise<Prescription | null> {
  const { data, error } = await supabase.from('prescriptions').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapPrescription(data);
}

export async function getRecentPrescriptions(limit = 20): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('clinic_id', currentClinicId())
    .order('created_at', { ascending: false })
    .limit(limit);
  throwOnError(error, 'Failed to load prescriptions.');
  return (data ?? []).map(mapPrescription);
}

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  throwOnError(error, 'Failed to load patient prescriptions.');
  return (data ?? []).map(mapPrescription);
}

export async function finalizePrescription(id: string, signature: string, pdfHash: string, chargeAmount?: number): Promise<void> {
  const { error } = await supabase.rpc('finalize_prescription', {
    p_prescription_id: id,
    p_signature: signature,
    p_pdf_hash: pdfHash,
    p_charge_amount: chargeAmount ?? null,
  });
  throwOnError(error, 'Failed to finalize prescription.');
}

export async function getTodayPrescriptionCount(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from('prescriptions')
    .select('*', { count: 'exact', head: true })
    .eq('clinic_id', currentClinicId())
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59.999`);
  throwOnError(error, 'Failed to load today’s prescription count.');
  return count ?? 0;
}

/** Invokes the generate-prescription-pdf Edge Function and returns a
 * short-lived signed URL — replaces the old direct backend PDF route. */
export async function getPrescriptionPdfUrl(id: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-prescription-pdf', {
    body: { prescriptionId: id },
  });
  if (error || !data?.url) throw new Error(error?.message || 'Failed to generate PDF.');
  return data.url as string;
}

export async function downloadPrescriptionPdf(id: string): Promise<Blob> {
  const url = await getPrescriptionPdfUrl(id);
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to download PDF.');
  return response.blob();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICINES (shared catalog table + clinic custom medicines)
// ═══════════════════════════════════════════════════════════════════════════════

export async function searchAllMedicines(query: string): Promise<Medicine[]> {
  const local = SAMPLE_MEDICINES.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));
  const [catalogRes, customRes] = await Promise.allSettled([
    supabase.from('medicines_catalog').select('*').ilike('name', `%${query}%`),
    supabase.from('custom_medicines').select('*').eq('clinic_id', currentClinicId()).ilike('name', `%${query}%`),
  ]);
  const catalog = catalogRes.status === 'fulfilled' ? (catalogRes.value.data ?? []).map(mapCatalogMedicine) : [];
  const custom = customRes.status === 'fulfilled' ? (customRes.value.data ?? []).map(mapCustomMedicine) : [];
  return mergeByName(mergeByName(local, catalog), custom).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllFrequentMedicines(limit = 20): Promise<Medicine[]> {
  const [catalogRes, customRes] = await Promise.allSettled([
    supabase.from('medicines_catalog').select('*'),
    supabase.from('custom_medicines').select('*').eq('clinic_id', currentClinicId()).order('usage_count', { ascending: false }).limit(limit),
  ]);
  const catalog = catalogRes.status === 'fulfilled' ? (catalogRes.value.data ?? []).map(mapCatalogMedicine) : [];
  const custom = customRes.status === 'fulfilled' ? (customRes.value.data ?? []).map(mapCustomMedicine) : [];
  const merged = mergeByName(mergeByName(custom, catalog), SAMPLE_MEDICINES);
  return merged.sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
}

export async function getMedicinesByCategory(types: string[], query = ''): Promise<Medicine[]> {
  const local = SAMPLE_MEDICINES.filter((m) => types.includes(m.type) && (!query || m.name.toLowerCase().includes(query.toLowerCase())));

  let catalogQuery = supabase.from('medicines_catalog').select('*').in('type', types);
  if (query.trim()) catalogQuery = catalogQuery.ilike('name', `%${query.trim()}%`);
  const { data: catalogRows } = await catalogQuery;
  const catalog = (catalogRows ?? []).map(mapCatalogMedicine);

  let custom: Medicine[] = [];
  try {
    let customQuery = supabase.from('custom_medicines').select('*').eq('clinic_id', currentClinicId());
    if (query.trim()) customQuery = customQuery.ilike('name', `%${query.trim()}%`);
    const { data } = await customQuery;
    custom = (data ?? []).map(mapCustomMedicine).filter((m) => types.includes(m.type));
  } catch { /* cloud unavailable */ }

  return mergeByName(mergeByName(local, catalog), custom).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMedicinesOutsideCategories(excludeTypes: string[], query = ''): Promise<Medicine[]> {
  const local = SAMPLE_MEDICINES.filter((m) => !excludeTypes.includes(m.type) && (!query || m.name.toLowerCase().includes(query.toLowerCase())));

  let catalogQuery = supabase.from('medicines_catalog').select('*');
  if (query.trim()) catalogQuery = catalogQuery.ilike('name', `%${query.trim()}%`);
  const { data: catalogRows } = await catalogQuery;
  const catalog = (catalogRows ?? []).map(mapCatalogMedicine).filter((m) => !excludeTypes.includes(m.type));

  let custom: Medicine[] = [];
  try {
    let customQuery = supabase.from('custom_medicines').select('*').eq('clinic_id', currentClinicId());
    if (query.trim()) customQuery = customQuery.ilike('name', `%${query.trim()}%`);
    const { data } = await customQuery;
    custom = (data ?? []).map(mapCustomMedicine).filter((m) => !excludeTypes.includes(m.type));
  } catch { /* cloud unavailable */ }

  return mergeByName(mergeByName(local, catalog), custom).sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCustomMedicine(name: string, type: string, strength: string): Promise<Medicine> {
  const { data, error } = await supabase
    .from('custom_medicines')
    .insert({ clinic_id: currentClinicId(), name, type, strength })
    .select()
    .single();
  throwOnError(error, 'Failed to add custom medicine.');
  return mapCustomMedicine(data);
}

export async function getAllCustomMedicines(limit = 1000): Promise<Medicine[]> {
  const { data, error } = await supabase
    .from('custom_medicines')
    .select('*')
    .eq('clinic_id', currentClinicId())
    .order('usage_count', { ascending: false })
    .limit(limit);
  throwOnError(error, 'Failed to load custom medicines.');
  return (data ?? []).map(mapCustomMedicine);
}

export async function deleteCustomMedicine(id: string): Promise<void> {
  const { error } = await supabase.from('custom_medicines').delete().eq('id', id);
  throwOnError(error, 'Failed to delete custom medicine.');
}

export async function incrementMedicineUsage(name: string, isCustom: boolean): Promise<void> {
  if (!isCustom) return;
  try {
    const { data } = await supabase
      .from('custom_medicines')
      .select('usage_count')
      .eq('clinic_id', currentClinicId())
      .eq('name', name)
      .single();
    await supabase
      .from('custom_medicines')
      .update({ usage_count: ((data?.usage_count as number) ?? 0) + 1 })
      .eq('clinic_id', currentClinicId())
      .eq('name', name);
  } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAB TESTS (shared catalog table + clinic custom lab tests)
// ═══════════════════════════════════════════════════════════════════════════════

export async function searchAllLabTests(query: string): Promise<LabTest[]> {
  const local = SAMPLE_LAB_TESTS.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  const [catalogRes, customRes] = await Promise.allSettled([
    supabase.from('lab_tests_catalog').select('*').ilike('name', `%${query}%`),
    supabase.from('custom_lab_tests').select('*').eq('clinic_id', currentClinicId()).ilike('name', `%${query}%`),
  ]);
  const catalog = catalogRes.status === 'fulfilled' ? (catalogRes.value.data ?? []).map(mapCatalogLabTest) : [];
  const custom = customRes.status === 'fulfilled' ? (customRes.value.data ?? []).map(mapCustomLabTest) : [];
  return mergeByName(mergeByName(local, catalog), custom).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllFrequentLabTests(limit = 20): Promise<LabTest[]> {
  const [catalogRes, customRes] = await Promise.allSettled([
    supabase.from('lab_tests_catalog').select('*'),
    supabase.from('custom_lab_tests').select('*').eq('clinic_id', currentClinicId()).order('usage_count', { ascending: false }).limit(limit),
  ]);
  const catalog = catalogRes.status === 'fulfilled' ? (catalogRes.value.data ?? []).map(mapCatalogLabTest) : [];
  const custom = customRes.status === 'fulfilled' ? (customRes.value.data ?? []).map(mapCustomLabTest) : [];
  const merged = mergeByName(mergeByName(custom, catalog), SAMPLE_LAB_TESTS);
  return merged.sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
}

export async function getLabTestsByCategory(category: string, query = ''): Promise<LabTest[]> {
  const local = SAMPLE_LAB_TESTS.filter((t) => t.category === category && (!query || t.name.toLowerCase().includes(query.toLowerCase())));
  let catalogQuery = supabase.from('lab_tests_catalog').select('*').eq('category', category);
  if (query.trim()) catalogQuery = catalogQuery.ilike('name', `%${query.trim()}%`);
  const { data } = await catalogQuery;
  const catalog = (data ?? []).map(mapCatalogLabTest);
  return mergeByName(local, catalog).sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCustomLabTest(name: string, category: string): Promise<LabTest> {
  const { data, error } = await supabase
    .from('custom_lab_tests')
    .insert({ clinic_id: currentClinicId(), name, category })
    .select()
    .single();
  throwOnError(error, 'Failed to add custom lab test.');
  return mapCustomLabTest(data);
}

export async function getAllCustomLabTests(limit = 1000): Promise<LabTest[]> {
  const { data, error } = await supabase
    .from('custom_lab_tests')
    .select('*')
    .eq('clinic_id', currentClinicId())
    .order('usage_count', { ascending: false })
    .limit(limit);
  throwOnError(error, 'Failed to load custom lab tests.');
  return (data ?? []).map(mapCustomLabTest);
}

export async function incrementLabTestUsage(name: string, isCustom: boolean): Promise<void> {
  if (!isCustom) return;
  try {
    const { data } = await supabase
      .from('custom_lab_tests')
      .select('usage_count')
      .eq('clinic_id', currentClinicId())
      .eq('name', name)
      .single();
    await supabase
      .from('custom_lab_tests')
      .update({ usage_count: ((data?.usage_count as number) ?? 0) + 1 })
      .eq('clinic_id', currentClinicId())
      .eq('name', name);
  } catch { /* ignore */ }
}

export async function deleteCustomLabTest(id: string): Promise<void> {
  const { error } = await supabase.from('custom_lab_tests').delete().eq('id', id);
  throwOnError(error, 'Failed to delete custom lab test.');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPrescriptionTemplates(): Promise<PrescriptionTemplate[]> {
  const { data, error } = await supabase
    .from('prescription_templates')
    .select('*')
    .eq('clinic_id', currentClinicId())
    .order('created_at', { ascending: false });
  throwOnError(error, 'Failed to load templates.');
  return (data ?? []).map(mapPrescriptionTemplate);
}

export async function savePrescriptionTemplate(data: Omit<PrescriptionTemplate, 'id' | 'createdAt'>): Promise<PrescriptionTemplate> {
  const clinicId = currentClinicId();
  const doctorId = useAuthStore.getState().user?.id;
  const { data: row, error } = await supabase
    .from('prescription_templates')
    .insert({
      clinic_id: clinicId,
      doctor_id: doctorId,
      name: data.name,
      data: {
        diagnosis: data.diagnosis,
        advice: data.advice,
        symptoms: data.symptoms,
        referred_to: data.referredTo || null,
        medicines: medicinesToJsonb(data.medicines as PrescriptionMedicine[]),
        lab_tests: labTestsToJsonb(data.labTests as PrescriptionLabTest[]),
      },
    })
    .select()
    .single();
  throwOnError(error, 'Failed to save template.');
  return mapPrescriptionTemplate(row);
}

export async function deletePrescriptionTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('prescription_templates').delete().eq('id', id);
  throwOnError(error, 'Failed to delete template.');
}

export async function getShareToken(prescriptionId: string): Promise<{ share_token: string; share_token_expires_at: string }> {
  const { data, error } = await supabase.rpc('get_or_create_share_token', { p_prescription_id: prescriptionId });
  throwOnError(error, 'Failed to create share link.');
  return { share_token: data.share_token, share_token_expires_at: data.expires_at };
}
