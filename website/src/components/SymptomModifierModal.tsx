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

  const getChipStyle = (isSelected: boolean) => ({
    padding: '7px 14px',
    borderRadius: '20px',
    fontSize: '0.8125rem',
    fontWeight: isSelected ? 700 : 500,
    cursor: 'pointer',
    border: isSelected ? '1px solid #0284c7' : '1px solid var(--color-border)',
    backgroundColor: isSelected ? '#0284c7' : 'var(--color-surface)',
    color: isSelected ? '#ffffff' : 'var(--color-text)',
    boxShadow: isSelected ? '0 2px 6px rgba(2, 132, 199, 0.25)' : 'none',
    transition: 'all 0.15s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  });

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header" style={{ paddingBottom: 12, borderBottom: '1px solid var(--color-border-light)' }}>
            <h3 className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚡</span> Symptom Details for "{symptomName}"
            </h3>
            <button type="button" className="modal-close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body" style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                🔥 Severity
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SEVERITIES.map((s) => {
                  const isSelected = selectedSeverity === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      style={getChipStyle(isSelected)}
                      onClick={() => setSelectedSeverity(s)}
                    >
                      {isSelected ? '✓ ' : ''}{s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                ⏱️ Duration
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {DURATIONS.map((d) => {
                  const isSelected = selectedDuration === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      style={getChipStyle(isSelected)}
                      onClick={() => setSelectedDuration(d)}
                    >
                      {isSelected ? '✓ ' : ''}{d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                🌀 Pattern / Type (Optional)
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PATTERNS.map((p) => {
                  const isSelected = selectedPattern === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      style={getChipStyle(isSelected)}
                      onClick={() => setSelectedPattern(isSelected ? '' : p)}
                    >
                      {isSelected ? '✓ ' : ''}{p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 12 }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-btn" onClick={handleApply}>+ Add Symptom to Draft</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
