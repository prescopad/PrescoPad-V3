import { create } from 'zustand';
import { QueueStatus } from '../types/queue.types';
import type { QueueItem } from '../types/queue.types';
import * as DataService from '../api/dataService';
import { APP_CONFIG } from '../constants/config';

interface QueueFilter {
  status?: string;
  todayOnly: boolean;
  date?: string;
}

interface QueueStore {
  queueItems: QueueItem[];
  activeItem: QueueItem | null;
  stats: { total: number; waiting: number; inProgress: number; completed: number };
  isLoading: boolean;
  doctorReady: boolean;
  pollInterval: ReturnType<typeof setInterval> | null;
  filter: QueueFilter;
  lastError: string | null;

  loadQueue: () => Promise<void>;
  loadStats: () => Promise<void>;
  setFilter: (filter: QueueFilter) => void;
  addToQueue: (patientId: string, addedBy: string, notes?: string, consultationType?: 'new' | 'follow_up') => Promise<QueueItem>;
  startConsult: (queueItemId: string) => Promise<void>;
  completeConsult: (queueItemId: string) => Promise<void>;
  cancelQueueItem: (queueItemId: string) => Promise<void>;
  removeFromQueue: (queueItemId: string) => Promise<void>;
  setDoctorReady: (ready: boolean) => void;
  getNextPatient: () => QueueItem | undefined;
  startPolling: () => void;
  stopPolling: () => void;
  clearError: () => void;
}

export const useQueueStore = create<QueueStore>((set, get) => ({
  queueItems: [],
  activeItem: null,
  stats: { total: 0, waiting: 0, inProgress: 0, completed: 0 },
  isLoading: false,
  doctorReady: false,
  pollInterval: null,
  filter: { todayOnly: true },
  lastError: null,

  loadQueue: async () => {
    try {
      const queueItems = await DataService.getTodayQueue();
      const activeItem = queueItems.find((q) => q.status === QueueStatus.IN_PROGRESS) ?? null;
      set({ queueItems, activeItem });
    } catch (e) {
      // Only surface an error when we have no existing data to fall back on —
      // a failed background poll should stay silent, not spam the user.
      if (get().queueItems.length === 0) {
        set({ lastError: e instanceof Error ? e.message : 'Failed to load queue' });
      }
    }
  },

  loadStats: async () => {
    try {
      const stats = await DataService.getTodayStats();
      set({ stats });
    } catch {
      // keep existing stats on error
    }
  },

  setFilter: (filter) => {
    set({ filter });
    get().loadQueue();
    get().loadStats();
  },

  addToQueue: async (patientId, addedBy, notes, consultationType) => {
    const item = await DataService.addToQueue(patientId, addedBy, notes, consultationType);
    await get().loadQueue();
    await get().loadStats();
    return item;
  },

  startConsult: async (queueItemId) => {
    await DataService.updateQueueStatus(queueItemId, QueueStatus.IN_PROGRESS);
    await get().loadQueue();
    await get().loadStats();
  },

  completeConsult: async (queueItemId) => {
    await DataService.updateQueueStatus(queueItemId, QueueStatus.COMPLETED);
    set({ activeItem: null });
    await get().loadQueue();
    await get().loadStats();
  },

  cancelQueueItem: async (queueItemId) => {
    await DataService.updateQueueStatus(queueItemId, QueueStatus.CANCELLED);
    await get().loadQueue();
    await get().loadStats();
  },

  removeFromQueue: async (queueItemId) => {
    await DataService.removeFromQueue(queueItemId);
    await get().loadQueue();
    await get().loadStats();
  },

  setDoctorReady: (ready) => set({ doctorReady: ready }),

  getNextPatient: () => {
    const { queueItems } = get();
    return queueItems.find((q) => q.status === QueueStatus.WAITING);
  },

  startPolling: () => {
    if (get().pollInterval) return;
    get().loadQueue();
    get().loadStats();
    const interval = setInterval(() => {
      get().loadQueue();
      get().loadStats();
    }, APP_CONFIG.polling.queueIntervalMs);
    set({ pollInterval: interval });
  },

  stopPolling: () => {
    const { pollInterval } = get();
    if (pollInterval) {
      clearInterval(pollInterval);
      set({ pollInterval: null });
    }
  },

  clearError: () => set({ lastError: null }),
}));
