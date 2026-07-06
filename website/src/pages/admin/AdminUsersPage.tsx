import { useEffect, useState } from 'react';
import { fetchAdminUsers, setAdminUserActive, deleteAdminUser } from '../../api/adminService';
import type { AdminUser } from '../../api/adminService';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import { useToast } from '../../components/toast/ToastContext';
import '../pages.css';

const PAGE_SIZE = 50;

export default function AdminUsersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [role, setRole] = useState<'doctor' | 'assistant' | 'admin' | ''>('');
  const [search, setSearch] = useState('');

  const load = () => {
    fetchAdminUsers({ role: role || undefined, search: search || undefined, limit: PAGE_SIZE, offset: 0 })
      .then((r) => {
        setUsers(r.users);
        setTotal(r.total);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load users'));
  };

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const r = await fetchAdminUsers({ role: role || undefined, search: search || undefined, limit: PAGE_SIZE, offset: users.length });
      setUsers((prev) => [...prev, ...r.users]);
      setTotal(r.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load more users');
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, search]);

  const handleToggleActive = async (u: AdminUser) => {
    const active = u.is_active ?? u.isActive ?? true;
    try {
      await setAdminUserActive(u.id, !active);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user');
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (!(await confirm({ title: 'Delete user', message: `Delete user ${u.name ?? u.phone}?`, danger: true }))) return;
    try {
      await deleteAdminUser(u.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete user');
    }
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
        {users.length === 0 && <div className="empty-state">No users found</div>}
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
      {users.length < total && (
        <button type="button" className="secondary-btn" style={{ marginTop: 12, width: '100%' }} disabled={isLoadingMore} onClick={loadMore}>
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
