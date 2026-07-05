import api from './client';
import type { Patient, PatientFormData, CasebookEntry } from '../types/patient.types';
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING HELPERS (snake_case backend → camelCase frontend) — mirrors
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
    casebookSummary: (row.casebook_summary as string) ?? null,
    casebookSummaryUpdatedAt: (row.casebook_summary_updated_at as string) ?? null,
    casebookEntries: ((row.casebook_entries as Record<string, unknown>[]) ?? []).map((e) => ({
      date: (e.date as string) ?? '',
      summary: (e.summary as string) ?? '',
      prescriptionId: (e.prescription_id as string) ?? '',
    })) as CasebookEntry[],
  };
}

function mapQueueItem(row: Record<string, unknown>): QueueItem {
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
    patient: row.patient_name ? {
      id: row.patient_id as string,
      name: row.patient_name as string,
      age: row.patient_age as number,
      gender: row.patient_gender as Patient['gender'],
      weight: (row.patient_weight as number) ?? null,
      phone: (row.patient_phone as string) ?? '',
      address: (row.patient_address as string) ?? '',
      bloodGroup: (row.patient_blood_group as string) ?? '',
      allergies: (row.patient_allergies as string) ?? '',
      createdAt: '',
      updatedAt: '',
    } : undefined,
  };
}

function mapPrescription(row: Record<string, unknown>): Prescription {
  const medicines = (row.medicines as Record<string, unknown>[] | undefined)?.map(mapPrescriptionMedicine) ?? [];
  const labTests = (row.lab_tests as Record<string, unknown>[] | undefined)?.map(mapPrescriptionLabTest) ?? [];
  return {
    id: row.id as string,
    patientId: row.patient_id as string,
    patientName: row.patient_name as string,
    patientAge: row.patient_age as number,
    patientGender: row.patient_gender as string,
    patientPhone: (row.patient_phone as string) ?? '',
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
    walletDeducted: Boolean(row.wallet_deducted),
    medicines,
    labTests,
    createdAt: row.created_at as string,
  };
}

function mapPrescriptionTemplate(row: Record<string, unknown>): PrescriptionTemplate {
  const medicines = (row.medicines as Record<string, unknown>[] | undefined)?.map(mapPrescriptionMedicine) ?? [];
  const labTests = (row.lab_tests as Record<string, unknown>[] | undefined)?.map(mapPrescriptionLabTest) ?? [];
  return {
    id: (row._id as string) || (row.id as string),
    name: row.name as string,
    diagnosis: (row.diagnosis as string) ?? '',
    advice: (row.advice as string) ?? '',
    symptoms: (row.symptoms as string[]) ?? [],
    referredTo: (row.referred_to as string) ?? '',
    medicines,
    labTests,
    createdAt: row.created_at as string,
  };
}

function mapPrescriptionMedicine(row: Record<string, unknown>): PrescriptionMedicine {
  return {
    id: row.id as string,
    prescriptionId: row.prescription_id as string,
    medicineName: row.medicine_name as string,
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
    id: row.id as string,
    prescriptionId: row.prescription_id as string,
    testName: row.test_name as string,
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
    isCustom: Boolean(row.is_custom) || false,
    usageCount: (row.usage_count as number) ?? 0,
  };
}

function mapCustomMedicine(row: Record<string, unknown>): Medicine {
  return { ...mapCatalogMedicine(row), isCustom: true };
}

function mapCatalogLabTest(row: Record<string, unknown>): LabTest {
  return {
    id: row.id as string,
    name: row.name as string,
    category: (row.category as string) ?? '',
    isCustom: Boolean(row.is_custom) || false,
    usageCount: (row.usage_count as number) ?? 0,
  };
}

function mapCustomLabTest(row: Record<string, unknown>): LabTest {
  return { ...mapCatalogLabTest(row), isCustom: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPatients(search?: string, limit = 100, offset = 0): Promise<Patient[]> {
  const params: Record<string, string | number> = { limit, offset };
  if (search) params.search = search;
  const res = await api.get('/data/patients', { params });
  return (res.data.patients as Record<string, unknown>[]).map(mapPatient);
}

export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    const res = await api.get(`/data/patients/${id}`);
    return mapPatient(res.data.patient);
  } catch {
    return null;
  }
}

export async function createPatient(data: PatientFormData): Promise<Patient> {
  const res = await api.post('/data/patients', {
    name: data.name,
    age: parseInt(data.age) || 0,
    gender: data.gender,
    weight: data.weight ? parseFloat(data.weight) : null,
    phone: data.phone,
    address: data.address,
    blood_group: data.bloodGroup,
    allergies: data.allergies,
  });
  return mapPatient(res.data.patient);
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

  const res = await api.put(`/data/patients/${id}`, payload);
  return mapPatient(res.data.patient);
}

export async function getRecentPatients(limit = 10): Promise<Patient[]> {
  return getPatients(undefined, limit, 0);
}

