import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientStore } from '../../store/usePatientStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueueStore } from '../../store/useQueueStore';
import ConsultTypeModal from '../../components/ConsultTypeModal';
import { useToast } from '../../components/toast/ToastContext';
import '../pages.css';

export default function PatientsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { patients, patientsTotal, isLoadingMore, searchResults, searchTotal, lastError, loadPatients, loadMorePatients, searchPatients, clearSearch, clearError } = usePatientStore();
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const [query, setQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPatient, setPendingPatient] = useState<{ id: string; name: string } | null>(null);
  const [isQueueSubmitting, setIsQueueSubmitting] = useState(false);

  useEffect(() => {
    if (user?.clinicId) {
      loadPatients();
    }
  }, [loadPatients, user?.clinicId]);

  useEffect(() => {
    if (lastError) {
      toast.error(lastError);
      clearError();
    }
  }, [lastError, toast, clearError]);

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
      toast.success(`${pendingPatient.name} added to today's queue.`);
      navigate('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add to queue');
    } finally {
      setIsQueueSubmitting(false);
    }
  };

  return (
    <div className="page-container">
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

      {query.trim() && searchTotal > list.length && (
        <div className="page-subtitle" style={{ marginBottom: 12 }}>
          Showing first {list.length} of {searchTotal} matches — refine your search to narrow results.
        </div>
      )}

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
      {!query.trim() && patients.length < patientsTotal && (
        <button
          type="button"
          className="secondary-btn"
          style={{ marginTop: 12, width: '100%' }}
          disabled={isLoadingMore}
          onClick={loadMorePatients}
        >
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}

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
