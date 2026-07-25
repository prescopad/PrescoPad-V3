import { supabase } from './supabase';
import { UserRole } from '../types/auth.types';
import type { AuthResponse, User } from '../types/auth.types';

/** Re-throw with a clear message so UI catch blocks get readable text. */
function throwWithMessage(error: unknown, fallback: string): never {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    throw new Error((error as { message: string }).message || fallback);
  }
  throw new Error(fallback);
}

function normalizeProfile(p: Record<string, unknown>): User {
  return {
    id: (p.id ?? '') as string,
    phone: (p.phone ?? '') as string,
    name: (p.name ?? '') as string,
    role: (p.role ?? '') as User['role'],
    clinicId: (p.clinic_id ?? '') as string,
    doctorCode: (p.doctor_code ?? undefined) as string | undefined,
    isProfileComplete: Boolean(p.is_profile_complete ?? false),
    soloMode: undefined, // resolved separately via useClinicStore (clinics.solo_mode)
    signatureUrl: (p.signature_url ?? undefined) as string | undefined,
    specialty: (p.specialty ?? undefined) as string | undefined,
    regNumber: (p.reg_number ?? undefined) as string | undefined,
    qualification: (p.qualification ?? undefined) as string | undefined,
    experienceYears: (p.experience_years ?? undefined) as number | undefined,
    city: (p.city ?? undefined) as string | undefined,
    address: (p.address ?? undefined) as string | undefined,
    createdAt: (p.created_at ?? '') as string,
  };
}

/** Fetch the caller's own profile row and the current session's tokens. */
async function currentAuthResponse(): Promise<AuthResponse> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw new Error('No active session');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sessionData.session.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Failed to load profile');
  }

  return {
    user: normalizeProfile(profile),
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

export async function sendOTP(
  phone: string,
  role: UserRole,
  _purpose: string = 'login'
): Promise<{ success: boolean }> {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { data: { role } },
  });
  if (error) throwWithMessage(error, 'Failed to send OTP. Please try again.');
  return { success: true };
}

export async function verifyOTP(
  phone: string,
  otp: string,
  _role: UserRole,
  _purpose: string = 'login'
): Promise<AuthResponse> {
  const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
  if (error) throwWithMessage(error, 'Verification failed. Please try again.');
  return currentAuthResponse();
}

export async function getMe(): Promise<User> {
  const { user } = await currentAuthResponse();
  return user;
}

export async function updateProfile(data: {
  name?: string;
  phone?: string;
  specialty?: string;
  regNumber?: string;
  qualification?: string;
  experienceYears?: number;
  city?: string;
  address?: string;
  signatureUrl?: string;
}): Promise<User> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('No active session');

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.specialty !== undefined) update.specialty = data.specialty;
  if (data.qualification !== undefined) update.specialty = data.qualification;
  if (data.regNumber !== undefined) update.reg_number = data.regNumber;
  if (data.experienceYears !== undefined) update.experience_years = data.experienceYears;
  if (data.city !== undefined) update.city = data.city;
  if (data.address !== undefined) update.address = data.address;
  if (data.signatureUrl !== undefined) update.signature_url = data.signatureUrl;

  const { data: updated, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', sessionData.session.user.id)
    .select()
    .single();

  if (error || !updated) throwWithMessage(error, 'Failed to update profile.');
  return normalizeProfile(updated);
}

export async function completeRegistration(data: {
  name: string;
  specialty?: string;
  regNumber?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  qualification?: string;
  experienceYears?: number;
  address?: string;
  city?: string;
  joinClinicCode?: string;
}): Promise<AuthResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('No active session');
  const role = sessionData.session.user.user_metadata?.role as UserRole | undefined;

  if (role === UserRole.ASSISTANT) {
    const { error } = await supabase.rpc('complete_assistant_registration', {
      p_name: data.name,
      p_qualification: data.qualification,
      p_experience_years: data.experienceYears,
      p_city: data.city,
      p_address: data.address,
    });
    if (error) throwWithMessage(error, 'Failed to complete registration.');
  } else {
    const { error } = await supabase.rpc('complete_doctor_registration', {
      p_name: data.name,
      p_specialty: data.specialty,
      p_reg_number: data.regNumber,
      p_clinic_name: data.clinicName,
      p_clinic_address: data.clinicAddress,
      p_clinic_phone: data.clinicPhone,
      p_clinic_email: data.clinicEmail,
      p_join_clinic_code: data.joinClinicCode ?? null,
    });
    if (error) throwWithMessage(error, 'Failed to complete registration.');
  }

  return currentAuthResponse();
}

export async function refreshSession(): Promise<AuthResponse> {
  const { error } = await supabase.auth.refreshSession();
  if (error) throwWithMessage(error, 'Failed to refresh session.');
  return currentAuthResponse();
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
