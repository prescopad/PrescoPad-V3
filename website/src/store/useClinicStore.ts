import { create } from 'zustand';
import type { Clinic, DoctorProfile } from '../types/clinic.types';
import api from '../api/client';
import { useAuthStore } from './useAuthStore';

interface ClinicStore {
  clinic: Clinic | null;
  doctorProfile: DoctorProfile | null;
  isLoading: boolean;

  loadClinic: () => Promise<void>;
  loadDoctorProfile: () => Promise<void>;
  updateClinic: (data: Partial<Clinic>) => Promise<void>;
  updateDoctorProfile: (data: Partial<DoctorProfile>) => Promise<void>;
}

// Website equivalent of frontend/src/store/useClinicStore.ts — the mobile
// version caches the doctor's signature to the device filesystem for
// offline-first PDF generation; the website has no such local cache (PDFs
// are server-generated only) so the cloud-stored signatureUrl is the single
// source of truth here.
export const useClinicStore = create<ClinicStore>((set, get) => ({
  clinic: null,
  doctorProfile: null,
  isLoading: false,

  loadClinic: async () => {
    try {
      const res = await api.get('/clinic');
      const c = res.data.clinic;
      if (c) {
        set({
          clinic: {
            id: c.id,
            name: c.name || '',
            address: c.address || '',
            phone: c.phone || '',
            email: c.email || '',
            logoBase64: c.logo_url || c.logoBase64 || null,
            qrCodeUrl: c.qr_code_url || c.qrCodeUrl || null,
            ownerId: c.owner_id || '',
          },
        });
      }
    } catch {
      // no clinic yet
    }
  },

  loadDoctorProfile: async () => {
    try {
      const authUser = useAuthStore.getState().user;
      if (!authUser) return;

      if (authUser.role === 'doctor') {
        const res = await api.get('/auth/me');
        const u = res.data.user;
        if (u) {
          set({
            doctorProfile: {
              id: u.id,
              name: u.name || '',
              phone: u.phone || '',
              specialty: u.specialty || '',
              regNumber: u.reg_number || u.regNumber || '',
              signatureBase64: u.signature_url || u.signatureUrl || null,
              cloudId: u.id,
            },
          });
        }
      } else if (authUser.role === 'assistant') {
        if (!authUser.clinicId) return;
        const res = await api.get(`/clinic/${authUser.clinicId}/doctors`);
        const doctors = res.data.doctors ?? [];
        if (doctors.length > 0) {
          const doc = doctors[0];
          set({
            doctorProfile: {
              id: doc.id,
              name: doc.name || '',
              phone: doc.phone || '',
              specialty: doc.specialty || '',
              regNumber: doc.regNumber || doc.reg_number || '',
              signatureBase64: doc.signatureUrl || doc.signature_url || doc.signature || null,
              cloudId: doc.id,
            },
          });
        }
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

    await api.put('/clinic', payload);
    set({ clinic: { ...current, ...data } });
  },

  updateDoctorProfile: async (data) => {
    const current = get().doctorProfile;
    if (!current) return;
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.specialty !== undefined) payload.specialty = data.specialty;
    if (data.regNumber !== undefined) payload.regNumber = data.regNumber;
    if (data.signatureBase64 !== undefined) payload.signatureUrl = data.signatureBase64 ?? '';

    if (Object.keys(payload).length > 0) {
      await api.put('/auth/profile', payload);
    }
    set({ doctorProfile: { ...current, ...data } });
  },
}));
