import { useEffect, useState } from 'react';
import { fetchAdminPatients } from '../../api/adminService';
import type { AdminPatient } from '../../api/adminService';
import { useToast } from '../../components/toast/ToastContext';
import '../pages.css';

const PAGE_SIZE = 50;

export default function AdminPatientsPage() {
  const toast = useToast();
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      fetchAdminPatients({ search: search || undefined, limit: PAGE_SIZE, offset: 0 })
        .then((r) => {
          setPatients(r.patients);
          setTotal(r.total);
        })
        .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load patients'));
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const r = await fetchAdminPatients({ search: search || undefined, limit: PAGE_SIZE, offset: patients.length });
      setPatients((prev) => [...prev, ...r.patients]);
      setTotal(r.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load more patients');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">Patients</div>
      </div>

      <input className="auth-input" style={{ maxWidth: 320, marginBottom: 20 }} placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="card-list">
        {patients.length === 0 && <div className="empty-state">No patients found</div>}
        {patients.map((p) => (
          <div key={p.id} className="item-card" style={{ cursor: 'default' }}>
            <div>
              <div className="item-name">{p.name}</div>
              <div className="item-meta">{p.age ? `${p.age} yrs` : ''} {p.gender ? `· ${p.gender}` : ''} {p.phone ? `· ${p.phone}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
      {patients.length < total && (
        <button type="button" className="secondary-btn" style={{ marginTop: 12, width: '100%' }} disabled={isLoadingMore} onClick={loadMore}>
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
