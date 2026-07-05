import { create } from 'zustand';
import type { Transaction } from '../types/wallet.types';
import * as walletService from '../api/walletService';
import { APP_CONFIG } from '../constants/config';

interface WalletStore {
  balance: number;
  transactions: Transaction[];
  isLoading: boolean;
  lastError: string | null;

  loadBalance: () => Promise<void>;
  recharge: (amount: number) => Promise<void>;
  canAfford: () => boolean;
  loadTransactions: () => Promise<void>;
  clearError: () => void;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  balance: 0,
  transactions: [],
  isLoading: false,
  lastError: null,

  loadBalance: async () => {
    set({ isLoading: true });
    try {
      const balance = await walletService.fetchWalletBalance();
      set({ balance, isLoading: false });
    } catch (e) {
      set({ isLoading: false, lastError: e instanceof Error ? e.message : 'Failed to load wallet balance' });
    }
  },

  recharge: async (amount: number) => {
    const result = await walletService.rechargeWallet(amount);
    set({ balance: result.balance, lastError: null });
    await get().loadBalance();
  },

  canAfford: () => get().balance >= APP_CONFIG.wallet.costPerPrescription,

  loadTransactions: async () => {
    try {
      const transactions = await walletService.fetchTransactions();
      set({ transactions });
    } catch {
      // keep existing
    }
  },

  clearError: () => set({ lastError: null }),
}));
