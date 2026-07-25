import { useNavigate } from 'react-router-dom';
import { useIsDoctor } from '../../store/useAuthStore';
import '../pages.css';

export default function SettingsPage() {
  const navigate = useNavigate();
  const isDoctor = useIsDoctor();

  const items = [
    { label: 'My Profile', subtitle: 'Update your name, phone, and professional details', to: '/settings/profile' },
    { label: 'Clinic Profile', subtitle: 'Manage clinic and doctor information', to: '/settings/clinic' },
    { label: 'Medicines & Tests', subtitle: 'Add or remove custom medicines and lab tests', to: '/settings/medicines-tests' },
    { label: 'Connection', subtitle: 'Connect doctor and assistant accounts', to: '/settings/connection' },
    ...(isDoctor ? [{ label: 'Casebook', subtitle: 'Quick patient summaries', to: '/casebook' }] : []),
    ...(isDoctor ? [{ label: 'Analytics', subtitle: 'View prescription analytics and revenue', to: '/analytics' }] : []),
  ];

  return (
    <div className="page-container-narrow">
      <div className="page-header">
        <div className="page-title">Settings</div>
      </div>
      <div className="card-list">
        {items.map((item) => (
          <div key={item.to} className="item-card" onClick={() => navigate(item.to)}>
            <div>
              <div className="item-name">{item.label}</div>
              <div className="item-meta">{item.subtitle}</div>
            </div>
            <span>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
