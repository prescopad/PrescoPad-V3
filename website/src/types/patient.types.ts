export const Gender = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  weight: number | null;
  phone: string;
  address: string;
  bloodGroup: string;
  allergies: string;
  createdAt: string;
  updatedAt: string;
  /** Consolidated one-paragraph case summary, regenerated whenever a
   * prescription is finalized — replaces the old per-prescription
   * casebookEntries[] timeline. */
  caseSummary?: string | null;
  caseSummaryUpdatedAt?: string | null;
}

export interface PatientFormData {
  name: string;
  age: string;
  gender: Gender;
  weight: string;
  phone: string;
  address: string;
  bloodGroup: string;
  allergies: string;
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
