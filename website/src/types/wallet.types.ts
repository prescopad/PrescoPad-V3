export const TransactionType = {
  CREDIT: 'credit',
  DEBIT: 'debit',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  autoRefill: boolean;
  autoRefillAmount: number;
  autoRefillThreshold: number;
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceId: string;
  createdAt: string;
}
