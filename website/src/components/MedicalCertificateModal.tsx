import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import Portal from './Portal';
import { CloseIcon } from './icons';
import './modal.css';

interface MedicalCertificateModalProps {
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  patientAddress?: string;
  initialDiagnosis?: string;
  onClose: () => void;
}

export default function MedicalCertificateModal({
  patientName,
  patientAge,
  patientGender,
  initialDiagnosis = '',
  onClose,
}: MedicalCertificateModalProps) {
  const user = useAuthStore((s) => s.user);
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis || 'Acute Illness');
  const [restDays, setRestDays] = useState('3');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [fitnessStatus, setFitnessStatus] = useState<'fit' | 'unfit' | 'light_duty'>('unfit');

  const handlePrint = () => {
    window.print();
    onClose();
  };

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-dialog" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">📄 Medical Certificate</h3>
            <button type="button" className="modal-close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Patient Name</label>
                <input className="form-input" value={patientName} disabled />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Diagnosis</label>
                <input className="form-input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
              </div>

              <div>
                <label className="form-label">Rest Days</label>
                <input className="form-input" type="number" value={restDays} onChange={(e) => setRestDays(e.target.value)} />
              </div>

              <div>
                <label className="form-label">Start Date</label>
                <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Fitness Status</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className={`filter-btn ${fitnessStatus === 'unfit' ? 'active' : ''}`}
                    onClick={() => setFitnessStatus('unfit')}
                    style={{ flex: 1 }}
                  >
                    Unfit for Duty
                  </button>
                  <button
                    type="button"
                    className={`filter-btn ${fitnessStatus === 'fit' ? 'active' : ''}`}
                    onClick={() => setFitnessStatus('fit')}
                    style={{ flex: 1 }}
                  >
                    Fit to Resume
                  </button>
                </div>
              </div>
            </div>

            {/* Letterhead Certificate Preview */}
            <div style={{ background: '#faf9f6', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
              <h4 style={{ textAlign: 'center', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Medical Certificate
              </h4>
              <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                PrescoPad Certified Health Clinic
              </div>

              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 12 }}>
                This is to certify that Mr./Mrs. <strong>{patientName}</strong> (Age: {patientAge || '--'}, Sex: {patientGender || '--'}) has been under my medical treatment for <strong>{diagnosis}</strong>.
              </p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 12 }}>
                I advise medical leave/rest for a period of <strong>{restDays} Days</strong> starting from <strong>{startDate}</strong>.
              </p>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                Status: <strong style={{ color: fitnessStatus === 'fit' ? 'var(--color-success)' : 'var(--color-error)' }}>{fitnessStatus === 'fit' ? 'FIT TO RESUME DUTIES' : 'UNFIT FOR DUTY'}</strong>.
              </p>

              <div style={{ marginTop: 24, textAlign: 'right', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ fontWeight: 700 }}>Dr. {user?.name || 'Doctor'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Registered Medical Practitioner</div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
            <button type="button" className="primary-btn" onClick={handlePrint}>Print Certificate</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
