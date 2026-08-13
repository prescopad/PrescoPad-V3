import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore, useIsDoctor, useIsAssistant } from '../store/useAuthStore';
import { useDoctorStatus } from '../hooks/useDoctorStatus';
import './sidebar.css';

export default function AppShell() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
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
  const initials = (user?.name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <span className="mobile-brand">
          <img src="/logo.png" alt="" className="brand-logo" />
          PrescoPad
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="mobile-logout-btn"
            onClick={handleLogout}
            aria-label="Logout"
            title="Log out"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
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
        </div>
      </header>

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="" className="brand-logo" />
          PrescoPad
        </div>

        {/* User Profile Badge */}
        <div className="user-profile-badge">
          <div className="user-avatar-circle">{initials}</div>
          <div className="user-badge-info">
            <span className="user-badge-name">{user?.name || 'User'}</span>
            <span className="user-badge-role">{user?.role || 'Doctor'}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/queue" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Live Queue
          </NavLink>

          <NavLink to="/patients" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <path d="M2 10h20" />
            </svg>
            Patients
          </NavLink>

          {isDoctor && (
            <NavLink to="/casebook" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              AI Casebook
            </NavLink>
          )}

          {isDoctor && (
            <NavLink to="/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Analytics
            </NavLink>
          )}

          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </NavLink>
        </nav>

        {isAssistant && doctorStatuses.length > 0 && (
          <div className="sidebar-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Clinic Doctors</span>
            {doctorStatuses.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', padding: '4px 0' }}>
                <span className={d.isOnline ? 'pulse-dot' : ''} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: d.isOnline ? 'var(--color-success)' : 'var(--color-text-light)',
                }} />
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Dr. {d.name} ({d.isOnline ? 'Online' : 'Offline'})</span>
              </div>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      </aside>

      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

      <main className="app-content animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