export async function deletePatient(id: string): Promise<void> {
  await api.delete(`/data/patients/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTodayQueue(): Promise<QueueItem[]> {
  const res = await api.get('/data/queue/today');
  return (res.data.queue as Record<string, unknown>[]).map(mapQueueItem);
}

export async function getTodayStats(): Promise<{ total: number; waiting: number; inProgress: number; completed: number }> {
  const res = await api.get('/data/queue/stats');
  const s = res.data.stats;
  return { total: s.total, waiting: s.waiting, inProgress: s.in_progress, completed: s.completed };
}

export async function addToQueue(patientId: string, addedBy: string, notes?: string, consultationType?: string): Promise<QueueItem> {
  const res = await api.post('/data/queue', {
    patient_id: patientId,
    added_by: addedBy,
    notes: notes ?? '',
    consultation_type: consultationType ?? 'new',
  });
  return mapQueueItem(res.data.item);
}

export async function updateQueueStatus(id: string, status: QueueStatus): Promise<void> {
  await api.put(`/data/queue/${id}/status`, { status });
}

export async function removeFromQueue(id: string): Promise<void> {
  await api.delete(`/data/queue/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createPrescription(draft: PrescriptionDraft, doctorId: string): Promise<Prescription> {
  const payload = {
    patient_id: draft.patientId,
    patient_name: draft.patientName,
    patient_age: parseInt(draft.patientAge) || 0,
    patient_gender: draft.patientGender,
    patient_phone: draft.patientPhone,
    diagnosis: draft.diagnosis,
    advice: draft.advice,
    follow_up_date: draft.followUpDate || null,
    symptoms: draft.symptoms,
    referred_to: draft.referredTo || null,
    medicines: draft.medicines.map((m) => ({
      medicine_name: m.medicineName,
      type: m.type,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      timing: m.timing,
      notes: m.notes,
    })),
    lab_tests: draft.labTests.map((t) => ({
      test_name: t.testName,
      category: t.category,
      notes: t.notes,
    })),
  };
  const res = await api.post('/data/prescriptions', { ...payload, doctor_id: doctorId });
  return mapPrescription(res.data.prescription);
}

export async function getPrescriptionById(id: string): Promise<Prescription | null> {
  try {
    const res = await api.get(`/data/prescriptions/${id}`);
    return mapPrescription(res.data.prescription);
  } catch {
    return null;
  }
}

export async function getRecentPrescriptions(limit = 20): Promise<Prescription[]> {
  const res = await api.get('/data/prescriptions', { params: { limit } });
  return (res.data.prescriptions as Record<string, unknown>[]).map(mapPrescription);
}

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const res = await api.get(`/data/prescriptions/patient/${patientId}`);
  return (res.data.prescriptions as Record<string, unknown>[]).map(mapPrescription);
}

export async function finalizePrescription(id: string, signature: string, pdfHash: string): Promise<void> {
  await api.put(`/data/prescriptions/${id}/finalize`, { signature, pdf_hash: pdfHash });
}

export async function getTodayPrescriptionCount(): Promise<number> {
  const res = await api.get('/data/prescriptions/today/count');
  return res.data.count;
}

export function getPrescriptionPdfUrl(id: string): string {
  return `${api.defaults.baseURL}/data/prescriptions/${id}/pdf`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDICINES (backend catalog + clinic custom medicines — website has no local
// SQLite, so both come from the API; mobile merges local SQLite + cloud custom
// the same way, just with the seeded half read from a bundled DB instead)
// ═══════════════════════════════════════════════════════════════════════════════

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

export async function searchAllMedicines(query: string): Promise<Medicine[]> {
  const [catalogRes, customRes] = await Promise.allSettled([
    api.get('/data/medicines', { params: { q: query } }),
    api.get('/data/custom-medicines', { params: { q: query } }),
  ]);
  const catalog = catalogRes.status === 'fulfilled'
    ? (catalogRes.value.data.medicines as Record<string, unknown>[]).map(mapCatalogMedicine)
    : [];
  const custom = customRes.status === 'fulfilled'
    ? (customRes.value.data.medicines as Record<string, unknown>[]).map(mapCustomMedicine)
    : [];
  return mergeByName(catalog, custom).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllFrequentMedicines(limit = 20): Promise<Medicine[]> {
  const [catalogRes, customRes] = await Promise.allSettled([
    api.get('/data/medicines'),
    api.get('/data/custom-medicines/frequent', { params: { limit } }),
  ]);
  const catalog = catalogRes.status === 'fulfilled'
    ? (catalogRes.value.data.medicines as Record<string, unknown>[]).map(mapCatalogMedicine)
    : [];
  const custom = customRes.status === 'fulfilled'
    ? (customRes.value.data.medicines as Record<string, unknown>[]).map(mapCustomMedicine)
    : [];
  return mergeByName(custom, catalog).sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
}

export async function getMedicinesByCategory(types: string[], query = ''): Promise<Medicine[]> {
  const results = await Promise.allSettled(
    types.map((type) => api.get('/data/medicines', { params: { type, q: query || undefined } }))
  );
  const catalog = results.flatMap((r) =>
    r.status === 'fulfilled'
      ? (r.value.data.medicines as Record<string, unknown>[]).map(mapCatalogMedicine)
      : []
  );

  let custom: Medicine[] = [];
  try {
    const res = await api.get('/data/custom-medicines', { params: query.trim() ? { q: query.trim() } : {} });
    custom = (res.data.medicines as Record<string, unknown>[])
      .map(mapCustomMedicine)
      .filter((m) => types.includes(m.type));
  } catch { /* cloud unavailable */ }

  return mergeByName(catalog, custom).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMedicinesOutsideCategories(excludeTypes: string[], query = ''): Promise<Medicine[]> {
  const res = await api.get('/data/medicines', { params: { q: query || undefined } });
  const catalog = (res.data.medicines as Record<string, unknown>[])
    .map(mapCatalogMedicine)
    .filter((m) => !excludeTypes.includes(m.type));

  let custom: Medicine[] = [];
  try {
    const customRes = await api.get('/data/custom-medicines', { params: query.trim() ? { q: query.trim() } : {} });
    custom = (customRes.data.medicines as Record<string, unknown>[])
      .map(mapCustomMedicine)
      .filter((m) => !excludeTypes.includes(m.type));
  } catch { /* cloud unavailable */ }

  return mergeByName(catalog, custom).sort((a, b) => a.name.localeCompare(b.name));
}

export async function addCustomMedicine(name: string, type: string, strength: string): Promise<Medicine> {
  const res = await api.post('/data/custom-medicines', { name, type, strength });
  return mapCustomMedicine(res.data.medicine);
}

export async function incrementMedicineUsage(name: string, isCustom: boolean): Promise<void> {
  if (isCustom) {
    try { await api.put('/data/custom-medicines/usage', { name }); } catch { /* ignore */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAB TESTS (backend catalog + clinic custom lab tests)
// ═══════════════════════════════════════════════════════════════════════════════

export async function searchAllLabTests(query: string): Promise<LabTest[]> {
  const [catalogRes, customRes] = await Promise.allSettled([
    api.get('/data/lab-tests', { params: { q: query } }),
    api.get('/data/custom-lab-tests', { params: { q: query } }),
  ]);
  const catalog = catalogRes.status === 'fulfilled'
    ? (catalogRes.value.data.labTests as Record<string, unknown>[]).map(mapCatalogLabTest)
    : [];
  const custom = customRes.status === 'fulfilled'
    ? (customRes.value.data.labTests as Record<string, unknown>[]).map(mapCustomLabTest)
    : [];
  return mergeByName(catalog, custom).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllFrequentLabTests(limit = 20): Promise<LabTest[]> {
  const [catalogRes, customRes] = await Promise.allSettled([
    api.get('/data/lab-tests'),
    api.get('/data/custom-lab-tests/frequent', { params: { limit } }),
  ]);
  const catalog = catalogRes.status === 'fulfilled'
    ? (catalogRes.value.data.labTests as Record<string, unknown>[]).map(mapCatalogLabTest)
    : [];
  const custom = customRes.status === 'fulfilled'
    ? (customRes.value.data.labTests as Record<string, unknown>[]).map(mapCustomLabTest)
    : [];
  return mergeByName(custom, catalog).sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
}

export async function getLabTestsByCategory(category: string, query = ''): Promise<LabTest[]> {
  const res = await api.get('/data/lab-tests', { params: { category, q: query || undefined } });
  return (res.data.labTests as Record<string, unknown>[]).map(mapCatalogLabTest);
}

export async function addCustomLabTest(name: string, category: string): Promise<LabTest> {
  const res = await api.post('/data/custom-lab-tests', { name, category });
  return mapCustomLabTest(res.data.labTest);
}

export async function incrementLabTestUsage(name: string, isCustom: boolean): Promise<void> {
  if (isCustom) {
    try { await api.put('/data/custom-lab-tests/usage', { name }); } catch { /* ignore */ }
  }
}

export async function deleteCustomLabTest(id: string): Promise<void> {
  await api.delete(`/data/custom-lab-tests/${id}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export async function getPrescriptionTemplates(): Promise<PrescriptionTemplate[]> {
  const res = await api.get('/data/templates');
  return (res.data.templates as Record<string, unknown>[]).map(mapPrescriptionTemplate);
}

export async function savePrescriptionTemplate(data: Omit<PrescriptionTemplate, 'id' | 'createdAt'>): Promise<PrescriptionTemplate> {
  const payload = {
    name: data.name,
    diagnosis: data.diagnosis,
    advice: data.advice,
    symptoms: data.symptoms,
    referred_to: data.referredTo || null,
    medicines: data.medicines.map((m) => ({
      medicine_name: m.medicineName,
      type: m.type,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      timing: m.timing,
      notes: m.notes,
    })),
    lab_tests: data.labTests.map((t) => ({
      test_name: t.testName,
      category: t.category,
      notes: t.notes,
    })),
  };
  const res = await api.post('/data/templates', payload);
  return mapPrescriptionTemplate(res.data.template);
}

export async function deletePrescriptionTemplate(id: string): Promise<void> {
  await api.delete(`/data/templates/${id}`);
}

export async function getShareToken(prescriptionId: string): Promise<{ share_token: string; share_token_expires_at: string }> {
  const res = await api.post(`/data/prescriptions/${prescriptionId}/share`);
  return res.data;
}
