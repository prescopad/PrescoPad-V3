import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePrescriptionStore } from '../../store/usePrescriptionStore';
import { useQueueStore } from '../../store/useQueueStore';
import { useClinicStore } from '../../store/useClinicStore';
import { useAuthStore } from '../../store/useAuthStore';
import { recordConsultationPayment } from '../../api/paymentService';
import { hashString } from '../../utils/cryptoUtil';
import SignaturePad from '../../components/SignaturePad';
import PrescriptionActions from '../../components/PrescriptionActions';
import { useToast } from '../../components/toast/ToastContext';
import { CloseIcon, CheckIcon } from '../../components/icons';
import '../pages.css';
import '../../components/modal.css';
import '../auth/auth.css';
import './prescriptionPaper.css';

export default function PrescriptionPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentPrescription, loadPrescription, finalizePrescription, resetDraft, queueItemId } = usePrescriptionStore();
  const { clinic, doctorProfile, loadClinic, loadDoctorProfile } = useClinicStore();
  const { user } = useAuthStore();
  const completeConsult = useQueueStore((s) => s.completeConsult);
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [showSignModeModal, setShowSignModeModal] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      loadPrescription(id),
      loadClinic(),
      loadDoctorProfile(),
    ]).then(() => setIsLoading(false));
  }, [id, loadPrescription, loadClinic, loadDoctorProfile]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{ border: '3px solid var(--color-border)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', width: 24, height: 24, animation: 'spin 1s linear infinite' }}></div>
        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading prescription preview...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!currentPrescription) return <div className="empty-state">Prescription not found.</div>;

  const rx = currentPrescription;
  const isFinalized = rx.status === 'finalized';

  const handleSignAndIssue = () => {
    // If the doctor has a saved signature, prompt to choose saved or draw new
    if (doctorProfile?.signatureBase64) {
      setShowSignModeModal(true);
    } else {
      setShowSignaturePad(true);
    }
  };

  const handleSignatureConfirmed = async (signature: string) => {
    setShowSignaturePad(false);
    setShowSignModeModal(false);
    setIsFinalizing(true);
    try {
      const pdfHash = await hashString(`${rx.id}:${signature}`);
      await finalizePrescription(rx.id, signature, '', pdfHash);
      if (queueItemId) {
        await completeConsult(queueItemId);
      }
      setShowPaymentModal(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to finalize prescription');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleUseSavedSignature = () => {
    if (doctorProfile?.signatureBase64) {
      handleSignatureConfirmed(doctorProfile.signatureBase64);
    }
  };

  const handleRecordPayment = async (method: 'cash' | 'online') => {
    const amount = parseFloat(paymentAmount) || 0;
    if (amount > 0) {
      try {
        await recordConsultationPayment(rx.id, amount, method);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to record payment');
        return;
      }
    }
    setShowPaymentModal(false);
    resetDraft();
    navigate(`/prescriptions/${rx.id}/success`);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formattedFollowUp = rx.followUpDate ? formatDate(rx.followUpDate) : null;

  return (
    <div style={{ maxWidth: 760, margin: '20px auto', padding: '0 20px' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <button className="secondary-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="page-title">{isFinalized ? 'Finalized Prescription' : 'Prescription Preview'}</div>
      </div>

      {/* A4 Paper Container */}
      <div className="prescription-paper">
        {/* Clinic Header */}
        <div className="paper-logo-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, marginBottom: 4 }}>
            <img src="/logo.png" alt="" style={{ width: 44, height: 44, borderRadius: 4 }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: '1px' }}>PRESCOPAD</span>
          </div>
        </div>

        <div className="paper-clinic-name">{clinic?.name || 'Clinic Name'}</div>
        <div className="paper-doctor-info">
          Dr. {doctorProfile?.name || user?.name || 'Doctor'}
          {doctorProfile?.specialty ? ` | ${doctorProfile.specialty}` : ''}
          {doctorProfile?.regNumber ? ` | Reg: ${doctorProfile.regNumber}` : ''}
        </div>
        {clinic?.address && <div className="paper-clinic-sub">{clinic.address}</div>}
        {(clinic?.phone || clinic?.email) && (
          <div className="paper-clinic-sub">
            {[clinic?.phone, clinic?.email].filter(Boolean).join(' | ')}
          </div>
        )}

        <hr className="paper-header-rule" />

        {/* Meta Row */}
        <div className="paper-meta-row">
          <div>
            {rx.consultationType && (
              <span className="paper-consult-badge">
                {rx.consultationType === 'new' ? 'New Consultation' : 'Follow-up'}
              </span>
            )}
          </div>
          <div className="paper-date-id">
            Date: <strong>{formatDate(rx.createdAt)}</strong> &nbsp;|&nbsp; Rx ID: <strong style={{ color: 'var(--color-primary)' }}>{rx.id}</strong>
          </div>
        </div>

        {/* Patient Details Grid */}
        <table className="paper-patient-table">
          <tbody>
            <tr>
              <td className="paper-patient-cell">
                <div className="paper-p-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Patient
                  {rx.isMlc && (
                    <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 800 }}>
                      🚨 MLC CASE
                    </span>
                  )}
                </div>
                <div className="paper-p-value">{rx.patientName}</div>
              </td>
              <td className="paper-patient-cell">
                <div className="paper-p-label">Age / Gender</div>
                <div className="paper-p-value">{rx.patientAge} yrs / {rx.patientGender}</div>
              </td>
              <td className="paper-patient-cell">
                <div className="paper-p-label">Phone</div>
                <div className="paper-p-value">{rx.patientPhone || '—'}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Vitals Strip */}
        {rx.vitals && Object.values(rx.vitals).some(Boolean) && (
          <div style={{ background: 'var(--color-surface-secondary)', borderLeft: '3px solid var(--color-primary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.8125rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', marginRight: 8 }}>Vitals:</span>
            {[
              rx.vitals.bp ? `BP: ${rx.vitals.bp}` : null,
              rx.vitals.pulse ? `Pulse: ${rx.vitals.pulse} bpm` : null,
              rx.vitals.temp ? `Temp: ${rx.vitals.temp} °F` : null,
              rx.vitals.spo2 ? `SpO2: ${rx.vitals.spo2}%` : null,
              rx.vitals.bmi ? `BMI: ${rx.vitals.bmi}` : null,
              rx.vitals.bloodSugar ? `Sugar: ${rx.vitals.bloodSugar} mg/dL` : null,
            ].filter(Boolean).join('  ·  ')}
          </div>
        )}

        {/* Symptoms Section */}
        {rx.symptoms && rx.symptoms.length > 0 && (
          <div className="paper-section">
            <div className="paper-section-title">Symptoms</div>
            <div style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
              {rx.symptoms.join(', ')}
            </div>
          </div>
        )}

        {/* Diagnosis Section */}
        {rx.diagnosis && (
          <div className="paper-section">
            <div className="paper-section-title">Diagnosis</div>
            <div className="paper-accent-box-diag">{rx.diagnosis}</div>
          </div>
        )}

        {/* Medicines Section */}
        {rx.medicines && rx.medicines.length > 0 && (
          <div className="paper-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: '1.2rem', color: 'var(--color-primary)', fontWeight: 800 }}>℞</span>
              <div className="paper-section-title" style={{ margin: 0 }}>Medicines</div>
            </div>
            <div className="paper-med-table-wrapper">
              <table className="paper-med-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                    <th style={{ width: '45%' }}>Medicine Name</th>
                    <th style={{ width: '15%' }}>Dosage</th>
                    <th style={{ width: '15%' }}>Duration</th>
                    <th style={{ width: '20%' }}>Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {rx.medicines.map((m, i) => (
                    <tr key={m.id || i}>
                      <td style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>{i + 1}</td>
                      <td>
                        <div className="paper-med-name">{m.medicineName}</div>
                        <div className="paper-med-type">{m.type}</div>
                      </td>
                      <td>{m.frequency}</td>
                      <td>{m.duration}</td>
                      <td style={{ fontSize: '0.8125rem' }}>
                        {m.timing}
                        {m.notes ? ` (${m.notes})` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lab Tests Section */}
        {rx.labTests && rx.labTests.length > 0 && (
          <div className="paper-section">
            <div className="paper-section-title">Lab Tests / Investigations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {rx.labTests.map((t, i) => (
                <div key={t.id || i} className="paper-test-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3h6M10 3v6.5L4.5 19a1.7 1.7 0 0 0 1.5 2.5h12a1.7 1.7 0 0 0 1.5-2.5L14 9.5V3" />
                  </svg>
                  <span>
                    <strong>{t.testName}</strong>
                    {t.notes ? ` - ${t.notes}` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advice Section */}
        {rx.advice && (
          <div className="paper-section">
            <div className="paper-section-title">Advice</div>
            <div className="paper-accent-box-advice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.55 1 1.36 1 2.5h6c0-1.14.4-1.95 1-2.5A6 6 0 0 0 12 3z" />
              </svg>
              <div style={{ flex: 1 }}>{rx.advice}</div>
            </div>
          </div>
        )}

        {/* Referred To Section */}
        {rx.referredTo && (
          <div className="paper-section">
            <div className="paper-section-title">Referred To</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.9375rem', fontWeight: 700 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
              <span>{rx.referredTo}</span>
            </div>
          </div>
        )}

        {/* Follow-up Section */}
        {formattedFollowUp && (
          <div className="paper-follow-up-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Follow-up Date: {formattedFollowUp}</span>
          </div>
        )}

        {/* Signature Area */}
        <div className="paper-signature-section">
          {/* Left QR Code if uploaded */}
          <div className="paper-qr-container">
            {clinic?.qrCodeUrl ? (
              <>
                <img src={clinic.qrCodeUrl} alt="UPI QR" className="paper-qr-image" />
                <div className="paper-qr-label">Scan for Payment</div>
              </>
            ) : null}
          </div>

          {/* Right Signature Image/SVG */}
          <div className="paper-sig-container">
            {rx.signature ? (
              rx.signature.startsWith('M') ? (
                <svg width="150" height="50" viewBox="0 0 300 100" className="paper-sig-svg">
                  <path d={rx.signature} stroke="var(--color-text)" strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <img src={rx.signature} alt="Signature" className="paper-sig-image" />
              )
            ) : (
              <div style={{ height: 50, display: 'flex', alignItems: 'center', color: 'var(--color-text-light)', fontSize: '0.8125rem', fontStyle: 'italic', marginBottom: 6 }}>
                Not Signed Yet
              </div>
            )}
            <div className="paper-sig-doctor-name">Dr. {doctorProfile?.name || user?.name || 'Doctor'}</div>
            {doctorProfile?.regNumber && <div className="paper-sig-reg">Reg. No: {doctorProfile.regNumber}</div>}
          </div>
        </div>

        {/* Paper Footer */}
        <div className="paper-footer">
          <div>Generated by PrescoPad &mdash; Digital Prescription System</div>
          {rx.pdfHash && <div className="paper-hash">Verification Hash: {rx.pdfHash}</div>}
        </div>
      </div>

      {/* Buttons / Actions Bar */}
      <div style={{ marginTop: 20 }}>
        {!isFinalized ? (
          <button className="primary-btn" style={{ width: '100%', padding: 14 }} disabled={isFinalizing} onClick={handleSignAndIssue}>
            {isFinalizing ? 'Finalizing...' : 'Sign & Issue'}
          </button>
        ) : (
          <PrescriptionActions prescription={rx} />
        )}
      </div>

      {/* Signature Mode Choice Modal */}
      {showSignModeModal && (
        <div className="modal-backdrop" onClick={() => setShowSignModeModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Choose Signature Option</div>
              <button className="modal-close" onClick={() => setShowSignModeModal(false)}><CloseIcon /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
                How would you like to sign this prescription?
              </p>
              <button className="primary-btn" onClick={handleUseSavedSignature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <CheckIcon size={14} /> Use Saved Signature
              </button>
              <button className="secondary-btn" onClick={() => { setShowSignModeModal(false); setShowSignaturePad(true); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
                </svg>
                Draw New Signature
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Signature Pad Modal */}
      {showSignaturePad && (
        <div className="modal-backdrop" onClick={() => setShowSignaturePad(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div className="modal-title">Draw your signature</div>
              <button className="modal-close" onClick={() => setShowSignaturePad(false)}><CloseIcon /></button>
            </div>
            <div className="modal-body">
              <SignaturePad onConfirm={handleSignatureConfirmed} onCancel={() => setShowSignaturePad(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Payment Record Modal */}
      {showPaymentModal && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Record consultation payment</div>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Prescription issued successfully. Enter amount received if cash or show QR for online.
              </p>
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
