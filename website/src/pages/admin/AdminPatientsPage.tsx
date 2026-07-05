import { useEffect, useState } from 'react';
import { fetchAdminPatients } from '../../api/adminService';
import type { AdminPatient } from '../../api/adminService';
import '../pages.css';

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      fetchAdminPatients({ search: search || undefined, limit: 200 }).then((r) => setPatients(r.patients)).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Patients</div>
      </div>

      <input className="auth-input" style={{ maxWidth: 320, marginBottom: 20 }} placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="card-list">
        {patients.map((p) => (
          <div key={p.id} className="item-card" style={{ cursor: 'default' }}>
            <div>
              <div className="item-name">{p.name}</div>
              <div className="item-meta">{p.age ? `${p.age} yrs` : ''} {p.gender ? `· ${p.gender}` : ''} {p.phone ? `· ${p.phone}` : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
