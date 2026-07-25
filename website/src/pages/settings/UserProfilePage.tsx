import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { updateProfile } from '../../api/authService';
import { useToast } from '../../components/toast/ToastContext';
import SignaturePad from '../../components/SignaturePad';
import '../pages.css';
import '../auth/auth.css';

export default function UserProfilePage() {
  const { user, setUser, accessToken, refreshToken } = useAuthStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [qualification, setQualification] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setSpecialty(user.specialty ?? '');
    setRegNumber(user.regNumber ?? '');
    setQualification(user.qualification ?? '');
    setSignatureUrl(user.signatureUrl ?? '');
  }, [user]);

  if (!user) return null;
  const isDoctor = user.role === 'doctor';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateProfile({
        name,
        specialty: isDoctor ? specialty : undefined,
        regNumber: isDoctor ? regNumber : undefined,
        qualification: !isDoctor ? qualification : undefined,
        signatureUrl: isDoctor ? signatureUrl : undefined,
      });
      if (accessToken && refreshToken) setUser(updated, accessToken, refreshToken);
      toast.success('Profile updated successfully.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container-narrow animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">My Profile</div>
          <div className="page-subtitle">Manage your account information and digital credentials</div>
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-label">Full Name</label>
        <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="auth-field">
        <label className="auth-label">Phone Number (Verified)</label>
        <input className="auth-input" value={user.phone} disabled style={{ background: 'var(--color-surface-secondary)' }} />
      </div>

      {isDoctor ? (
        <>
          <div className="auth-field">
            <label className="auth-label">Specialty</label>
            <input className="auth-input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Consultant Physician / Cardiologist" />
          </div>
          <div className="auth-field">
            <label className="auth-label">Medical Registration Number</label>
            <input className="auth-input" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="e.g. MCI-2015-87654" />
          </div>

          <div className="auth-field" style={{ marginTop: 8 }}>
            <label className="auth-label">Doctor Digital Signature</label>
            {signatureUrl ? (
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 16, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <svg width="240" height="60" viewBox="0 0 560 220" style={{ border: '1px solid var(--color-border-light)', borderRadius: 6, background: '#fff' }}>
                  <path d={signatureUrl} stroke="#0f172a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <button className="secondary-btn" onClick={() => setShowSignaturePad(true)}>Re-draw Signature</button>
              </div>
            ) : (
              <button className="secondary-btn" onClick={() => setShowSignaturePad(true)}>✍️ Draw Digital Signature</button>
            )}

            {showSignaturePad && (
              <div style={{ marginTop: 12 }}>
                <SignaturePad
                  onConfirm={(svgPath) => {
                    setSignatureUrl(svgPath);
                    setShowSignaturePad(false);
                    toast.success('Signature recorded! Click "Save changes" to persist.');
                  }}
                  onCancel={() => setShowSignaturePad(false)}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="auth-field">
          <label className="auth-label">Qualification / Designation</label>
          <input className="auth-input" value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. Senior Clinic Assistant" />
        </div>
      )}

      <button className="primary-btn" style={{ marginTop: 16, width: '100%', padding: 12 }} disabled={isSaving} onClick={handleSave}>
        {isSaving ? 'Saving changes...' : 'Save Profile Changes'}
      </button>
    </div>
  );
}
