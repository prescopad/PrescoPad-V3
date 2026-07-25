import { useNavigate } from 'react-router-dom';
import { useIsDoctor } from '../../store/useAuthStore';
import '../pages.css';

interface SettingItem {
  icon: string;
  badgeBg: string;
  label: string;
  subtitle: string;
  to: string;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const isDoctor = useIsDoctor();

  const items: SettingItem[] = [
    {
      icon: '👤',
      badgeBg: '#e0f2fe',
      label: 'My Profile',
      subtitle: 'Update your name, phone, and professional details',
      to: '/settings/profile',
    },
    {
      icon: '🏥',
      badgeBg: '#ccfbf1',
      label: 'Clinic Profile',
      subtitle: 'Manage clinic branding, address, logo and payment QR',
      to: '/settings/clinic',
    },
    {
      icon: '💊',
      badgeBg: '#f3e8ff',
      label: 'Medicines and Tests',
      subtitle: 'Add or remove custom medicines and lab test catalog',
      to: '/settings/medicines-tests',
    },
    {
      icon: '🔗',
      badgeBg: '#fef3c7',
      label: 'Doctor and Assistant Connection',
      subtitle: 'Share live queue access between doctor and assistant accounts',
      to: '/settings/connection',
    },
    ...(isDoctor
      ? [
          {
            icon: '📖',
            badgeBg: '#d1fae5',
            label: 'AI Casebook',
            subtitle: 'AI-generated patient summary histories and case insights',
            to: '/casebook',
          },
          {
            icon: '📊',
            badgeBg: '#e0e7ff',
            label: 'Analytics and Revenue',
            subtitle: 'Track prescription volume, earnings, and medicine stats',
            to: '/analytics',
          },
        ]
      : []),
  ];

  return (
    <div className="page-container-narrow animate-fade-in" style={{ paddingBottom: 40 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Configure clinic account, team connections, and custom preferences</div>
        </div>
      </div>

      <div className="card-list" style={{ gap: 12 }}>
        {items.map((item) => (
          <div key={item.to} className="item-card item-card-setting" onClick={() => navigate(item.to)}>
            <div className="setting-badge" style={{ background: item.badgeBg }}>
              {item.icon}
            </div>

            <div className="setting-content">
              <div className="item-name" style={{ fontSize: '1rem' }}>{item.label}</div>
              <div className="item-meta" style={{ fontSize: '0.8125rem', marginTop: 2, lineHeight: 1.35 }}>
                {item.subtitle}
              </div>
            </div>

            <div className="setting-chevron">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
