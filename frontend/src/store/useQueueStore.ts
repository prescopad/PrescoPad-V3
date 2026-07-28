import { create } from 'zustand';
import { QueueItem, QueueStatus } from '../types/queue.types';
import * as DataService from '../services/dataService';
import { supabase } from '../services/supabase';
import { useAuthStore } from './useAuthStore';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  realtimeChannel: RealtimeChannel | null;
  filter: QueueFilter;

  loadQueue: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadQueueFiltered: (filter?: QueueFilter) => Promise<void>;
  loadStatsFiltered: (todayOnly?: boolean, date?: string) => Promise<void>;
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
}

export const useQueueStore = create<QueueStore>((set, get) => ({
  queueItems: [],
  activeItem: null,
  stats: { total: 0, waiting: 0, inProgress: 0, completed: 0 },
  isLoading: false,
  doctorReady: false,
  pollInterval: null,
  realtimeChannel: null,
  filter: { todayOnly: true },

  loadQueue: async () => {
    try {
      const queueItems = await DataService.getTodayQueue();
      const activeItem = queueItems.find((q) => q.status === QueueStatus.IN_PROGRESS) ?? null;
      set({ queueItems, activeItem });
    } catch {
      // keep existing data on error
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

  loadQueueFiltered: async (filterOverride) => {
    try {
      const f = filterOverride || get().filter;
      const queueItems = await DataService.getQueueFiltered({
        status: f.status,
        todayOnly: f.todayOnly,
        date: f.date,
      });
      const activeItem = queueItems.find((q) => q.status === QueueStatus.IN_PROGRESS) ?? null;
      set({ queueItems, activeItem });
    } catch {
      // keep existing data on error
    }
  },

  loadStatsFiltered: async (todayOnly, date) => {
    try {
      const t = todayOnly ?? get().filter.todayOnly;
      const d = date ?? get().filter.date;
      const stats = await DataService.getQueueStatsFiltered(t, d);
      set({ stats });
    } catch {
      // keep existing stats on error
    }
  },

  setFilter: (filter) => {
    set({ filter });
    get().loadQueueFiltered(filter);
    get().loadStatsFiltered(filter.todayOnly, filter.date);
  },

  addToQueue: async (patientId, addedBy, notes, consultationType) => {
    const item = await DataService.addToQueue(patientId, addedBy, notes, consultationType);
    await get().loadQueueFiltered();
    await get().loadStatsFiltered();
    return item;
  },

  startConsult: async (queueItemId) => {
    await DataService.updateQueueStatus(queueItemId, QueueStatus.IN_PROGRESS);
    await get().loadQueueFiltered();
    await get().loadStatsFiltered();
  },

  completeConsult: async (queueItemId) => {
    await DataService.updateQueueStatus(queueItemId, QueueStatus.COMPLETED);
    set({ activeItem: null });
    await get().loadQueueFiltered();
    await get().loadStatsFiltered();
  },

  cancelQueueItem: async (queueItemId) => {
    await DataService.updateQueueStatus(queueItemId, QueueStatus.CANCELLED);
    await get().loadQueueFiltered();
    await get().loadStatsFiltered();
  },

  removeFromQueue: async (queueItemId) => {
    await DataService.removeFromQueue(queueItemId);
    await get().loadQueueFiltered();
    await get().loadStatsFiltered();
  },

  setDoctorReady: (ready) => set({ doctorReady: ready }),

  getNextPatient: () => {
    const { queueItems } = get();
    return queueItems.find((q) => q.status === QueueStatus.WAITING);
  },

  startPolling: () => {
    if (get().pollInterval) return;

    // Trigger initial load
    get().loadQueueFiltered();
    get().loadStatsFiltered();

    // 1. Periodic Heartbeat / Fallback Polling
    const interval = setInterval(() => {
      get().loadQueueFiltered();
      get().loadStatsFiltered();
    }, 10_000);

    // 2. Real-time Supabase WebSocket Subscription for Sub-Second Sync
    let channel: RealtimeChannel | null = null;
    const clinicId = useAuthStore.getState().user?.clinicId;
    if (clinicId) {
      try {
        channel = supabase
          .channel(`app_queue_sync_${clinicId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'queue',
              filter: `clinic_id=eq.${clinicId}`,
            },
            () => {
              get().loadQueueFiltered();
              get().loadStatsFiltered();
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Supabase realtime channel initialization warning:', e);
      }
    }

    set({ pollInterval: interval, realtimeChannel: channel });
  },

  stopPolling: () => {
    const { pollInterval, realtimeChannel } = get();
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    if (realtimeChannel) {
      try {
        supabase.removeChannel(realtimeChannel);
      } catch (e) {
        console.warn('Error removing Supabase channel:', e);
      }
    }
    set({ pollInterval: null, realtimeChannel: null });
  },
}));
