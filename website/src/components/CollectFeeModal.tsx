import { useState } from 'react';
import Portal from './Portal';
import { CloseIcon } from './icons';
import { recordConsultationPayment } from '../api/paymentService';
import { useToast } from './toast/ToastContext';
import './modal.css';
import '../pages/auth/auth.css';

interface Props {
  patientName: string;
  prescriptionId?: string;
  initialAmount?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CollectFeeModal({
  patientName,
  prescriptionId,
  initialAmount,
  onClose,
  onSuccess,
}: Props) {
  const toast = useToast();
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '500');
  const [method, setMethod] = useState<'cash' | 'online'>('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid fee amount.');
      return;
    }

    if (!prescriptionId) {
      toast.error('No prescription found for this visit to record payment against.');
      return;
    }

    setIsSubmitting(true);
    try {
      await recordConsultationPayment(prescriptionId, parsedAmount, method, notes.trim() || undefined);
      toast.success(`Fee of ₹${parsedAmount} collected via ${method.toUpperCase()}!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record fee payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <form
          className="modal-dialog"
          style={{ maxWidth: 440 }}
          onSubmit={handleSubmit}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              💵 Collect Consultation Fee
            </span>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--color-surface-hover)', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Patient</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)' }}>{patientName}</span>
            </div>

            <div className="auth-field">
              <label className="auth-label">Fee Amount (₹)</label>
              <input
                className="auth-input"
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (e.g. 500)"
                autoFocus
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  className={`tab-btn ${method === 'cash' ? 'active' : ''}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontWeight: 700,
                    border: method === 'cash' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  }}
                  onClick={() => setMethod('cash')}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  className={`tab-btn ${method === 'online' ? 'active' : ''}`}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontWeight: 700,
                    border: method === 'online' ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  }}
                  onClick={() => setMethod('online')}
                >
                  📱 Online / UPI
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Notes / Txn Reference (Optional)</label>
              <input
                className="auth-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. UPI Ref / Receipt note"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '12px 20px' }}>
            <button type="button" className="secondary-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              style={{ background: '#059669', borderColor: '#059669', minWidth: 140 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : '✓ Collect & Mark Paid'}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
