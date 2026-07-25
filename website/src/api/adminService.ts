import { supabase } from './supabase';

export interface AdminOverview {
  users: { doctors: number; assistants: number; admins: number; onlineDoctors: number };
  clinics: { total: number };
  patients: { total: number };
  prescriptions: { total: number; finalized: number; today: number; week: number; month: number };
  revenue: {
    totalCash: number;
    totalOnline: number;
    platformGross: number;
  };
  generatedAt: string;
}

export interface AdminUser {
  id: string;
  phone: string;
  name: string | null;
  role: 'doctor' | 'assistant' | 'admin';
  is_active?: boolean;
  isActive?: boolean;
  clinic_id?: string | null;
  clinicId?: string | null;
  created_at?: string;
  last_active_at?: string | null;
}

export interface AdminClinic {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  owner_id?: string;
  is_active?: boolean;
  solo_mode?: boolean;
  soloMode?: boolean;
  doctorCount: number;
  assistantCount: number;
  prescriptionCount: number;
  created_at?: string;
}

export interface AdminPatient {
  id: string;
  name: string;
  phone?: string;
  age?: number;
  gender?: string;
  clinic_id?: string;
  created_at?: string;
}

export interface AdminPrescription {
  id: string;
  clinic_id: string;
  patient_name?: string;
  diagnosis?: string;
  status: string;
  charge_amount?: number;
  created_at: string;
}

export interface AdminRevenue {
  period: string;
  byType: Record<string, { total: number; count: number }>;
  platformRevenue: number;
  generatedAt: string;
}

function throwOnError(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await supabase.rpc('admin_get_overview');
  throwOnError(error, 'Failed to load overview.');
  return data as AdminOverview;
}

export async function fetchAdminUsers(params: {
  role?: 'doctor' | 'assistant' | 'admin';
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; users: AdminUser[] }> {
  const { data, error } = await supabase.rpc('admin_list_users', {
    p_role: params.role ?? null,
    p_search: params.search ?? null,
    p_limit: params.limit ?? 100,
    p_offset: params.offset ?? 0,
  });
  throwOnError(error, 'Failed to load users.');
  return { total: (data?.total as number) ?? 0, users: (data?.users as AdminUser[]) ?? [] };
}

export async function fetchAdminClinics(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; clinics: AdminClinic[] }> {
  const { data, error } = await supabase.rpc('admin_list_clinics', {
    p_search: params.search ?? null,
    p_limit: params.limit ?? 100,
    p_offset: params.offset ?? 0,
  });
  throwOnError(error, 'Failed to load clinics.');
  return { total: (data?.total as number) ?? 0, clinics: (data?.clinics as AdminClinic[]) ?? [] };
}

export async function fetchAdminPatients(params: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; patients: AdminPatient[] }> {
  const { data, error } = await supabase.rpc('admin_list_patients', {
    p_search: params.search ?? null,
    p_limit: params.limit ?? 100,
    p_offset: params.offset ?? 0,
  });
  throwOnError(error, 'Failed to load patients.');
  return { total: (data?.total as number) ?? 0, patients: (data?.patients as AdminPatient[]) ?? [] };
}

export async function fetchAdminPrescriptions(params: {
  clinicId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; prescriptions: AdminPrescription[] }> {
  const { data, error } = await supabase.rpc('admin_list_prescriptions', {
    p_clinic_id: params.clinicId ?? null,
    p_limit: params.limit ?? 100,
    p_offset: params.offset ?? 0,
  });
  throwOnError(error, 'Failed to load prescriptions.');
  return { total: (data?.total as number) ?? 0, prescriptions: (data?.prescriptions as AdminPrescription[]) ?? [] };
}

export async function fetchAdminRevenue(period: 'today' | 'week' | 'month'): Promise<AdminRevenue> {
  const { data, error } = await supabase.rpc('admin_revenue_breakdown', { p_period: period });
  throwOnError(error, 'Failed to load revenue breakdown.');
  return data as AdminRevenue;
}

export async function setAdminUserActive(userId: string, isActive: boolean): Promise<AdminUser> {
  const { data, error } = await supabase.rpc('admin_set_user_active', { p_user_id: userId, p_is_active: isActive });
  throwOnError(error, 'Failed to update user status.');
  return data as AdminUser;
}

export async function promoteAdminUser(userId: string): Promise<AdminUser> {
  const { data, error } = await supabase.rpc('admin_promote_to_admin', { p_user_id: userId });
  throwOnError(error, 'Failed to promote user.');
  return data as AdminUser;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  throwOnError(error, 'Failed to delete user.');
}

export async function createAdminClinic(data: {
  name: string;
  address?: string;
  phone?: string;
  city?: string;
}): Promise<AdminClinic> {
  const { data: row, error } = await supabase.rpc('admin_create_clinic', {
    p_name: data.name,
    p_address: data.address ?? null,
    p_phone: data.phone ?? null,
    p_city: data.city ?? null,
  });
  throwOnError(error, 'Failed to create clinic.');
  return row as AdminClinic;
}

export async function updateAdminClinic(
  clinicId: string,
  data: { name?: string; address?: string; phone?: string; city?: string; is_active?: boolean },
): Promise<AdminClinic> {
  const { data: row, error } = await supabase.rpc('admin_update_clinic', {
    p_clinic_id: clinicId,
    p_name: data.name ?? null,
    p_address: data.address ?? null,
    p_phone: data.phone ?? null,
    p_city: data.city ?? null,
  });
  throwOnError(error, 'Failed to update clinic.');
  return row as AdminClinic;
}

export async function deleteAdminClinic(clinicId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_clinic', { p_clinic_id: clinicId });
  throwOnError(error, 'Failed to delete clinic.');
}
