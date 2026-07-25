import { create } from 'zustand';
import { supabase } from '../api/supabase';
import { getMe, signOut as authSignOut } from '../api/authService';
import { UserRole } from '../types/auth.types';
import type { User, AuthState } from '../types/auth.types';
import { useQueueStore } from './useQueueStore';

interface AuthStore extends AuthState {
  setUser: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  restoreSession: () => void;
}

// Supabase-js persists and auto-refreshes the session itself (see
// api/supabase.ts), so this store no longer manages tokens manually — it
// just mirrors whatever the current Supabase session/profile is.
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user, accessToken, refreshToken) => {
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    useQueueStore.getState().stopPolling();
    authSignOut().catch(() => {});
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  restoreSession: () => {
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!data.session) {
          set({ isLoading: false });
          return;
        }
        try {
          const user = await getMe();
          set({
            user,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      })
      .catch(() => set({ isLoading: false }));
  },
}));

export function useIsDoctor(): boolean {
  return useAuthStore((s) => s.user?.role === UserRole.DOCTOR);
}

export function useIsAssistant(): boolean {
  return useAuthStore((s) => s.user?.role === UserRole.ASSISTANT);
}
