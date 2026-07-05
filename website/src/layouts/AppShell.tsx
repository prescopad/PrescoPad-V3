import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore, useIsDoctor, useIsAssistant } from '../store/useAuthStore';
import { useDoctorStatus } from '../hooks/useDoctorStatus';
import './sidebar.css';

export default function AppShell() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const isDoctor = useIsDoctor();
  const isAssistant = useIsAssistant();
  const doctorStatuses = useDoctorStatus();

  const handleLogout = () => {
    logout();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">PrescoPad</div>
        <nav className="sidebar-nav">
          <NavLink to="/queue" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Queue
          </NavLink>
          <NavLink to="/patients" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Patients
          </NavLink>
          {isDoctor && (
            <NavLink to="/casebook" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              Casebook
            </NavLink>
          )}
          {isDoctor && (
            <NavLink to="/wallet" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              Wallet
            </NavLink>
          )}
          {isDoctor && (
            <NavLink to="/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              Analytics
            </NavLink>
          )}
          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Settings
          </NavLink>
        </nav>
        {isAssistant && doctorStatuses.length > 0 && (
          <div className="sidebar-footer">
            {doctorStatuses.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', padding: '4px 0' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: d.isOnline ? 'var(--color-success)' : 'var(--color-text-light)',
                }} />
                <span style={{ color: 'var(--color-text-secondary)' }}>Dr. {d.name} {d.isOnline ? 'online' : 'offline'}</span>
              </div>
            ))}
          </div>
        )}
        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
