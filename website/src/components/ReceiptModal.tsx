import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { numberToWords } from '../utils/numberToWords';
import Portal from './Portal';
import { CloseIcon } from './icons';
import './modal.css';

interface ReceiptModalProps {
  patientName: string;
  initialAmount?: number;
  onClose: () => void;
}

export default function ReceiptModal({ patientName, initialAmount = 500, onClose }: ReceiptModalProps) {
  const user = useAuthStore((s) => s.user);
  const [receiptNo, setReceiptNo] = useState(`REC-${Date.now().toString().slice(-5)}`);
  const [amountStr, setAmountStr] = useState(initialAmount.toString());
  const [paymentMode, setPaymentMode] = useState<'cash' | 'cheque' | 'online'>('cash');
  const [txnRef, setTxnRef] = useState('');
  const [towards, setTowards] = useState('Consultation & Treatment Fee');
  const [dateStr] = useState(new Date().toISOString().split('T')[0]);

  const numAmount = parseFloat(amountStr) || 0;
  const wordsAmount = numberToWords(numAmount);

  const handlePrint = () => {
    window.print();
    onClose();
  };

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-dialog" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">🧾 Payment Receipt</h3>
            <button type="button" className="modal-close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="form-label">Receipt No.</label>
                <input className="form-input" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Date</label>
                <input className="form-input" value={dateStr} disabled />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Received With Thanks From (Patient)</label>
                <input className="form-input" value={patientName} disabled />
              </div>
              <div>
                <label className="form-label">Amount (₹)</label>
                <input className="form-input" type="number" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Payment Mode</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['cash', 'online', 'cheque'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`filter-btn ${paymentMode === m ? 'active' : ''}`}
                      onClick={() => setPaymentMode(m)}
                      style={{ flex: 1, textTransform: 'uppercase', fontSize: '0.75rem' }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {paymentMode !== 'cash' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Cheque / Ref Txn No.</label>
                  <input className="form-input" value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder="Txn Ref No" />
                </div>
              )}
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Towards / Purpose</label>
                <input className="form-input" value={towards} onChange={(e) => setTowards(e.target.value)} />
              </div>
            </div>

            {/* Photo Format Receipt Preview */}
            <div style={{ background: '#fafcff', border: '2px solid var(--color-primary)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
              <h3 style={{ textAlign: 'center', color: 'var(--color-primary)', margin: '0 0 4px' }}>KRISHNAI CLINIC</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginBottom: 16, fontSize: '0.85rem', fontWeight: 700 }}>
                <span>No. {receiptNo}</span>
                <span>Date: {dateStr}</span>
              </div>

              <div style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
                <div>Received with thanks from Mr. / Mrs. <strong>{patientName}</strong></div>
                <div>the Sum of Rupees <strong>{wordsAmount}</strong></div>
                <div>Only by <strong>{paymentMode.toUpperCase()}</strong> {txnRef ? `(Ref: ${txnRef})` : ''}</div>
                <div>Drawn on / Towards <strong>{towards}</strong></div>
              </div>

              <div style={{ marginTop: 16, display: 'inline-block', border: '2px solid var(--color-primary)', padding: '6px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary-surface)' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>₹ {numAmount.toFixed(2)}</span>
              </div>

              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Payee's Signature</div>
                <div style={{ fontWeight: 700 }}>For Dr. {user?.name || 'Doctor'}</div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
            <button type="button" className="primary-btn" onClick={handlePrint}>Print / Issue Receipt</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
