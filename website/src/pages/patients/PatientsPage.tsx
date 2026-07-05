import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../../store/usePatientStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueueStore } from '../../store/useQueueStore';
import ConsultTypeModal from '../../components/ConsultTypeModal';
import '../pages.css';

export default function PatientsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { patients, searchResults, loadPatients, searchPatients, clearSearch } = usePatientStore();
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const [query, setQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPatient, setPendingPatient] = useState<{ id: string; name: string } | null>(null);
  const [isQueueSubmitting, setIsQueueSubmitting] = useState(false);

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

  const handleAddToQueue = (e: React.MouseEvent, patientId: string, patientName: string) => {
    e.stopPropagation();
    if (!user) return;
    setPendingPatient({ id: patientId, name: patientName });
    setIsModalOpen(true);
  };

  const handleConfirmQueue = async (type: 'new' | 'follow_up', notes: string) => {
    if (!user || !pendingPatient) return;
    setIsQueueSubmitting(true);
    try {
      await addToQueue(pendingPatient.id, user.id, notes, type);
      setIsModalOpen(false);
      setPendingPatient(null);
      alert(`${pendingPatient.name} added to today's queue.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add to queue');
    } finally {
      setIsQueueSubmitting(false);
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
            <button type="button" className="secondary-btn" onClick={(e) => handleAddToQueue(e, p.id, p.name)}>
              Add to queue
            </button>
          </div>
        ))}
      </div>

      <ConsultTypeModal
        isOpen={isModalOpen}
        patientName={pendingPatient?.name ?? ''}
        onClose={() => { setIsModalOpen(false); setPendingPatient(null); }}
        onConfirm={handleConfirmQueue}
        isSubmitting={isQueueSubmitting}
      />
    </div>
  );
}
