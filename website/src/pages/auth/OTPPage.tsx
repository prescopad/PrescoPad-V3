import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../../api/authService';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '../../types/auth.types';
import './auth.css';

const RESEND_COOLDOWN_SECONDS = 60;

export default function OTPPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone, role } = (location.state ?? {}) as { phone?: string; role?: UserRole };
  const setUser = useAuthStore((s) => s.setUser);

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (!phone || !role) {
      navigate('/auth/login', { replace: true });
    }
  }, [phone, role, navigate]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  if (!phone || !role) return null;

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const response = await verifyOTP(phone, otp, role, 'login');
      setUser(response.user, response.accessToken, response.refreshToken);
      if (response.isNewUser || !response.user.isProfileComplete) {
        navigate('/auth/register', { state: { role }, replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Verification failed. Please try again.';
      if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('expired')) {
        setOtp('');
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || isResending) return;
    setIsResending(true);
    try {
      await sendOTP(phone, role, 'login');
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
      setOtp('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-title">Verify OTP</div>
        <div className="auth-subtitle">Enter the 6-digit code sent to +91 {phone}</div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <input
            className="auth-input auth-otp-input"
            type="text"
            inputMode="numeric"
            placeholder="------"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            maxLength={6}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
        </div>

        <button
          type="button"
          className="auth-button"
          disabled={otp.length !== 6 || isLoading}
          onClick={handleVerify}
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>

        <div className="auth-link-row">
          {resendCountdown > 0 ? (
            <span>Resend OTP in {resendCountdown}s</span>
          ) : (
            <button type="button" className="auth-link" onClick={handleResend} disabled={isResending}>
              {isResending ? 'Resending...' : 'Resend OTP'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
