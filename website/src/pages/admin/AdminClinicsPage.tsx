import { useEffect, useState } from 'react';
import { fetchAdminClinics, deleteAdminClinic } from '../../api/adminService';
import type { AdminClinic } from '../../api/adminService';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import { useToast } from '../../components/toast/ToastContext';
import { CloseIcon } from '../../components/icons';
import '../pages.css';

const PAGE_SIZE = 50;

export default function AdminClinicsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [clinics, setClinics] = useState<AdminClinic[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    fetchAdminClinics({ search: search || undefined, limit: PAGE_SIZE, offset: 0 })
      .then((r) => {
        setClinics(r.clinics);
        setTotal(r.total);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load clinics'));
  };

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const r = await fetchAdminClinics({ search: search || undefined, limit: PAGE_SIZE, offset: clinics.length });
      setClinics((prev) => [...prev, ...r.clinics]);
      setTotal(r.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load more clinics');
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (c: AdminClinic) => {
    if (!(await confirm({ title: 'Delete clinic', message: `Delete clinic ${c.name}?`, danger: true }))) return;
    try {
      await deleteAdminClinic(c.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete clinic');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">Clinics</div>
      </div>

      <input className="auth-input" style={{ maxWidth: 320, marginBottom: 20 }} placeholder="Search clinics..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="card-list">
        {clinics.length === 0 && <div className="empty-state">No clinics found</div>}
        {clinics.map((c) => (
          <div key={c.id} className="item-card" style={{ cursor: 'default' }}>
            <div>
              <div className="item-name">{c.name}</div>
              <div className="item-meta">{c.address} · {c.doctorCount} doctors · {c.assistantCount} assistants · {c.prescriptionCount} Rx</div>
            </div>
            <button className="icon-btn" onClick={() => handleDelete(c)}><CloseIcon size={14} /></button>
          </div>
        ))}
      </div>
      {clinics.length < total && (
        <button type="button" className="secondary-btn" style={{ marginTop: 12, width: '100%' }} disabled={isLoadingMore} onClick={loadMore}>
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
