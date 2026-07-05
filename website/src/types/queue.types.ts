import type { Patient } from './patient.types';

export const QueueStatus = {
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type QueueStatus = (typeof QueueStatus)[keyof typeof QueueStatus];

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
}
