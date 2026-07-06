import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { updateProfile } from '../../api/authService';
import { useToast } from '../../components/toast/ToastContext';
import '../pages.css';
import '../auth/auth.css';

export default function UserProfilePage() {
  const { user, setUser, accessToken, refreshToken } = useAuthStore();
  const toast = useToast();
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [qualification, setQualification] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setSpecialty(user.specialty ?? '');
    setRegNumber(user.regNumber ?? '');
    setQualification(user.qualification ?? '');
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
      });
      if (accessToken && refreshToken) setUser(updated, accessToken, refreshToken);
      toast.success('Profile updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-container-narrow">
      <div className="page-header">
        <div className="page-title">My Profile</div>
      </div>

      <div className="auth-field">
        <label className="auth-label">Name</label>
        <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="auth-field">
        <label className="auth-label">Phone</label>
        <input className="auth-input" value={user.phone} disabled />
      </div>

      {isDoctor ? (
        <>
          <div className="auth-field">
            <label className="auth-label">Specialty</label>
            <input className="auth-input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
          </div>
          <div className="auth-field">
            <label className="auth-label">Registration number</label>
            <input className="auth-input" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
          </div>
        </>
      ) : (
        <div className="auth-field">
          <label className="auth-label">Qualification</label>
          <input className="auth-input" value={qualification} onChange={(e) => setQualification(e.target.value)} />
        </div>
      )}

      <button className="primary-btn" disabled={isSaving} onClick={handleSave}>
        {isSaving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}
