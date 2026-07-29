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

  const handleSave = () => {
    onSave({
      bp,
      pulse,
      temp,
      spo2,
      weight,
      height,
      bmi: calculateBmi(),
      bloodSugar,
    });
    onClose();
  };

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">📈 Patient Vitals</h3>
            <button type="button" className="modal-close" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="form-label">Blood Pressure (mmHg)</label>
                <input className="form-input" placeholder="120/80" value={bp} onChange={(e) => setBp(e.target.value)} />
              </div>

              <div>
                <label className="form-label">Pulse Rate (bpm)</label>
                <input className="form-input" placeholder="72" value={pulse} onChange={(e) => setPulse(e.target.value)} />
              </div>

              <div>
                <label className="form-label">Temperature (°F)</label>
                <input className="form-input" placeholder="98.6" value={temp} onChange={(e) => setTemp(e.target.value)} />
              </div>

              <div>
                <label className="form-label">SpO2 (%)</label>
                <input className="form-input" placeholder="98" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
              </div>

              <div>
                <label className="form-label">Weight (kg)</label>
                <input className="form-input" placeholder="65" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>

              <div>
                <label className="form-label">Height (cm)</label>
                <input className="form-input" placeholder="170" value={height} onChange={(e) => setHeight(e.target.value)} />
              </div>

              <div>
                <label className="form-label">Blood Sugar (mg/dL)</label>
                <input className="form-input" placeholder="110" value={bloodSugar} onChange={(e) => setBloodSugar(e.target.value)} />
              </div>

              <div>
                <label className="form-label">BMI (Calculated)</label>
                <input className="form-input" value={calculateBmi() || '--'} disabled style={{ fontWeight: 700, color: 'var(--color-primary)' }} />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-btn" onClick={handleSave}>Save Vitals</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
