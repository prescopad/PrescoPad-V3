import { create } from 'zustand';
import { QueueStatus } from '../types/queue.types';
import type { QueueItem } from '../types/queue.types';
import * as DataService from '../api/dataService';
import { APP_CONFIG } from '../constants/config';
import { supabase } from '../api/supabase';
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
  lastError: string | null;

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
  clearError: () => void;
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
  lastError: null,

  loadQueue: async () => {
    try {
      const queueItems = await DataService.getTodayQueue();
      const activeItem = queueItems.find((q) => q.status === QueueStatus.IN_PROGRESS) ?? null;
      set({ queueItems, activeItem });
    } catch (e) {
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
    } catch (e) {
      if (get().queueItems.length === 0) {
        set({ lastError: e instanceof Error ? e.message : 'Failed to load queue' });
      }
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
    }, APP_CONFIG.polling.queueIntervalMs);

    // 2. Real-time Supabase WebSocket Subscription for Sub-Second Sync
    let channel: RealtimeChannel | null = null;
    const clinicId = useAuthStore.getState().user?.clinicId;
    if (clinicId) {
      channel = supabase
        .channel(`web_queue_sync_${clinicId}`)
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
    }

    set({ pollInterval: interval, realtimeChannel: channel });
  },

  stopPolling: () => {
    const { pollInterval, realtimeChannel } = get();
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
    }
    set({ pollInterval: null, realtimeChannel: null });
  },

  clearError: () => set({ lastError: null }),
}));
