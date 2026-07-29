export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

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
  vitals?: any;
  isMlc?: boolean;
  mlcNotes?: string;
  createdAt: string;
  updatedAt: string;
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
  isMlc?: boolean;
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
