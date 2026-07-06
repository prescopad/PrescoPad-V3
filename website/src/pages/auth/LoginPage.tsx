import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOTP } from '../../api/authService';
import { UserRole } from '../../types/auth.types';
import './auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(UserRole.DOCTOR);
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isDoctor = role === UserRole.DOCTOR;

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await sendOTP(phone, role);
      navigate('/auth/otp', { state: { phone, role } });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP. Please try again.');
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
      <div className="auth-card">
        <div className="auth-icon-circle" style={{ background: isDoctor ? 'var(--color-primary)' : '#059669' }}>
          {isDoctor ? 'Dr' : 'A'}
        </div>
        <div className="auth-title">{isDoctor ? 'Doctor Login' : 'Assistant Login'}</div>
        <div className="auth-subtitle">Enter your phone number to continue</div>

        <div className="auth-role-toggle">
          <button
            type="button"
            className={`auth-role-btn ${isDoctor ? 'active' : ''}`}
            onClick={() => setRole(UserRole.DOCTOR)}
          >
            Doctor
          </button>
          <button
            type="button"
            className={`auth-role-btn ${!isDoctor ? 'active' : ''}`}
            onClick={() => setRole(UserRole.ASSISTANT)}
          >
            Assistant
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <label className="auth-label">Phone number</label>
          <div className="auth-phone-row">
            <span className="auth-phone-prefix">+91</span>
            <input
              type="tel"
              placeholder="10-digit number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              maxLength={10}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
            />
          </div>
        </div>

        <button
          type="button"
          className="auth-button"
          disabled={phone.length !== 10 || isLoading}
          onClick={handleSendOTP}
        >
          {isLoading ? 'Sending...' : 'Send OTP'}
        </button>
      </div>
    </div>
  );
}
