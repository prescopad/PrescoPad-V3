import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePatientStore } from '../../store/usePatientStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueueStore } from '../../store/useQueueStore';
import * as DataService from '../../api/dataService';
import type { Patient } from '../../types/patient.types';
import type { Prescription } from '../../types/prescription.types';
import ConsultTypeModal from '../../components/ConsultTypeModal';
import PageLoader from '../../components/PageLoader';
import { useToast } from '../../components/toast/ToastContext';
import '../pages.css';

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { getPatientById } = usePatientStore();
  const addToQueue = useQueueStore((s) => s.addToQueue);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQueueSubmitting, setIsQueueSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getPatientById(id), DataService.getPrescriptionsByPatient(id)]).then(([p, rx]) => {
      setPatient(p);
      setPrescriptions(rx);
      setIsLoading(false);
    });
  }, [id, getPatientById]);

  const handleAddToQueue = () => {
    if (!user || !id) return;
    setIsModalOpen(true);
  };

  const handleConfirmQueue = async (type: 'new' | 'follow_up', notes: string) => {
    if (!user || !id || !patient) return;
    setIsQueueSubmitting(true);
    try {
      await addToQueue(id, user.id, notes, type);
      setIsModalOpen(false);
      toast.success(`${patient.name} added to today's queue.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add to queue');
    } finally {
      setIsQueueSubmitting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) return <PageLoader />;
  if (!patient) return <div>Patient not found.</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">{patient.name}</div>
          <div className="page-subtitle">
            {patient.age} yrs · {patient.gender} {patient.phone ? `· ${patient.phone}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="secondary-btn" onClick={() => navigate(`/patients/${id}/edit`)}>
            Edit
          </button>
          <button type="button" className="primary-btn" onClick={handleAddToQueue}>
            Add to queue
          </button>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '1rem' }}>{patient.bloodGroup || '—'}</div>
          <div className="stat-label">Blood group</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '1rem' }}>{patient.weight ?? '—'}</div>
          <div className="stat-label">Weight (kg)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '1rem' }}>{patient.allergies || 'None'}</div>
          <div className="stat-label">Allergies</div>
        </div>
      </div>

      <div className="page-title" style={{ fontSize: '1.1rem', marginBottom: 12 }}>
        Prescription history
      </div>
      <div className="card-list">
        {prescriptions.length === 0 && <div className="empty-state">No past prescriptions</div>}
        {prescriptions.slice(0, visibleCount).map((rx) => (
          <div key={rx.id} className="item-card" onClick={() => navigate(`/prescriptions/${rx.id}`)}>
            <div>
              <div className="item-name">{rx.diagnosis || 'Consultation'}</div>
              <div className="item-meta">{formatDate(rx.createdAt)}</div>
            </div>
            <span className="status-pill" style={{
              background: rx.status === 'finalized' ? 'var(--color-success-light)' : 'var(--color-warning-light)',
              color: rx.status === 'finalized' ? 'var(--color-success)' : 'var(--color-warning)',
            }}>
              {rx.status}
            </span>
          </div>
        ))}
      </div>
      {visibleCount < prescriptions.length && (
        <button
          type="button"
          className="secondary-btn"
          style={{ marginTop: 12, width: '100%' }}
          onClick={() => setVisibleCount((c) => c + 20)}
        >
          Load more
        </button>
      )}

      <ConsultTypeModal
        isOpen={isModalOpen}
        patientName={patient.name}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmQueue}
        isSubmitting={isQueueSubmitting}
      />
    </div>
  );
}
