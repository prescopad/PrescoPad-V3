import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePatientStore } from '../../store/usePatientStore';
import { Gender, BLOOD_GROUPS } from '../../types/patient.types';
import type { PatientFormData } from '../../types/patient.types';
import '../auth/auth.css';
import '../pages.css';

const emptyForm: PatientFormData = {
  name: '', age: '', gender: Gender.MALE, weight: '', phone: '', address: '', bloodGroup: '', allergies: '',
};

export default function PatientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { createPatient, updatePatient, getPatientById } = usePatientStore();

  const [form, setForm] = useState<PatientFormData>(emptyForm);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getPatientById(id).then((p) => {
      if (p) {
        setForm({
          name: p.name,
          age: String(p.age ?? ''),
          gender: p.gender,
          weight: p.weight != null ? String(p.weight) : '',
          phone: p.phone,
          address: p.address,
          bloodGroup: p.bloodGroup,
          allergies: p.allergies,
        });
      }
      setIsLoading(false);
    });
  }, [id, getPatientById]);

  const set = (patch: Partial<PatientFormData>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Please enter the patient\'s name.');
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      if (isEdit && id) {
        await updatePatient(id, form);
        navigate(`/patients/${id}`);
      } else {
        const created = await createPatient(form);
        navigate(`/patients/${created.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save patient.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <div className="page-title">{isEdit ? 'Edit Patient' : 'Add Patient'}</div>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="auth-field">
        <label className="auth-label">Full name *</label>
        <input className="auth-input" value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
      </div>

      <div className="auth-form-row">
        <div className="auth-field">
          <label className="auth-label">Age</label>
          <input className="auth-input" type="number" min={0} value={form.age} onChange={(e) => set({ age: e.target.value })} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Gender</label>
          <select className="auth-select" value={form.gender} onChange={(e) => set({ gender: e.target.value as PatientFormData['gender'] })}>
            <option value={Gender.MALE}>Male</option>
            <option value={Gender.FEMALE}>Female</option>
            <option value={Gender.OTHER}>Other</option>
          </select>
        </div>
      </div>

      <div className="auth-form-row">
        <div className="auth-field">
          <label className="auth-label">Weight (kg)</label>
          <input className="auth-input" type="number" min={0} value={form.weight} onChange={(e) => set({ weight: e.target.value })} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Blood group</label>
          <select className="auth-select" value={form.bloodGroup} onChange={(e) => set({ bloodGroup: e.target.value })}>
            <option value="">—</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-label">Phone</label>
        <input className="auth-input" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
      </div>

      <div className="auth-field">
        <label className="auth-label">Address</label>
        <input className="auth-input" value={form.address} onChange={(e) => set({ address: e.target.value })} />
      </div>

      <div className="auth-field">
        <label className="auth-label">Allergies</label>
        <input className="auth-input" value={form.allergies} onChange={(e) => set({ allergies: e.target.value })} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button type="button" className="primary-btn" disabled={isSaving} onClick={handleSubmit}>
          {isSaving ? 'Saving...' : 'Save patient'}
        </button>
        <button type="button" className="secondary-btn" onClick={() => navigate(-1)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
