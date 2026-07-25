import { supabase } from './supabase';
import { ConnectionRequest, TeamMember, ClinicListItem, DoctorListItem } from '../types/connection.types';

function throwOnError(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

export async function inviteAssistant(assistantPhone: string): Promise<ConnectionRequest> {
  const { data, error } = await supabase.rpc('invite_assistant', { p_assistant_phone: assistantPhone });
  throwOnError(error, 'Failed to invite assistant.');
  return normalizeRequest(data);
}

export async function requestToJoin(doctorCode: string): Promise<void> {
  const { data: targetDoctor, error: lookupError } = await supabase
    .from('profiles')
    .select('id, clinic_id, role')
    .eq('doctor_code', doctorCode)
    .eq('role', 'doctor')
    .maybeSingle();
  if (lookupError || !targetDoctor) throw new Error('Invalid doctor code.');

  const { data: sessionData } = await supabase.auth.getSession();
  const requesterRole = sessionData.session?.user.user_metadata?.role === 'doctor' ? 'doctor' : 'assistant';

  const { error } = await supabase.from('connection_requests').insert({
    clinic_id: targetDoctor.clinic_id,
    doctor_id: targetDoctor.id,
    requester_id: sessionData.session?.user.id,
    requester_role: requesterRole,
    initiated_by: 'requester',
  });
  throwOnError(error, 'Failed to request to join.');
}

export async function acceptRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_connection_request', { p_request_id: requestId });
  throwOnError(error, 'Failed to accept request.');
}

export async function rejectRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_connection_request', { p_request_id: requestId });
  throwOnError(error, 'Failed to reject request.');
}

export async function getPendingRequests(): Promise<ConnectionRequest[]> {
  const { data, error } = await supabase.rpc('get_pending_connection_requests');
  throwOnError(error, 'Failed to load pending requests.');
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeRequest);
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.rpc('get_team');
  throwOnError(error, 'Failed to load team.');
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeMember);
}

export async function disconnectAssistant(assistantId: string): Promise<void> {
  const { error } = await supabase.rpc('disconnect_assistant', { p_assistant_id: assistantId });
  throwOnError(error, 'Failed to disconnect assistant.');
}

export async function listClinics(search?: string): Promise<ClinicListItem[]> {
  const { data, error } = await supabase.rpc('list_clinics', { p_search: search ?? null });
  throwOnError(error, 'Failed to load clinics.');
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeClinic);
}

export async function getDoctorsByClinic(clinicId: string): Promise<DoctorListItem[]> {
  const { data, error } = await supabase.rpc('get_doctors_by_clinic', { p_clinic_id: clinicId });
  throwOnError(error, 'Failed to load doctors.');
  return ((data ?? []) as Record<string, unknown>[]).map(normalizeDoctor);
}

// ── normalizers ──────────────────────────────────────────────────────────────

function normalizeClinic(r: Record<string, unknown>): ClinicListItem {
  return {
    id: (r.id as string) ?? '',
    name: (r.name as string) ?? '',
    address: (r.address as string) ?? '',
    phone: (r.phone as string) ?? '',
    doctorName: (r.doctorName as string) ?? '',
    doctorSpecialty: (r.doctorSpecialty as string) ?? '',
    ownerId: (r.owner_id as string) ?? '',
  };
}

function normalizeDoctor(r: Record<string, unknown>): DoctorListItem {
  return {
    id: (r.id as string) ?? '',
    name: (r.name as string) ?? '',
    specialty: (r.specialty as string) ?? '',
    regNumber: (r.reg_number as string) ?? '',
    doctorCode: (r.doctor_code as string) ?? '',
  };
}

function normalizeRequest(r: Record<string, unknown>): ConnectionRequest {
  return {
    id: (r.id as string) ?? '',
    doctorId: (r.doctorId as string) ?? '',
    assistantId: (r.assistantId as string) ?? '',
    initiatedBy: (r.initiatedBy as ConnectionRequest['initiatedBy']) ?? 'assistant',
    status: (r.status as ConnectionRequest['status']) ?? 'pending',
    doctorName: r.doctorName as string | undefined,
    assistantName: r.assistantName as string | undefined,
    clinicName: r.clinicName as string | undefined,
    createdAt: (r.createdAt as string) ?? '',
    qualification: r.qualification as string | undefined,
    experienceYears: r.experienceYears as number | undefined,
    city: r.city as string | undefined,
    assistantAddress: r.assistantAddress as string | undefined,
    assistantPhone: r.assistantPhone as string | undefined,
  };
}

function normalizeMember(r: Record<string, unknown>): TeamMember {
  return {
    id: (r.id as string) ?? '',
    name: (r.name as string) ?? '',
    phone: (r.phone as string) ?? '',
    role: (r.role as TeamMember['role']) ?? 'assistant',
    lastActiveAt: r.last_active_at as string | undefined,
    qualification: r.specialty as string | undefined,
    experienceYears: r.experience_years as number | undefined,
    profileAddress: r.address as string | undefined,
    city: r.city as string | undefined,
    specialty: r.specialty as string | undefined,
    regNumber: r.reg_number as string | undefined,
  };
}
