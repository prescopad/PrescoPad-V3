import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePrescriptionStore } from '../../store/usePrescriptionStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { QueueItem } from '../../types/queue.types';
import type { Patient } from '../../types/patient.types';
import MedicinePickerModal from '../../components/MedicinePickerModal';
import LabTestPickerModal from '../../components/LabTestPickerModal';
import { useToast } from '../../components/toast/ToastContext';
import '../pages.css';
import '../auth/auth.css';

const COMMON_SYMPTOMS = [
  'Abdominal Pain', 'Anxiety', 'Back Pain', 'Blurred Vision', 'Body Pain',
  'Burning Urination', 'Chest Pain', 'Cold & Cough', 'Constipation', 'Diarrhea',
  'Dizziness', 'Ear Pain', 'Eye Redness', 'Fatigue', 'Fever',
  'Headache', 'Insomnia', 'Itching', 'Joint Pain', 'Loss of Appetite',
  'Nausea', 'Palpitations', 'Runny Nose', 'Shortness of Breath', 'Skin Rash',
  'Sore Throat', 'Swelling', 'Toothache', 'Vomiting', 'Weakness',
];

export default function ConsultWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { queueItem, patient } = (location.state ?? {}) as { queueItem?: QueueItem; patient?: Patient };
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const {
    currentDraft, updateDraft, removeMedicine, removeLabTest, addMedicine, addLabTest,
    createPrescription, setQueueItemId, resetDraft,
  } = usePrescriptionStore();

  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [showLabTestModal, setShowLabTestModal] = useState(false);
  const [customSymptom, setCustomSymptom] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!queueItem || !patient) {
      navigate('/queue', { replace: true });
      return;
    }
    setQueueItemId(queueItem.id);
    updateDraft({
      patientId: patient.id,
      patientName: patient.name,
      patientAge: String(patient.age ?? ''),
      patientGender: patient.gender,
      patientWeight: patient.weight != null ? String(patient.weight) : '',
      patientPhone: patient.phone,
      consultationType: queueItem.consultationType,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!queueItem || !patient) return null;

  const symptoms = currentDraft.symptoms || [];

  const toggleSymptom = (s: string) => {
    updateDraft({ symptoms: symptoms.includes(s) ? symptoms.filter((x) => x !== s) : [...symptoms, s] });
  };

  const addCustomSymptom = () => {
    const s = customSymptom.trim();
    if (!s || symptoms.includes(s)) return;
    updateDraft({ symptoms: [...symptoms, s] });
    setCustomSymptom('');
  };

  const handlePreview = async () => {
    if (symptoms.length === 0 && !currentDraft.diagnosis) {
      toast.error('Please select at least one symptom or enter a diagnosis.');
      return;
    }
    if (currentDraft.medicines.length === 0 && currentDraft.labTests.length === 0) {
      toast.error('Add at least one medicine or lab test before continuing.');
      return;
    }
    if (!user?.id) {
      toast.error('Doctor session not found. Please re-login.');
      return;
    }
    setIsCreating(true);
    try {
      const prescription = await createPrescription(user.id);
      navigate(`/prescriptions/${prescription.id}/preview`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create prescription');
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    resetDraft();
    navigate('/queue');
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <button className="secondary-btn" onClick={handleBack}>← Back to queue</button>
      </div>

      <div className="item-card" style={{ cursor: 'default', marginBottom: 20 }}>
        <div>
          <div className="item-name">{patient.name}</div>
          <div className="item-meta">
            {patient.age} yrs · {patient.gender} · {patient.phone || '—'}
            {patient.weight ? ` · ${patient.weight} kg` : ''}
          </div>
          {patient.allergies && !['no', 'none', 'n/a', 'nil', '-'].includes(patient.allergies.toLowerCase().trim()) && (
            <div style={{ color: 'var(--color-error)', fontSize: '0.8125rem', marginTop: 4 }}>
              ⚠ Allergies: {patient.allergies}
            </div>
          )}
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-label">Diagnosis</label>
        <input
          className="auth-input"
          value={currentDraft.diagnosis}
          onChange={(e) => updateDraft({ diagnosis: e.target.value })}
          placeholder="e.g. Type 2 Diabetes"
        />
      </div>

      <div className="auth-field">
        <label className="auth-label">Symptoms *</label>
        <div className="chip-row">
          {COMMON_SYMPTOMS.map((s) => (
            <div key={s} className={`chip ${symptoms.includes(s) ? 'selected' : ''}`} onClick={() => toggleSymptom(s)}>
              {s}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            className="auth-input"
            placeholder="Add custom symptom..."
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomSymptom()}
          />
          <button className="secondary-btn" onClick={addCustomSymptom}>Add</button>
        </div>
      </div>

      <div className="auth-field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="auth-label">Medicines ({currentDraft.medicines.length})</label>
          <button className="secondary-btn" onClick={() => setShowMedicineModal(true)}>+ Add</button>
        </div>
        <div className="card-list">
          {currentDraft.medicines.map((m, i) => (
            <div key={i} className="item-card" style={{ cursor: 'default' }}>
              <div>
                <div className="item-name">{m.medicineName}</div>
                <div className="item-meta">{m.type}{m.dosage ? ` · ${m.dosage}` : ''}</div>
                <div className="item-meta">{[m.frequency, m.duration, m.timing].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="icon-btn" onClick={() => removeMedicine(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="auth-label">Lab Tests ({currentDraft.labTests.length})</label>
          <button className="secondary-btn" onClick={() => setShowLabTestModal(true)}>+ Add</button>
        </div>
        <div className="card-list">
          {currentDraft.labTests.map((t, i) => (
            <div key={i} className="item-card" style={{ cursor: 'default' }}>
              <div>
                <div className="item-name">{t.testName}</div>
                <div className="item-meta">{t.category}</div>
              </div>
              <button className="icon-btn" onClick={() => removeLabTest(i)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-label">Additional advice</label>
        <textarea
          className="auth-input"
          rows={3}
          value={currentDraft.advice}
          onChange={(e) => updateDraft({ advice: e.target.value })}
        />
      </div>

      <div className="auth-form-row">
        <div className="auth-field">
          <label className="auth-label">Referred to</label>
          <input className="auth-input" value={currentDraft.referredTo ?? ''} onChange={(e) => updateDraft({ referredTo: e.target.value })} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Follow-up date</label>
          <input
            className="auth-input"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={currentDraft.followUpDate}
            onChange={(e) => updateDraft({ followUpDate: e.target.value })}
          />
        </div>
      </div>

      <button className="primary-btn" style={{ width: '100%', padding: 14, marginTop: 12 }} disabled={isCreating} onClick={handlePreview}>
        {isCreating ? 'Creating...' : 'Preview Prescription'}
      </button>

      {showMedicineModal && (
        <MedicinePickerModal onClose={() => setShowMedicineModal(false)} onAdd={addMedicine} />
      )}
      {showLabTestModal && (
        <LabTestPickerModal onClose={() => setShowLabTestModal(false)} onAdd={(tests) => tests.forEach(addLabTest)} />
      )}
    </div>
  );
}
