import { useEffect, useState } from 'react';
import { fetchAdminClinics, deleteAdminClinic } from '../../api/adminService';
import type { AdminClinic } from '../../api/adminService';
import '../pages.css';

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<AdminClinic[]>([]);
  const [search, setSearch] = useState('');

  const load = () => {
    fetchAdminClinics({ search: search || undefined, limit: 200 }).then((r) => setClinics(r.clinics)).catch(() => {});
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleDelete = async (c: AdminClinic) => {
    if (!confirm(`Delete clinic ${c.name}?`)) return;
    await deleteAdminClinic(c.id);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Clinics</div>
      </div>

      <input className="auth-input" style={{ maxWidth: 320, marginBottom: 20 }} placeholder="Search clinics..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="card-list">
        {clinics.map((c) => (
          <div key={c.id} className="item-card" style={{ cursor: 'default' }}>
            <div>
              <div className="item-name">{c.name}</div>
              <div className="item-meta">{c.address} · {c.doctorCount} doctors · {c.assistantCount} assistants · {c.prescriptionCount} Rx</div>
            </div>
            <button className="icon-btn" onClick={() => handleDelete(c)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
