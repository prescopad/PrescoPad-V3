import { create } from 'zustand';
import type { Clinic, DoctorProfile } from '../types/clinic.types';
import { supabase } from '../api/supabase';
import { useAuthStore } from './useAuthStore';

interface ClinicStore {
  clinic: Clinic | null;
  doctorProfile: DoctorProfile | null;
  /** All doctors in the current clinic (supports multiple doctors per
   * clinic). `doctorProfile` remains a single arbitrary/primary pick
   * (doctors[0]) for backward compatibility with existing pages; use this
   * array when a page needs to list or disambiguate multiple doctors. */
  doctors: DoctorProfile[];
  isLoading: boolean;

  loadClinic: () => Promise<void>;
  loadDoctorProfile: () => Promise<void>;
  updateClinic: (data: Partial<Clinic>) => Promise<void>;
  updateDoctorProfile: (data: Partial<DoctorProfile>) => Promise<void>;
}

function mapDoctorProfileRow(row: Record<string, unknown>): DoctorProfile {
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    phone: (row.phone as string) || '',
    specialty: (row.specialty as string) || '',
    regNumber: (row.reg_number as string) || '',
    signatureBase64: (row.signature_url as string) || null,
    cloudId: row.id as string,
  };
}

// Website equivalent of frontend/src/store/useClinicStore.ts — the mobile
// version caches the doctor's signature to the device filesystem for
// offline-first PDF generation; the website has no such local cache (PDFs
// are server-generated only) so the cloud-stored signatureUrl is the single
// source of truth here.
export const useClinicStore = create<ClinicStore>((set, get) => ({
  clinic: null,
  doctorProfile: null,
  doctors: [],
  isLoading: false,

  loadClinic: async () => {
    try {
      const authUser = useAuthStore.getState().user;
      if (!authUser?.clinicId) return;

      const { data: c, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', authUser.clinicId)
        .maybeSingle();
      if (error || !c) return;

      set({
        clinic: {
          id: c.id,
          name: c.name || '',
          address: c.address || '',
          phone: c.phone || '',
          email: c.email || '',
          logoBase64: c.logo_url || null,
          qrCodeUrl: c.qr_code_url || null,
          ownerId: c.owner_id || '',
        },
      });
    } catch {
      // no clinic yet
    }
  },

  loadDoctorProfile: async () => {
    try {
      const authUser = useAuthStore.getState().user;
      if (!authUser) return;

      if (authUser.role === 'doctor') {
        const { data: u, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();
        if (error || !u) return;

        const profile = mapDoctorProfileRow(u);
        set({ doctorProfile: profile, doctors: [profile] });
      } else if (authUser.role === 'assistant') {
        if (!authUser.clinicId) return;
        const { data: rows, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('clinic_id', authUser.clinicId)
          .eq('role', 'doctor');
        if (error) return;

        const doctors = (rows ?? []).map(mapDoctorProfileRow);
        set({
          doctors,
          doctorProfile: doctors.length > 0 ? doctors[0] : get().doctorProfile,
        });
      }
    } catch {
      // failed to load doctor profile
    }
  },

  updateClinic: async (data) => {
    const current = get().clinic;
    if (!current) return;
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.address !== undefined) payload.address = data.address;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.email !== undefined) payload.email = data.email;
    if (data.logoBase64 !== undefined) payload.logo_url = data.logoBase64;
    if (data.qrCodeUrl !== undefined) payload.qr_code_url = data.qrCodeUrl;

    await supabase.from('clinics').update(payload).eq('id', current.id);
    set({ clinic: { ...current, ...data } });
  },

  updateDoctorProfile: async (data) => {
    const current = get().doctorProfile;
    if (!current) return;
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.specialty !== undefined) payload.specialty = data.specialty;
    if (data.regNumber !== undefined) payload.reg_number = data.regNumber;
    if (data.signatureBase64 !== undefined) payload.signature_url = data.signatureBase64 ?? '';

    if (Object.keys(payload).length > 0) {
      await supabase.from('profiles').update(payload).eq('id', current.id);
    }
    const updated = { ...current, ...data };
    set({
      doctorProfile: updated,
      doctors: get().doctors.map((d) => (d.id === updated.id ? updated : d)),
    });
  },
}));
