import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../../store/usePatientStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueueStore } from '../../store/useQueueStore';
import '../pages.css';

export default function PatientsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { patients, searchResults, loadPatients, searchPatients, clearSearch } = usePatientStore();
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) searchPatients(query);
      else clearSearch();
    }, 200);
    return () => clearTimeout(t);
  }, [query, searchPatients, clearSearch]);

  const list = query.trim() ? searchResults : patients;

  const handleAddToQueue = async (e: React.MouseEvent, patientId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await addToQueue(patientId, user.id, undefined, 'new');
      alert('Added to today\'s queue.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add to queue');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Patients</div>
          <div className="page-subtitle">Search, register, and manage patients</div>
        </div>
        <button type="button" className="primary-btn" onClick={() => navigate('/patients/new')}>
          + Add patient
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          className="auth-input"
          style={{ maxWidth: 360 }}
          placeholder="Search patients by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="card-list">
        {list.length === 0 && <div className="empty-state">No patients found</div>}
        {list.map((p) => (
          <div key={p.id} className="item-card" onClick={() => navigate(`/patients/${p.id}`)}>
            <div className="item-card-left">
              <div>
                <div className="item-name">{p.name}</div>
                <div className="item-meta">
                  {p.age} yrs · {p.gender} {p.phone ? `· ${p.phone}` : ''}
                </div>
              </div>
            </div>
            <button type="button" className="secondary-btn" onClick={(e) => handleAddToQueue(e, p.id)}>
              Add to queue
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
