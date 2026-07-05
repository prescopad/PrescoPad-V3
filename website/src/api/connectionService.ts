import api from './client';
import type { ConnectionRequest, TeamMember, ClinicListItem, DoctorListItem } from '../types/connection.types';

export async function inviteAssistant(assistantPhone: string): Promise<ConnectionRequest> {
  const response = await api.post('/connection/invite', { assistantPhone });
  return response.data.request;
}

export async function requestToJoin(doctorCode: string): Promise<ConnectionRequest> {
  const response = await api.post('/connection/request', { doctorCode });
  return response.data.request;
}

export async function acceptRequest(requestId: string): Promise<void> {
  await api.put(`/connection/${requestId}/accept`);
}

export async function rejectRequest(requestId: string): Promise<void> {
  await api.put(`/connection/${requestId}/reject`);
}

export async function getPendingRequests(): Promise<ConnectionRequest[]> {
  const response = await api.get('/connection/pending');
  const raw: Record<string, unknown>[] = response.data.requests ?? [];
  return raw.map(normalizeRequest);
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const response = await api.get('/connection/team');
  const raw: Record<string, unknown>[] = response.data.members ?? [];
  return raw.map(normalizeMember);
}

export async function disconnectAssistant(assistantId: string): Promise<void> {
  await api.delete(`/connection/team/${assistantId}`);
}

export async function listClinics(search?: string): Promise<ClinicListItem[]> {
  const params = search ? { search } : {};
  const response = await api.get('/clinic/list', { params });
  const raw: Record<string, unknown>[] = response.data.clinics ?? [];
  return raw.map(normalizeClinic);
}

export async function getDoctorsByClinic(clinicId: string): Promise<DoctorListItem[]> {
  const response = await api.get(`/clinic/${clinicId}/doctors`);
  const raw: Record<string, unknown>[] = response.data.doctors ?? [];
  return raw.map(normalizeDoctor);
}

function normalizeClinic(r: Record<string, unknown>): ClinicListItem {
  return {
    id: (r.id ?? r._id ?? '') as string,
    name: (r.name ?? '') as string,
    address: (r.address ?? '') as string,
    phone: (r.phone ?? '') as string,
    doctorName: (r.doctor_name ?? r.doctorName ?? '') as string,
    doctorSpecialty: (r.doctor_specialty ?? r.doctorSpecialty ?? '') as string,
    ownerId: (r.owner_id ?? r.ownerId ?? '') as string,
  };
}

function normalizeDoctor(r: Record<string, unknown>): DoctorListItem {
  return {
    id: (r.id ?? r._id ?? '') as string,
    name: (r.name ?? '') as string,
    specialty: (r.specialty ?? '') as string,
    regNumber: (r.reg_number ?? r.regNumber ?? '') as string,
    doctorCode: (r.doctor_code ?? r.doctorCode ?? '') as string,
  };
}

function normalizeRequest(r: Record<string, unknown>): ConnectionRequest {
  return {
    id: (r.id ?? r._id ?? '') as string,
    doctorId: (r.doctor_id ?? r.doctorId ?? '') as string,
    assistantId: (r.assistant_id ?? r.assistantId ?? '') as string,
    initiatedBy: (r.initiated_by ?? r.initiatedBy ?? 'assistant') as ConnectionRequest['initiatedBy'],
    status: (r.status ?? 'pending') as ConnectionRequest['status'],
    doctorName: (r.doctor_name ?? r.doctorName) as string | undefined,
    assistantName: (r.assistant_name ?? r.assistantName) as string | undefined,
    clinicName: (r.clinic_name ?? r.clinicName) as string | undefined,
    createdAt: (r.created_at ?? r.createdAt ?? '') as string,
    qualification: r.qualification as string | undefined,
    experienceYears: (r.experience_years ?? r.experienceYears) as number | undefined,
    city: r.city as string | undefined,
    assistantAddress: (r.assistant_address ?? r.assistantAddress) as string | undefined,
    assistantPhone: (r.assistant_phone ?? r.assistantPhone) as string | undefined,
  };
}

function normalizeMember(r: Record<string, unknown>): TeamMember {
  return {
    id: (r.id ?? r._id ?? '') as string,
    name: (r.name ?? '') as string,
    phone: (r.phone ?? '') as string,
    role: (r.role ?? 'assistant') as TeamMember['role'],
    lastActiveAt: (r.last_active_at ?? r.lastActiveAt) as string | undefined,
    qualification: r.qualification as string | undefined,
    experienceYears: (r.experience_years ?? r.experienceYears) as number | undefined,
    profileAddress: (r.profile_address ?? r.profileAddress) as string | undefined,
    city: r.city as string | undefined,
    specialty: r.specialty as string | undefined,
    regNumber: (r.reg_number ?? r.regNumber) as string | undefined,
  };
}
