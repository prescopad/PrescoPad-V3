import { create } from 'zustand';
import type { Patient, PatientFormData } from '../types/patient.types';
import * as DataService from '../api/dataService';

const PAGE_SIZE = 50;

interface PatientStore {
  patients: Patient[];
  patientsTotal: number;
  searchResults: Patient[];
  selectedPatient: Patient | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  lastError: string | null;

  loadPatients: () => Promise<void>;
  loadMorePatients: () => Promise<void>;
  searchPatients: (query: string) => Promise<void>;
  createPatient: (data: PatientFormData) => Promise<Patient>;
  updatePatient: (id: string, data: Partial<PatientFormData>) => Promise<void>;
  selectPatient: (patient: Patient | null) => void;
  getPatientById: (id: string) => Promise<Patient | null>;
  clearSearch: () => void;
  clearError: () => void;
}

export const usePatientStore = create<PatientStore>((set, get) => ({
  patients: [],
  patientsTotal: 0,
  searchResults: [],
  selectedPatient: null,
  isLoading: false,
  isLoadingMore: false,
  lastError: null,

  loadPatients: async () => {
    set({ isLoading: true });
    try {
      const { patients, total } = await DataService.getPatientsPage(undefined, PAGE_SIZE, 0);
      set({ patients, patientsTotal: total, isLoading: false });
    } catch (e) {
      set({ isLoading: false, lastError: e instanceof Error ? e.message : 'Failed to load patients' });
    }
  },

  loadMorePatients: async () => {
    const { patients, isLoadingMore } = get();
    if (isLoadingMore) return;
    set({ isLoadingMore: true });
    try {
      const { patients: more, total } = await DataService.getPatientsPage(undefined, PAGE_SIZE, patients.length);
      set({ patients: [...patients, ...more], patientsTotal: total, isLoadingMore: false });
    } catch (e) {
      set({ isLoadingMore: false, lastError: e instanceof Error ? e.message : 'Failed to load more patients' });
    }
  },

  searchPatients: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    try {
      const searchResults = await DataService.getPatients(query);
      set({ searchResults: [...searchResults].sort((a, b) => a.name.localeCompare(b.name)) });
    } catch {
      set({ searchResults: [] });
    }
  },

  createPatient: async (data: PatientFormData) => {
    const patient = await DataService.createPatient(data);
    set((state) => ({ patients: [patient, ...state.patients] }));
    return patient;
  },

  updatePatient: async (id: string, data: Partial<PatientFormData>) => {
    const updated = await DataService.updatePatient(id, data);
    if (updated) {
      set((state) => ({
        patients: state.patients.map((p) => (p.id === id ? updated : p)),
        selectedPatient: state.selectedPatient?.id === id ? updated : state.selectedPatient,
      }));
    }
  },

  selectPatient: (patient) => set({ selectedPatient: patient }),

  getPatientById: async (id: string) => {
    return DataService.getPatientById(id);
  },

  clearSearch: () => set({ searchResults: [] }),
  clearError: () => set({ lastError: null }),
}));
