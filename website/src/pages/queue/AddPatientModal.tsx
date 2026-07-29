import { useState, useEffect } from 'react';
import type { Patient } from '../../types/patient.types';
import * as DataService from '../../api/dataService';
import { useQueueStore } from '../../store/useQueueStore';
import { useToast } from '../../components/toast/ToastContext';
import { CloseIcon } from '../../components/icons';
import '../../components/modal.css';
import '../auth/auth.css';

interface Props {
  onClose: () => void;
}

export default function AddPatientModal({ onClose }: Props) {
  const toast = useToast();
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const [activeTab, setActiveTab] = useState<'search' | 'new'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Patient Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');
  const [consultationType, setConsultationType] = useState<'new' | 'follow_up'>('new');
  const [isMlc, setIsMlc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (activeTab !== 'search') return;
    setIsLoading(true);
    DataService.getPatients(searchQuery, 20, 0)
      .then(setPatients)
      .catch(() => setPatients([]))
      .finally(() => setIsLoading(false));
  }, [activeTab, searchQuery]);

  const handleSelectExisting = async (p: Patient) => {
    try {
      await addToQueue(p.id, 'Doctor', notes.trim() || undefined, consultationType);
      toast.success(`Added ${p.name} to queue!`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add to queue');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'search') return;
    if (!name.trim()) {
      toast.error('Patient name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await DataService.createPatient({
        name: name.trim(),
        age: age.trim(),
        gender,
        weight: '',
        phone: phone.trim(),
        address: address.trim(),
        bloodGroup: '',
        allergies: allergies.trim(),
        isMlc,
      });
      await addToQueue(created.id, 'Doctor', notes.trim() || undefined, consultationType);
      toast.success(`Registered & added ${created.name} to queue!`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal-dialog"
        style={{ maxWidth: 540 }}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span className="modal-title">➕ Add Patient to Queue</span>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal (Esc)">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="tab-row" style={{ width: '100%', marginBottom: 16 }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setActiveTab('search')}
            >
              🔍 Search Existing
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'new' ? 'active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setActiveTab('new')}
            >
              👤 Register New
            </button>
          </div>

          {activeTab === 'search' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                className="auth-input"
                placeholder="Search patient by name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />

              <div className="card-list" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {isLoading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>Searching patients...</div>}
                {!isLoading && patients.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>No matching patients found.</div>
                )}
                {patients.map((p) => (
                  <div key={p.id} className="item-card" onClick={() => handleSelectExisting(p)}>
                    <div>
                      <div className="item-name">{p.name}</div>
                      <div className="item-meta">{p.age} yrs · {p.gender} · {p.phone || 'No phone'}</div>
                    </div>
                    <button type="button" className="secondary-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                      + Add to Queue
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="auth-field">
                <label className="auth-label">Full Name *</label>
                <input className="auth-input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" autoFocus />
              </div>

              <div className="auth-form-row">
                <div className="auth-field">
                  <label className="auth-label">Age (Years)</label>
                  <input className="auth-input" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 32" />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Gender</label>
                  <select className="auth-input" value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other')}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="auth-form-row">
                <div className="auth-field">
                  <label className="auth-label">Phone Number</label>
                  <input className="auth-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Visit Type</label>
                  <select className="auth-input" value={consultationType} onChange={(e) => setConsultationType(e.target.value as 'new' | 'follow_up')}>
                    <option value="new">New Patient Visit</option>
                    <option value="follow_up">Follow-Up Visit</option>
                  </select>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Address</label>
                <input className="auth-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City / Area / Street" />
              </div>

              <div className="auth-field">
                <label className="auth-label">Known Allergies</label>
                <input className="auth-input" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin, Dust, Sulfa" />
              </div>

              <div className="auth-field">
                <label className="auth-label">Queue Notes</label>
                <input className="auth-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. High BP, Needs urgent consultation" />
              </div>

              <div className="auth-field" style={{ background: isMlc ? '#fef2f2' : undefined, padding: isMlc ? 10 : undefined, borderRadius: 6, border: isMlc ? '1px solid #fca5a5' : undefined }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, color: isMlc ? '#dc2626' : 'var(--color-text)', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={isMlc}
                    onChange={(e) => setIsMlc(e.target.checked)}
                  />
                  🚨 MLC / Police / Accident Case Involved
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>Cancel (Esc)</button>
          {activeTab === 'new' && (
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register & Add to Queue'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
