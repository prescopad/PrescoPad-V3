import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import SecureStore from '../utils/secureStore';
import { Clinic, DoctorProfile } from '../types/clinic.types';
import { supabase } from '../services/supabase';
import { useAuthStore } from './useAuthStore';

const SIG_FILE_URI = `${FileSystem.documentDirectory}doctor_signature.svg`;

async function writeSigFile(content: string): Promise<string> {
  await FileSystem.writeAsStringAsync(SIG_FILE_URI, content, { encoding: FileSystem.EncodingType.UTF8 });
  return SIG_FILE_URI;
}

async function readSigFile(uri: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  } catch {
    return null;
  }
}

interface ClinicStore {
  clinic: Clinic | null;
  doctorProfile: DoctorProfile | null;
  /** All doctors in the current clinic (supports multiple doctors per clinic).
   * `doctorProfile` remains a single arbitrary/primary pick (doctors[0]) for
   * backward compatibility with existing screens; use this array when a
   * screen needs to list or disambiguate between multiple doctors. */
  doctors: DoctorProfile[];
  isLoading: boolean;

  loadClinic: () => Promise<void>;
  loadDoctorProfile: () => Promise<void>;
  updateClinic: (data: Partial<Clinic>) => Promise<void>;
  updateDoctorProfile: (data: Partial<DoctorProfile>) => Promise<void>;
  saveSignature: (signatureBase64: string) => Promise<void>;
  setClinic: (clinic: Clinic) => void;
  setDoctorProfile: (profile: DoctorProfile) => void;
}

/** Map a raw `profiles` row (snake_case) to the frontend `DoctorProfile` shape. */
function mapDoctorProfileRow(row: Record<string, unknown>): DoctorProfile {
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    phone: (row.phone as string) || '',
    specialty: (row.specialty as string) || '',
    regNumber: (row.reg_number as string) || (row.regNumber as string) || '',
    signatureBase64: (row.signature_url as string) || (row.signatureUrl as string) || null,
    cloudId: row.id as string,
  };
}

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
          logoBase64: c.logo_url || c.logoBase64 || null,
          qrCodeUrl: c.qr_code_url || c.qrCodeUrl || null,
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

        const localRef = await SecureStore.getItemAsync('doctorSignature');
        // localRef may be a file:// URI (new) or a raw SVG path (legacy)
        let localSig: string | null = null;
        if (localRef) {
          localSig = localRef.startsWith('file://') ? await readSigFile(localRef) : localRef;
        }
        // Fall back to cloud-stored signature if local cache is missing
        const cloudSig = u.signature_url || null;
        const signatureBase64 = localSig || cloudSig;
        const profile: DoctorProfile = {
          id: u.id,
          name: u.name || '',
          phone: u.phone || '',
          specialty: u.specialty || '',
          regNumber: u.reg_number || '',
          signatureBase64: signatureBase64 || null,
          cloudId: u.id,
        };
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

    // Update cloud fields (name, specialty, regNumber)
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.specialty !== undefined) payload.specialty = data.specialty;
    if (data.regNumber !== undefined) payload.reg_number = data.regNumber;

    if (Object.keys(payload).length > 0) {
      await supabase.from('profiles').update(payload).eq('id', current.id);
    }

    // Save signature: write to filesystem (no size limit), store URI in SecureStore, sync to cloud
    if (data.signatureBase64 !== undefined) {
      if (data.signatureBase64) {
        const fileUri = await writeSigFile(data.signatureBase64);
        await SecureStore.setItemAsync('doctorSignature', fileUri);
        await supabase.from('profiles').update({ signature_url: data.signatureBase64 }).eq('id', current.id);
      } else {
        await SecureStore.deleteItemAsync('doctorSignature');
        try { await FileSystem.deleteAsync(SIG_FILE_URI, { idempotent: true }); } catch {}
        await supabase.from('profiles').update({ signature_url: '' }).eq('id', current.id);
      }
    }

    const updated = { ...current, ...data };
    set({
      doctorProfile: updated,
      doctors: get().doctors.map((d) => (d.id === updated.id ? updated : d)),
    });
  },

  saveSignature: async (signatureBase64: string) => {
    const current = get().doctorProfile;
    if (!current) return;
    const fileUri = await writeSigFile(signatureBase64);
    await SecureStore.setItemAsync('doctorSignature', fileUri);
    await supabase.from('profiles').update({ signature_url: signatureBase64 }).eq('id', current.id);
    const updated = { ...current, signatureBase64 };
    set({
      doctorProfile: updated,
      doctors: get().doctors.map((d) => (d.id === updated.id ? updated : d)),
    });
  },

  setClinic: (clinic) => set({ clinic }),
  setDoctorProfile: (profile) => set({ doctorProfile: profile }),
}));
