import { create } from 'zustand';
import type { Transaction } from '../types/wallet.types';
import * as walletService from '../api/walletService';
import { APP_CONFIG } from '../constants/config';

const PAGE_SIZE = 50;

interface WalletStore {
  balance: number;
  transactions: Transaction[];
  transactionsTotal: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  lastError: string | null;

  loadBalance: () => Promise<void>;
  recharge: (amount: number) => Promise<void>;
  canAfford: () => boolean;
  loadTransactions: () => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
  clearError: () => void;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  balance: 0,
  transactions: [],
  transactionsTotal: 0,
  isLoading: false,
  isLoadingMore: false,
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
      const { transactions, total } = await walletService.fetchTransactions(PAGE_SIZE, 0);
      set({ transactions, transactionsTotal: total });
    } catch (e) {
      set({ lastError: e instanceof Error ? e.message : 'Failed to load transactions' });
    }
  },

  loadMoreTransactions: async () => {
    const { transactions, isLoadingMore } = get();
    if (isLoadingMore) return;
    set({ isLoadingMore: true });
    try {
      const { transactions: more, total } = await walletService.fetchTransactions(PAGE_SIZE, transactions.length);
      set({ transactions: [...transactions, ...more], transactionsTotal: total, isLoadingMore: false });
    } catch (e) {
      set({ isLoadingMore: false, lastError: e instanceof Error ? e.message : 'Failed to load more transactions' });
    }
  },

  clearError: () => set({ lastError: null }),
}));
