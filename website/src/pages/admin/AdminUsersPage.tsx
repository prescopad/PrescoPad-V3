import { useEffect, useState } from 'react';
import { fetchAdminUsers, setAdminUserActive, deleteAdminUser } from '../../api/adminService';
import type { AdminUser } from '../../api/adminService';
import '../pages.css';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [role, setRole] = useState<'doctor' | 'assistant' | 'admin' | ''>('');
  const [search, setSearch] = useState('');

  const load = () => {
    fetchAdminUsers({ role: role || undefined, search: search || undefined, limit: 200 })
      .then((r) => setUsers(r.users))
      .catch(() => {});
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, search]);

  const handleToggleActive = async (u: AdminUser) => {
    const active = u.is_active ?? u.isActive ?? true;
    await setAdminUserActive(u.id, !active);
    load();
  };

  const handleDelete = async (u: AdminUser) => {
    if (!confirm(`Delete user ${u.name ?? u.phone}?`)) return;
    await deleteAdminUser(u.id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Users</div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input className="auth-input" style={{ maxWidth: 280 }} placeholder="Search by name/phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="auth-select" style={{ maxWidth: 180 }} value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          <option value="">All roles</option>
          <option value="doctor">Doctor</option>
          <option value="assistant">Assistant</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="card-list">
        {users.map((u) => {
          const active = u.is_active ?? u.isActive ?? true;
          return (
            <div key={u.id} className="item-card" style={{ cursor: 'default' }}>
              <div>
                <div className="item-name">{u.name ?? '(no name)'}</div>
                <div className="item-meta">{u.phone} · {u.role}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="status-pill" style={{ background: active ? 'var(--color-success-light)' : 'var(--color-error-light)', color: active ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {active ? 'Active' : 'Disabled'}
                </span>
                <button className="secondary-btn" onClick={() => handleToggleActive(u)}>{active ? 'Disable' : 'Enable'}</button>
                <button className="icon-btn" onClick={() => handleDelete(u)}>✕</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
