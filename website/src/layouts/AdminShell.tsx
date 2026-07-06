import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import './sidebar.css';

export default function AdminShell() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
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
        <span className="mobile-brand">
          <img src="/logo.png" alt="" className="brand-logo" />
          PrescoPad Admin
        </span>
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
        <div className="sidebar-brand">
          <img src="/logo.png" alt="" className="brand-logo" />
          PrescoPad Admin
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/admin/overview" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>Overview</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>Users</NavLink>
          <NavLink to="/admin/clinics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>Clinics</NavLink>
          <NavLink to="/admin/patients" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>Patients</NavLink>
          <NavLink to="/admin/revenue" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={closeSidebar}>Revenue</NavLink>
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={handleLogout}>Log out</button>
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
