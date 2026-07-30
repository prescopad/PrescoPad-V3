import { useState } from 'react';
import Portal from './Portal';
import { CloseIcon } from './icons';
import './modal.css';

interface SymptomModifierModalProps {
  symptomName: string;
  onConfirm: (formattedSymptom: string) => void;
  onClose: () => void;
}

const DURATIONS = ['1 Day', '2 Days', '3 Days', '5 Days', '1 Week', '2 Weeks', '1 Month'];
const PATTERNS = ['Intermittent', 'Continuous', 'Evening Rises', 'Sharp', 'Dull', 'Burning'];

// Symptom-specific severity options
const SYMPTOM_SEVERITIES: Record<string, string[]> = {
  'Fever': ['Low Grade (99–100°F)', 'Moderate (100–102°F)', 'High Grade (>102°F)'],
  'Headache': ['Mild', 'Moderate', 'Severe / Migraine'],
  'Chest Pain': ['Mild Discomfort', 'Moderate', 'Severe / Crushing'],
  'Abdominal Pain': ['Mild', 'Colicky', 'Severe'],
  'Back Pain': ['Mild', 'Moderate', 'Severe / Radiating'],
  'Shortness of Breath': ['On Exertion', 'At Rest', 'Acute / Distress'],
};
const DEFAULT_SEVERITIES = ['Mild', 'Moderate', 'Severe'];

export default function SymptomModifierModal({ symptomName, onConfirm, onClose }: SymptomModifierModalProps) {
  const severities = SYMPTOM_SEVERITIES[symptomName] || DEFAULT_SEVERITIES;
  const [selectedSeverity, setSelectedSeverity] = useState(severities[0]);
  const [selectedDuration, setSelectedDuration] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('');

  const effectiveDuration = customDuration.trim()
    ? customDuration.trim()
    : selectedDuration;

  const preview = [selectedSeverity, effectiveDuration, selectedPattern]
    .filter(Boolean)
    .join(', ');
  const formattedPreview = preview ? `${symptomName} (${preview})` : symptomName;

  const handleApply = () => {
    onConfirm(formattedPreview);
    onClose();
  };

  const getChipStyle = (isSelected: boolean, color = '#0284c7') => ({
    padding: '7px 14px',
    borderRadius: '20px',
    fontSize: '0.8125rem',
    fontWeight: isSelected ? 700 : 500,
    cursor: 'pointer',
    border: isSelected ? `1px solid ${color}` : '1px solid var(--color-border)',
    backgroundColor: isSelected ? color : 'var(--color-surface)',
    color: isSelected ? '#ffffff' : 'var(--color-text)',
    boxShadow: isSelected ? `0 2px 6px ${color}40` : 'none',
    transition: 'all 0.15s ease-in-out',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  });

  const severityColor = (s: string) => {
    if (s.toLowerCase().includes('high') || s.toLowerCase().includes('severe') || s.toLowerCase().includes('>102')) return '#dc2626';
    if (s.toLowerCase().includes('moderate') || s.toLowerCase().includes('100–102')) return '#d97706';
    return '#16a34a';
  };

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-dialog" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header" style={{ paddingBottom: 12, borderBottom: '1px solid var(--color-border-light)' }}>
            <h3 className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚡</span> Symptom Details — "{symptomName}"
            </h3>
            <button type="button" className="modal-close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body" style={{ padding: '16px 20px' }}>

            {/* Severity */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                🔥 Severity
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {severities.map((s) => {
                  const isSelected = selectedSeverity === s;
                  const color = severityColor(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      style={getChipStyle(isSelected, color)}
                      onClick={() => setSelectedSeverity(s)}
                    >
                      {isSelected ? '✓ ' : ''}{s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration — chips + custom input */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                ⏱️ Duration / Since
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {DURATIONS.map((d) => {
                  const isSelected = selectedDuration === d && !customDuration.trim();
                  return (
                    <button
                      key={d}
                      type="button"
                      style={getChipStyle(isSelected)}
                      onClick={() => { setSelectedDuration(d); setCustomDuration(''); }}
                    >
                      {isSelected ? '✓ ' : ''}{d}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                className="auth-input"
                style={{ fontSize: '0.85rem', padding: '7px 12px' }}
                placeholder="Or type custom, e.g. Since 4 days, Since morning..."
                value={customDuration}
                onChange={(e) => { setCustomDuration(e.target.value); setSelectedDuration(''); }}
              />
            </div>

            {/* Pattern */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                🌀 Pattern / Type <span style={{ fontWeight: 400, textTransform: 'none' }}>(Optional)</span>
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

            {/* Live Preview */}
            <div style={{ background: 'var(--color-surface-secondary)', border: '1px dashed var(--color-primary)', borderRadius: 8, padding: '10px 14px', fontSize: '0.875rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Preview</span>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formattedPreview}</span>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 12 }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-btn" onClick={handleApply}>+ Add to Prescription</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

