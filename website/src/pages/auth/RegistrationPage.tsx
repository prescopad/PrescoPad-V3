import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { completeRegistration } from '../../api/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '../../types/auth.types';
import './auth.css';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { role } = (location.state ?? {}) as { role?: UserRole };
  const setUser = useAuthStore((s) => s.setUser);
  const isDoctor = role === UserRole.DOCTOR;

  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!role) {
    navigate('/auth/login', { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const response = await completeRegistration({
        name: name.trim(),
        specialty: isDoctor ? specialty : undefined,
        regNumber: isDoctor ? regNumber : undefined,
        clinicName: isDoctor ? clinicName : undefined,
        clinicAddress: isDoctor ? clinicAddress : undefined,
        clinicPhone: isDoctor ? clinicPhone : undefined,
        clinicEmail: isDoctor ? clinicEmail : undefined,
        qualification: !isDoctor ? qualification : undefined,
        experienceYears: !isDoctor && experienceYears ? Number(experienceYears) : undefined,
        city: !isDoctor ? city : undefined,
        address: !isDoctor ? address : undefined,
      });
      setUser(response.user, response.accessToken, response.refreshToken);
      navigate('/', { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wordmark">
        <img src="/logo.png" alt="" />
        <span>PrescoPad</span>
      </div>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-title">Complete your profile</div>
        <div className="auth-subtitle">
          {isDoctor ? 'Tell us about you and your clinic' : 'Tell us about yourself'}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label className="auth-label">Full name *</label>
          <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        {isDoctor ? (
          <>
            <div className="auth-form-row">
              <div className="auth-field">
                <label className="auth-label">Specialty</label>
                <input className="auth-input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              </div>
              <div className="auth-field">
                <label className="auth-label">Registration number</label>
                <input className="auth-input" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label">Clinic name</label>
              <input className="auth-input" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Clinic address</label>
              <input className="auth-input" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} />
            </div>
            <div className="auth-form-row">
              <div className="auth-field">
                <label className="auth-label">Clinic phone</label>
                <input className="auth-input" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} />
              </div>
              <div className="auth-field">
                <label className="auth-label">Clinic email</label>
                <input className="auth-input" value={clinicEmail} onChange={(e) => setClinicEmail(e.target.value)} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="auth-form-row">
              <div className="auth-field">
                <label className="auth-label">Qualification</label>
                <input className="auth-input" value={qualification} onChange={(e) => setQualification(e.target.value)} />
              </div>
              <div className="auth-field">
                <label className="auth-label">Experience (years)</label>
                <input
                  className="auth-input"
                  type="number"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>
            </div>
            <div className="auth-field">
              <label className="auth-label">City</label>
              <input className="auth-input" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Address</label>
              <input className="auth-input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </>
        )}

        <button type="button" className="auth-button" disabled={isLoading} onClick={handleSubmit}>
          {isLoading ? 'Saving...' : 'Finish setup'}
        </button>
      </div>
    </div>
  );
}
