import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types/auth.types';
import './pages.css';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const goHome = () => {
    if (!isAuthenticated) {
      navigate('/auth/login', { replace: true });
    } else if (user?.role === UserRole.ADMIN) {
      navigate('/admin/overview', { replace: true });
    } else {
      navigate('/queue', { replace: true });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div className="page-title" style={{ fontSize: '2rem', marginBottom: 8 }}>404</div>
        <div className="page-subtitle" style={{ marginBottom: 24 }}>
          The page you're looking for doesn't exist or may have been moved.
        </div>
        <button type="button" className="primary-btn" onClick={goHome}>
          Go home
        </button>
      </div>
    </div>
  );
}
