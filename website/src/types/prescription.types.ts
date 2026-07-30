export const PrescriptionStatus = {
  DRAFT: 'draft',
  FINALIZED: 'finalized',
} as const;
export type PrescriptionStatus = (typeof PrescriptionStatus)[keyof typeof PrescriptionStatus];

export interface Vitals {
  bp?: string;
  pulse?: string;
  temp?: string;
  spo2?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  bloodSugar?: string;
}

export interface SymptomDetail {
  name: string;
  severity?: 'Mild' | 'Moderate' | 'High';
  duration?: string;
  pattern?: string;
}

export interface PrescriptionMedicine {
  id: string;
  prescriptionId: string;
  medicineName: string;
  type: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  notes: string;
}

export interface PrescriptionLabTest {
  id: string;
  prescriptionId: string;
  testName: string;
  category: string;
  notes: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  consultationType?: 'new' | 'follow_up';
  doctorId: string;
  doctorName?: string;

  vitals?: Vitals;
  isMlc?: boolean;
  mlcNotes?: string;

  diagnosis: string;
  advice: string;
  followUpDate: string | null;
  symptoms: string[];
  symptomsDetail?: SymptomDetail[];
  referredTo?: string;

  pdfPath: string | null;
  pdfHash: string | null;
  signature: string | null;
  status: PrescriptionStatus;
  chargeAmount: number | null;
  medicines: PrescriptionMedicine[];
  labTests: PrescriptionLabTest[];
  attachCertificate?: AttachCertificate;
  attachReceipt?: AttachReceipt;
  createdAt: string;
}


export interface AttachCertificate {
  restDays: string;
  startDate: string;
  fitnessStatus: 'fit' | 'unfit';
  diagnosis?: string;
}

export interface AttachReceipt {
  amount: number;
  paymentMode: 'cash' | 'online' | 'cheque';
  towards?: string;
}

export interface PrescriptionDraft {
  patientId: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientWeight: string;
  patientPhone: string;
  consultationType?: 'new' | 'follow_up';

  vitals?: Vitals;
  isMlc?: boolean;
  mlcNotes?: string;

  diagnosis: string;
  advice: string;
  followUpDate: string;
  symptoms: string[];
  symptomsDetail?: SymptomDetail[];
  referredTo?: string;

  medicines: Omit<PrescriptionMedicine, 'id' | 'prescriptionId'>[];
  labTests: Omit<PrescriptionLabTest, 'id' | 'prescriptionId'>[];

  // Optional PDF attachments
  attachCertificate?: AttachCertificate;
  attachReceipt?: AttachReceipt;
}


export interface PrescriptionTemplate {
  id: string;
  name: string;

  diagnosis: string;
  advice: string;
  symptoms: string[];
  symptomsDetail?: SymptomDetail[];
  referredTo?: string;
  medicines: Omit<PrescriptionMedicine, 'id' | 'prescriptionId'>[];
  labTests: Omit<PrescriptionLabTest, 'id' | 'prescriptionId'>[];
  createdAt: string;
}

export interface MedicalCertificate {
  id: string;
  clinicId: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientAddress?: string;
  diagnosis: string;
  restDays: number;
  startDate: string;
  endDate: string;
  fitnessStatus: 'fit' | 'unfit' | 'light_duty';
  reason?: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  clinicId: string;
  doctorId: string;
  patientId?: string;
  patientName: string;
  amount: number;
  amountInWords: string;
  paymentMode: 'cash' | 'cheque' | 'online';
  transactionRef?: string;
  dated?: string;
  drawnOn?: string;
  towards: string;
  createdAt: string;
}
