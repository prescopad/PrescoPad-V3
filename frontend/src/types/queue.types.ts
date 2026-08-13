import { Patient } from './patient.types';

export enum QueueStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface QueueItemPayment {
  id: string;
  amount: number;
  method: 'cash' | 'online';
  createdAt: string;
}

export interface QueueItem {
  id: string;
  patientId: string;
  patient?: Patient;
  status: QueueStatus;
  addedBy: string;
  notes: string;
  addedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  tokenNumber: number;
  consultationType?: 'new' | 'follow_up';
  prescriptionId?: string;
  chargeAmount?: number | null;
  payment?: QueueItemPayment | null;
  paymentStatus?: 'paid' | 'unpaid' | 'none';
}
