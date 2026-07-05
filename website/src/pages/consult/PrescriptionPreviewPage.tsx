import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePrescriptionStore } from '../../store/usePrescriptionStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useQueueStore } from '../../store/useQueueStore';
import * as DataService from '../../api/dataService';
import * as walletService from '../../api/walletService';
import { hashString } from '../../utils/cryptoUtil';
import SignaturePad from '../../components/SignaturePad';
import '../pages.css';
import '../../components/modal.css';
import '../auth/auth.css';

export default function PrescriptionPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentPrescription, loadPrescription, finalizePrescription, resetDraft, queueItemId } = usePrescriptionStore();
  const { balance, canAfford, loadBalance } = useWalletStore();
  const completeConsult = useQueueStore((s) => s.completeConsult);

  const [isLoading, setIsLoading] = useState(true);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([loadPrescription(id), loadBalance()]).then(() => setIsLoading(false));
  }, [id, loadPrescription, loadBalance]);

  if (isLoading) return <div>Loading...</div>;
  if (!currentPrescription) return <div>Prescription not found.</div>;

  const rx = currentPrescription;

  const handleSignAndIssue = () => {
    if (!canAfford()) {
      alert(`Insufficient wallet balance (₹${balance}). Please recharge before issuing a prescription.`);
      navigate('/wallet');
      return;
    }
    setShowSignaturePad(true);
  };

  const handleSignatureConfirmed = async (signature: string) => {
    setShowSignaturePad(false);
    setIsFinalizing(true);
    try {
      const pdfHash = await hashString(`${rx.id}:${signature}`);
      await finalizePrescription(rx.id, signature, '', pdfHash);
      if (queueItemId) {
        await completeConsult(queueItemId);
      }
      setShowPaymentModal(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to finalize prescription');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleRecordPayment = async (method: 'cash' | 'online') => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount > 0) {
      walletService.recordConsultationPayment(rx.id, amount, method).catch(() => {});
    }
    setShowPaymentModal(false);
    resetDraft();
    navigate(`/prescriptions/${rx.id}/success`);
  };

  const isFinalized = rx.status === 'finalized';

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div className="page-title">Prescription Preview</div>
      </div>

      <div className="item-card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div className="item-name">{rx.patientName}</div>
          <div className="item-meta">{rx.patientAge} yrs · {rx.patientGender} · {rx.patientPhone}</div>
        </div>

        {rx.diagnosis && <div><strong>Diagnosis:</strong> {rx.diagnosis}</div>}
        {rx.symptoms.length > 0 && <div><strong>Symptoms:</strong> {rx.symptoms.join(', ')}</div>}

        {rx.medicines.length > 0 && (
          <div>
            <strong>Medicines:</strong>
            <ul>
              {rx.medicines.map((m, i) => (
                <li key={i}>{m.medicineName} {m.dosage} — {[m.frequency, m.duration, m.timing].filter(Boolean).join(', ')}</li>
              ))}
            </ul>
          </div>
        )}

        {rx.labTests.length > 0 && (
          <div>
            <strong>Lab tests:</strong>
            <ul>
              {rx.labTests.map((t, i) => <li key={i}>{t.testName}</li>)}
            </ul>
          </div>
        )}

        {rx.advice && <div><strong>Advice:</strong> {rx.advice}</div>}
        {rx.referredTo && <div><strong>Referred to:</strong> {rx.referredTo}</div>}
        {rx.followUpDate && <div><strong>Follow-up:</strong> {rx.followUpDate}</div>}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        {!isFinalized ? (
          <button className="primary-btn" disabled={isFinalizing} onClick={handleSignAndIssue}>
            {isFinalizing ? 'Finalizing...' : 'Sign & Issue'}
          </button>
        ) : (
          <>
            <a className="primary-btn" href={DataService.getPrescriptionPdfUrl(rx.id)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              View / Download PDF
            </a>
            <button className="secondary-btn" onClick={() => navigate('/queue')}>Back to queue</button>
          </>
        )}
      </div>

      {showSignaturePad && (
        <div className="modal-backdrop" onClick={() => setShowSignaturePad(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div className="modal-title">Draw your signature</div>
              <button className="modal-close" onClick={() => setShowSignaturePad(false)}>✕</button>
            </div>
            <div className="modal-body">
              <SignaturePad onConfirm={handleSignatureConfirmed} onCancel={() => setShowSignaturePad(false)} />
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Record consultation payment</div>
            </div>
            <div className="modal-body">
              <label className="auth-label">Amount received (optional)</label>
              <input
                className="auth-input"
                type="number"
                min={0}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => handleRecordPayment('cash')}>Cash</button>
              <button className="primary-btn" onClick={() => handleRecordPayment('online')}>Online</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
