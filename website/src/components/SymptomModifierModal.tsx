import { useState } from 'react';
import Portal from './Portal';
import { CloseIcon } from './icons';
import './modal.css';

interface SymptomModifierModalProps {
  symptomName: string;
  onConfirm: (formattedSymptom: string) => void;
  onClose: () => void;
}

const SEVERITIES = ['Mild', 'Moderate', 'High'];
const DURATIONS = ['1 Day', '2 Days', '3 Days', '5 Days', '1 Week', '2 Weeks', '1 Month'];
const PATTERNS = ['Intermittent', 'Continuous', 'Evening Rises', 'Sharp', 'Dull'];

export default function SymptomModifierModal({ symptomName, onConfirm, onClose }: SymptomModifierModalProps) {
  const [selectedSeverity, setSelectedSeverity] = useState('Mild');
  const [selectedDuration, setSelectedDuration] = useState('1 Day');
  const [selectedPattern, setSelectedPattern] = useState('');

  const handleApply = () => {
    const modifiers = [selectedSeverity, selectedDuration, selectedPattern].filter(Boolean);
    const result = modifiers.length > 0 ? `${symptomName} (${modifiers.join(', ')})` : symptomName;
    onConfirm(result);
    onClose();
  };

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">⚡ Options for {symptomName}</h3>
            <button type="button" className="modal-close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body">
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                Severity
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`filter-btn ${selectedSeverity === s ? 'active' : ''}`}
                    onClick={() => setSelectedSeverity(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                Duration
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`filter-btn ${selectedDuration === d ? 'active' : ''}`}
                    onClick={() => setSelectedDuration(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                Pattern / Type (Optional)
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PATTERNS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`filter-btn ${selectedPattern === p ? 'active' : ''}`}
                    onClick={() => setSelectedPattern(selectedPattern === p ? '' : p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-btn" onClick={handleApply}>Add Symptom</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
