import { useEffect, useState } from 'react';
import { useClinicStore } from '../../store/useClinicStore';
import { useIsDoctor } from '../../store/useAuthStore';
import SignaturePad from '../../components/SignaturePad';
import '../pages.css';
import '../auth/auth.css';
import '../../components/modal.css';

export default function ClinicProfilePage() {
  const { clinic, doctorProfile, loadClinic, loadDoctorProfile, updateClinic, updateDoctorProfile } = useClinicStore();
  const isDoctor = useIsDoctor();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  useEffect(() => {
    loadClinic();
    loadDoctorProfile();
  }, [loadClinic, loadDoctorProfile]);

  useEffect(() => {
    if (!clinic) return;
    setName(clinic.name);
    setAddress(clinic.address);
    setPhone(clinic.phone);
    setEmail(clinic.email);
  }, [clinic]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateClinic({ name, address, phone, email });
      alert('Clinic profile updated.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update clinic profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSignature = async (svgPath: string) => {
    setShowSignaturePad(false);
    try {
      await updateDoctorProfile({ signatureBase64: svgPath });
      alert('Signature saved.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save signature');
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <div className="page-title">Clinic Profile</div>
      </div>

      <div className="auth-field">
        <label className="auth-label">Clinic name</label>
        <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} disabled={!isDoctor} />
      </div>
      <div className="auth-field">
        <label className="auth-label">Address</label>
        <input className="auth-input" value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isDoctor} />
      </div>
      <div className="auth-form-row">
        <div className="auth-field">
          <label className="auth-label">Phone</label>
          <input className="auth-input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isDoctor} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isDoctor} />
        </div>
      </div>

      {isDoctor && (
        <button className="primary-btn" disabled={isSaving} onClick={handleSave}>
          {isSaving ? 'Saving...' : 'Save clinic details'}
        </button>
      )}

      {isDoctor && (
        <div style={{ marginTop: 28 }}>
          <div className="auth-label" style={{ marginBottom: 10 }}>Digital signature</div>
          {doctorProfile?.signatureBase64 && (
            <div style={{ marginBottom: 10, padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-secondary)' }}>
              {doctorProfile.signatureBase64.startsWith('M') ? (
                <svg width={200} height={80}>
                  <path d={doctorProfile.signatureBase64} stroke="var(--color-text)" strokeWidth={2} fill="none" />
                </svg>
              ) : (
                <img src={doctorProfile.signatureBase64} alt="signature" style={{ maxHeight: 80 }} />
              )}
            </div>
          )}
          <button className="secondary-btn" onClick={() => setShowSignaturePad(true)}>
            {doctorProfile?.signatureBase64 ? 'Update signature' : 'Add signature'}
          </button>
        </div>
      )}

      {showSignaturePad && (
        <div className="modal-backdrop" onClick={() => setShowSignaturePad(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div className="modal-title">Draw your signature</div>
              <button className="modal-close" onClick={() => setShowSignaturePad(false)}>✕</button>
            </div>
            <div className="modal-body">
              <SignaturePad onConfirm={handleSaveSignature} onCancel={() => setShowSignaturePad(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
