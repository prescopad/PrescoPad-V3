import { useState } from 'react';
import type { Vitals } from '../types/prescription.types';
import Portal from './Portal';
import { CloseIcon } from './icons';
import './modal.css';

interface VitalsModalProps {
  initialVitals?: Vitals;
  onSave: (vitals: Vitals) => void;
  onClose: () => void;
}

export default function VitalsModal({ initialVitals, onSave, onClose }: VitalsModalProps) {
  const [bp, setBp] = useState(initialVitals?.bp || '');
  const [pulse, setPulse] = useState(initialVitals?.pulse || '');
  const [temp, setTemp] = useState(initialVitals?.temp || '');
  const [spo2, setSpo2] = useState(initialVitals?.spo2 || '');
  const [weight, setWeight] = useState(initialVitals?.weight || '');
  const [height, setHeight] = useState(initialVitals?.height || '');
  const [bloodSugar, setBloodSugar] = useState(initialVitals?.bloodSugar || '');

  const calculateBmi = (): string => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (w > 0 && h > 0) return (w / (h * h)).toFixed(1);
    return initialVitals?.bmi || '';
  };

  const bmiVal = calculateBmi();

  const handleSave = () => {
    onSave({
      bp,
      pulse,
      temp,
      spo2,
      weight,
      height,
      bmi: bmiVal,
      bloodSugar,
    });
    onClose();
  };

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header" style={{ paddingBottom: 12, borderBottom: '1px solid var(--color-border-light)' }}>
            <h3 className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📊</span> Patient Clinical Vitals
            </h3>
            <button type="button" className="modal-close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 5 }}>
                  Blood Pressure (mmHg)
                </label>
                <input
                  className="auth-input"
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                  placeholder="e.g. 120/80"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 5 }}>
                  Pulse Rate (bpm)
                </label>
                <input
                  className="auth-input"
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                  placeholder="e.g. 72"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 5 }}>
                  Temperature (°F)
                </label>
                <input
                  className="auth-input"
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                  placeholder="e.g. 98.6"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 5 }}>
                  SpO2 (%)
                </label>
                <input
                  className="auth-input"
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                  placeholder="e.g. 98"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 5 }}>
                  Weight (kg)
                </label>
                <input
                  className="auth-input"
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                  placeholder="e.g. 65"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 5 }}>
                  Height (cm)
                </label>
                <input
                  className="auth-input"
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                  placeholder="e.g. 170"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 5 }}>
                  Blood Sugar (mg/dL)
                </label>
                <input
                  className="auth-input"
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                  placeholder="e.g. 110"
                  value={bloodSugar}
                  onChange={(e) => setBloodSugar(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text)', display: 'block', marginBottom: 5 }}>
                  BMI (Auto Calculated)
                </label>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-secondary)',
                    fontWeight: 800,
                    fontSize: '0.9375rem',
                    color: bmiVal ? '#0284c7' : 'var(--color-text-muted)',
                  }}
                >
                  {bmiVal ? `${bmiVal} kg/m²` : '--'}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 12 }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-btn" onClick={handleSave}>Save Vitals</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
