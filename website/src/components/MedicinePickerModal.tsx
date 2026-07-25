import { useEffect, useState } from 'react';
import {
  MedicineType,
  getDosageHint,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
  TIMING_OPTIONS,
} from '../types/medicine.types';
import type { Medicine } from '../types/medicine.types';
import type { PrescriptionMedicine } from '../types/prescription.types';
import * as DataService from '../api/dataService';
import { useToast } from './toast/ToastContext';
import { CloseIcon } from './icons';
import Portal from './Portal';
import './modal.css';

type MedicineDraft = Omit<PrescriptionMedicine, 'id' | 'prescriptionId'>;

interface Category {
  label: string;
  types: string[];
}

const CATEGORIES: Category[] = [
  { label: 'Tablet', types: [MedicineType.TABLET] },
  { label: 'Capsule', types: [MedicineType.CAPSULE] },
  { label: 'Syrup', types: [MedicineType.SYRUP] },
  { label: 'Injection', types: [MedicineType.INJECTION] },
  { label: 'Ointment/Cream', types: [MedicineType.OINTMENT, MedicineType.CREAM] },
  { label: 'Drops', types: [MedicineType.DROPS] },
  { label: 'Inhaler', types: [MedicineType.INHALER] },
  { label: 'Other', types: [] },
];

const EXPLICIT_TYPES = CATEGORIES.filter((c) => c.label !== 'Other').flatMap((c) => c.types);

interface Props {
  onClose: () => void;
  onAdd: (med: MedicineDraft) => void;
}

export default function MedicinePickerModal({ onClose, onAdd }: Props) {
  const toast = useToast();
  const [category, setCategory] = useState<Category | null>(null);
  const [query, setQuery] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selected, setSelected] = useState<Medicine | null>(null);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [selectedType, setSelectedType] = useState<string>(MedicineType.TABLET);
  const [dosage, setDosage] = useState('');
  const [customStrength, setCustomStrength] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [timing, setTiming] = useState('');
  const [notes, setNotes] = useState('');

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!category) return;
    const fetcher = category.label === 'Other'
      ? DataService.getMedicinesOutsideCategories(EXPLICIT_TYPES, query)
      : DataService.getMedicinesByCategory(category.types, query);
    fetcher.then(setMedicines).catch(() => setMedicines([]));
  }, [category, query]);

  const handleSelectCategory = (c: Category) => {
    setCategory(c);
    if (c.types.length > 0) setSelectedType(c.types[0]);
  };

  const handleSelectMedicine = (m: Medicine) => {
    setSelected(m);
    setSelectedType(m.type);
    setDosage(getDosageHint(m.type));
  };

  const handleCreateCustom = () => {
    setShowCustomForm(true);
    if (category && category.types.length > 0) setSelectedType(category.types[0]);
  };

  const handleAdd = () => {
    const name = selected ? selected.name : customName.trim();
    if (!name) {
      toast.error('Medicine name is required');
      return;
    }
    const strength = selected ? selected.strength : customStrength;
    onAdd({
      medicineName: strength ? `${name} ${strength}` : name,
      type: selectedType,
      dosage,
      frequency,
      duration,
      timing,
      notes,
    });
    toast.success(`Added ${name}`);
    onClose();
  };

  const showDosageForm = selected || showCustomForm;

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">Add Medicine</div>
            <button className="modal-close" onClick={onClose}><CloseIcon /></button>
          </div>
          <div className="modal-body">
            {!category && (
              <div className="category-grid">
                {CATEGORIES.map((c) => (
                  <div key={c.label} className="category-card" onClick={() => handleSelectCategory(c)}>
                    {c.label}
                  </div>
                ))}
              </div>
            )}

            {category && !showDosageForm && (
              <>
                <input
                  className="auth-input"
                  placeholder={`Search ${category.label.toLowerCase()}...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  style={{ marginBottom: 12 }}
                />
                <div className="pick-list">
                  {medicines.map((m) => (
                    <div key={m.id} className="pick-item" onClick={() => handleSelectMedicine(m)}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {m.type}{m.strength ? ` · ${m.strength}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pick-item" style={{ fontStyle: 'italic', color: 'var(--color-primary)' }} onClick={handleCreateCustom}>
                    + Add custom medicine...
                  </div>
                </div>
              </>
            )}

            {showDosageForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {!selected && (
                  <>
                    <input
                      className="auth-input"
                      placeholder="Medicine name *"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      autoFocus
                    />
                    <div className="auth-form-row">
                      <select className="auth-select" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                        {Object.values(MedicineType).map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input className="auth-input" placeholder="Strength (e.g. 500mg)" value={customStrength} onChange={(e) => setCustomStrength(e.target.value)} />
                    </div>
                  </>
                )}

                {selected && (
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>
                    {selected.name} {selected.strength}
                  </div>
                )}

                <div>
                  <div className="auth-label">Dosage</div>
                  <input className="auth-input" placeholder="e.g. 1 tab, 5 ml" value={dosage} onChange={(e) => setDosage(e.target.value)} />
                </div>

                <div>
                  <div className="auth-label">Frequency</div>
                  <div className="chip-row">
                    {FREQUENCY_OPTIONS.map((f) => (
                      <button key={f} type="button" className={`chip ${frequency === f ? 'selected' : ''}`} onClick={() => setFrequency(f)}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="auth-label">Duration</div>
                  <div className="chip-row">
                    {DURATION_OPTIONS.map((d) => (
                      <button key={d} type="button" className={`chip ${duration === d ? 'selected' : ''}`} onClick={() => setDuration(d)}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="auth-label">Timing</div>
                  <div className="chip-row">
                    {TIMING_OPTIONS.map((t) => (
                      <button key={t} type="button" className={`chip ${timing === t ? 'selected' : ''}`} onClick={() => setTiming(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="auth-label">Notes (Optional)</div>
                  <input className="auth-input" placeholder="e.g. If pain persists" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-btn" onClick={() => {
              if (showDosageForm) { setSelected(null); setShowCustomForm(false); }
              else if (category) { setCategory(null); }
              else { onClose(); }
            }}>
              Back
            </button>
            {showDosageForm && (
              <button type="button" className="primary-btn" onClick={handleAdd}>
                Add to Prescription
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
