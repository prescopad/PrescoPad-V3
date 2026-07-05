import { useState } from 'react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth/login', { replace: true });
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="app-shell">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <span className="mobile-brand">PrescoPad</span>
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">PrescoPad</div>
        <nav className="sidebar-nav">
          <NavLink to="/queue" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            Queue
          </NavLink>
          <NavLink to="/patients" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            Patients
          </NavLink>
          {isDoctor && (
            <NavLink to="/casebook" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              Casebook
            </NavLink>
          )}
          {isDoctor && (
            <NavLink to="/wallet" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              Wallet
            </NavLink>
          )}
          {isDoctor && (
            <NavLink to="/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              Analytics
            </NavLink>
          )}
          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
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

      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
