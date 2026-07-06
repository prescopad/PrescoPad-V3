import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as DataService from '../../api/dataService';
import { useWalletStore } from '../../store/useWalletStore';
import { usePrescriptionStore } from '../../store/usePrescriptionStore';
import PrescriptionActions from '../../components/PrescriptionActions';
import { useToast } from '../../components/toast/ToastContext';
import type { Prescription } from '../../types/prescription.types';
import './rxSuccess.css';
import '../../pages/pages.css';

export default function RxSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { balance, loadBalance } = useWalletStore();
  const resetDraft = usePrescriptionStore((s) => s.resetDraft);

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset any draft state since the prescription is successfully completed
    resetDraft();

    // Load fresh wallet balance
    loadBalance().catch(() => {});

    if (id) {
      setIsLoading(true);
      DataService.getPrescriptionById(id)
        .then((rx) => {
          if (rx) setPrescription(rx);
        })
        .catch(() => {
          toast.error('Could not load prescription details for sharing.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadBalance, resetDraft]);

  const handleBackToQueue = () => {
    navigate('/queue');
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading prescription success details...</div>
      </div>
    );
  }

  return (
    <div className="success-container">
      <div className="success-circle">
        <div className="success-inner-circle">✓</div>
      </div>

      <h1 className="success-title">Prescription Issued</h1>

      {id && <div className="success-rx-id">{id}</div>}

      {prescription && (
        <div className="success-patient-info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <strong>{prescription.patientName}</strong>
        </div>
      )}

      <div className="success-balance-card">
        <div className="success-balance-icon">💰</div>
        <div className="success-balance-info">
          <span className="success-balance-label">Wallet Balance Updated</span>
          <strong className="success-balance-amount">₹{balance.toFixed(2)}</strong>
        </div>
      </div>

      <div className="success-divider" />

      {prescription && (
        <div className="success-share-section">
          <div className="success-share-title">Share Prescription</div>
          <PrescriptionActions prescription={prescription} />
        </div>
      )}

      <button className="primary-btn" onClick={handleBackToQueue} style={{ width: '100%', marginTop: 8 }}>
        Back to Queue
      </button>
    </div>
  );
}
