import { create } from 'zustand';
import TokenStore from '../utils/tokenStore';
import { UserRole } from '../types/auth.types';
import type { User, AuthState } from '../types/auth.types';
import { useQueueStore } from './useQueueStore';

interface AuthStore extends AuthState {
  setUser: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user, accessToken, refreshToken) => {
    TokenStore.setItem('accessToken', accessToken);
    TokenStore.setItem('refreshToken', refreshToken);
    TokenStore.setItem('user', JSON.stringify(user));
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
    TokenStore.removeItem('accessToken');
    TokenStore.removeItem('refreshToken');
    TokenStore.removeItem('user');
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
    try {
      const accessToken = TokenStore.getItem('accessToken');
      const refreshToken = TokenStore.getItem('refreshToken');
      const userJson = TokenStore.getItem('user');

      if (accessToken && userJson) {
        const user = JSON.parse(userJson) as User;
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

export function useIsDoctor(): boolean {
  return useAuthStore((s) => s.user?.role === UserRole.DOCTOR);
}

export function useIsAssistant(): boolean {
  return useAuthStore((s) => s.user?.role === UserRole.ASSISTANT);
}
