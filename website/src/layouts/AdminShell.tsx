import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import './sidebar.css';

export default function AdminShell() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/auth/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">PrescoPad Admin</div>
        <nav className="sidebar-nav">
          <NavLink to="/admin/overview" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>Overview</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>Users</NavLink>
          <NavLink to="/admin/clinics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>Clinics</NavLink>
          <NavLink to="/admin/patients" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>Patients</NavLink>
          <NavLink to="/admin/revenue" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>Revenue</NavLink>
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={handleLogout}>Log out</button>
        </div>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
