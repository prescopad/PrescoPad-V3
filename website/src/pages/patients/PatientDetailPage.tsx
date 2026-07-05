import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePatientStore } from '../../store/usePatientStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useQueueStore } from '../../store/useQueueStore';
import * as DataService from '../../api/dataService';
import type { Patient } from '../../types/patient.types';
import type { Prescription } from '../../types/prescription.types';
import '../pages.css';

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { getPatientById } = usePatientStore();
  const addToQueue = useQueueStore((s) => s.addToQueue);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getPatientById(id), DataService.getPrescriptionsByPatient(id)]).then(([p, rx]) => {
      setPatient(p);
      setPrescriptions(rx);
      setIsLoading(false);
    });
  }, [id, getPatientById]);

  const handleAddToQueue = async () => {
    if (!user || !id) return;
    try {
      await addToQueue(id, user.id, undefined, 'new');
      alert('Added to today\'s queue.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add to queue');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) return <div>Loading...</div>;
  if (!patient) return <div>Patient not found.</div>;

  return (
    <div>
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
        {prescriptions.map((rx) => (
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
    </div>
  );
}
