import { useState } from 'react';
import { CloseIcon } from './icons';
import './modal.css';

interface Props {
  isOpen: boolean;
  patientName: string;
  onClose: () => void;
  onConfirm: (type: 'new' | 'follow_up', notes: string) => void;
  isSubmitting?: boolean;
}

export default function ConsultTypeModal({ isOpen, patientName, onClose, onConfirm, isSubmitting }: Props) {
  const [type, setType] = useState<'new' | 'follow_up'>('new');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(type, notes.trim());
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div className="modal-title">Consultation Type</div>
          <button className="modal-close" onClick={onClose}><CloseIcon /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Select the consult type and add optional notes for <strong style={{ color: 'var(--color-text)' }}>{patientName}</strong>.
            </p>

            {/* Selection Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                onClick={() => setType('new')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${type === 'new' ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                  background: type === 'new' ? 'var(--color-primary-surface)' : 'var(--color-white)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: 'var(--color-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                  }}
                >
                  N
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)' }}>New Consultation</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>First or new visit for this patient</div>
                </div>
              </div>

              <div
                onClick={() => setType('follow_up')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${type === 'follow_up' ? 'var(--color-primary)' : 'var(--color-border-light)'}`,
                  background: type === 'follow_up' ? 'var(--color-primary-surface)' : 'var(--color-white)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#d97706',
                    color: 'var(--color-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                  }}
                >
                  F
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)' }}>Follow-up</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>Returning patient review/follow-up</div>
                </div>
              </div>
            </div>

            {/* Queue Notes Input */}
            <div className="auth-field" style={{ margin: 0 }}>
              <label className="auth-label">Queue Notes (optional)</label>
              <input
                className="auth-input"
                placeholder="e.g. Fever check, dressing, stomach pain"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add to Queue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
