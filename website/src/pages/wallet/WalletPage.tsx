import { useEffect, useState } from 'react';
import { useWalletStore } from '../../store/useWalletStore';
import * as walletService from '../../api/walletService';
import { APP_CONFIG } from '../../constants/config';
import { TransactionType } from '../../types/wallet.types';
import { useToast } from '../../components/toast/ToastContext';
import '../pages.css';
import '../auth/auth.css';

const RECHARGE_OPTIONS = [100, 500, 1000];

export default function WalletPage() {
  const { balance, transactions, transactionsTotal, isLoadingMore, loadBalance, loadTransactions, loadMoreTransactions, recharge } = useWalletStore();
  const toast = useToast();
  const [customAmount, setCustomAmount] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);
  const [autoRefill, setAutoRefill] = useState(false);
  const [autoRefillThreshold, setAutoRefillThreshold] = useState(String(APP_CONFIG.wallet.lowBalanceThreshold));
  const [autoRefillAmount, setAutoRefillAmount] = useState(String(APP_CONFIG.wallet.defaultRechargeAmount));

  useEffect(() => {
    loadBalance();
    loadTransactions();
  }, [loadBalance, loadTransactions]);

  const isLowBalance = balance < APP_CONFIG.wallet.lowBalanceThreshold;

  const handleRecharge = async (amount: number) => {
    if (amount <= 0) return;
    setIsRecharging(true);
    try {
      await recharge(amount);
      await loadTransactions();
      setCustomAmount('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Recharge failed');
    } finally {
      setIsRecharging(false);
    }
  };

  const handleSaveAutoRefill = async () => {
    try {
      const threshold = parseInt(autoRefillThreshold, 10) || APP_CONFIG.wallet.lowBalanceThreshold;
      const amount = parseInt(autoRefillAmount, 10) || APP_CONFIG.wallet.defaultRechargeAmount;
      await walletService.updateAutoRefill(autoRefill, amount, threshold);
      toast.success('Auto-refill settings saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save auto-refill settings');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-container-narrow">
      <div className="page-header">
        <div className="page-title">Wallet</div>
      </div>

      <div className="stat-card" style={{ marginBottom: 20 }}>
        <div className="stat-value" style={{ fontSize: '2rem', color: isLowBalance ? 'var(--color-error)' : 'var(--color-text)' }}>
          {APP_CONFIG.wallet.currencySymbol}{balance.toFixed(2)}
        </div>
        <div className="stat-label">Current balance</div>
        {isLowBalance && <div style={{ color: 'var(--color-error)', fontSize: '0.8125rem', marginTop: 6 }}>Low balance — recharge to keep issuing prescriptions.</div>}
      </div>

      <div className="auth-field">
        <label className="auth-label">Recharge</label>
        <div className="chip-row" style={{ marginBottom: 10 }}>
          {RECHARGE_OPTIONS.map((amt) => (
            <button key={amt} className="secondary-btn" disabled={isRecharging} onClick={() => handleRecharge(amt)}>
              {APP_CONFIG.wallet.currencySymbol}{amt}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="auth-input"
            type="number"
            min={1}
            placeholder="Custom amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
          />
          <button className="primary-btn" disabled={isRecharging || !customAmount} onClick={() => handleRecharge(parseFloat(customAmount))}>
            Recharge
          </button>
        </div>
      </div>

      <div className="auth-field" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 12 }}>
          <input type="checkbox" checked={autoRefill} onChange={(e) => setAutoRefill(e.target.checked)} />
          Enable auto-refill
        </label>
        <div className="auth-form-row">
          <div>
            <label className="auth-label">Refill when below</label>
            <input className="auth-input" type="number" value={autoRefillThreshold} onChange={(e) => setAutoRefillThreshold(e.target.value)} />
          </div>
          <div>
            <label className="auth-label">Refill amount</label>
            <input className="auth-input" type="number" value={autoRefillAmount} onChange={(e) => setAutoRefillAmount(e.target.value)} />
          </div>
        </div>
        <button className="secondary-btn" style={{ marginTop: 10 }} onClick={handleSaveAutoRefill}>Save settings</button>
      </div>

      <div className="page-title" style={{ fontSize: '1.1rem', margin: '24px 0 12px' }}>Transaction history</div>
      <div className="card-list">
        {transactions.length === 0 && <div className="empty-state">No transactions yet</div>}
        {transactions.map((t) => (
          <div key={t.id} className="item-card" style={{ cursor: 'default' }}>
            <div>
              <div className="item-name">{t.description}</div>
              <div className="item-meta">{formatDate(t.createdAt)}</div>
            </div>
            <div style={{ fontWeight: 700, color: t.type === TransactionType.CREDIT ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {t.type === TransactionType.CREDIT ? '+' : '-'}{APP_CONFIG.wallet.currencySymbol}{t.amount}
            </div>
          </div>
        ))}
      </div>
      {transactions.length < transactionsTotal && (
        <button
          type="button"
          className="secondary-btn"
          style={{ marginTop: 12, width: '100%' }}
          disabled={isLoadingMore}
          onClick={loadMoreTransactions}
        >
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
