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

  useEffect(() => {
    if (!category) return;
    const fetcher = category.label === 'Other'
      ? DataService.getMedicinesOutsideCategories(EXPLICIT_TYPES, query)
      : DataService.getMedicinesByCategory(category.types, query);
    fetcher.then(setMedicines).catch(() => setMedicines([]));
  }, [category, query]);

  const handleSelectCategory = (c: Category) => {
    setCategory(c);
    setSelectedType(c.types[0] ?? MedicineType.TABLET);
  };

  const handleSelectMedicine = (med: Medicine) => {
    setSelected(med);
    setSelectedType(med.type || MedicineType.TABLET);
    setDosage(med.strength || '');
    setShowCustomForm(false);
  };

  const handleShowCustomForm = () => {
    setSelected(null);
    setShowCustomForm(true);
    setCustomName(query);
    setSelectedType(category?.types[0] ?? MedicineType.TABLET);
  };

  const handleAdd = async () => {
    if (showCustomForm) {
      if (!customName.trim()) return;
      try {
        const custom = await DataService.addCustomMedicine(customName.trim(), selectedType, customStrength);
        onAdd({ medicineName: custom.name, type: selectedType, dosage: customStrength, frequency, duration, timing, notes });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to add custom medicine');
        return;
      }
    } else if (selected) {
      onAdd({ medicineName: selected.name, type: selectedType, dosage, frequency, duration, timing, notes });
      DataService.incrementMedicineUsage(selected.name, selected.isCustom).catch(() => {});
    }
    onClose();
  };

  const showDosageForm = selected || showCustomForm;

  return (
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
                <div className="pick-item" onClick={handleShowCustomForm} style={{ borderStyle: 'dashed' }}>
                  + Add custom medicine{query ? `: "${query}"` : ''}
                </div>
              </div>
            </>
          )}

          {showDosageForm && (
            <div>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>
                {selected ? selected.name : customName} — Dosage Details
              </div>

              {showCustomForm && (
                <>
                  <label className="auth-label">Medicine name *</label>
                  <input className="auth-input" value={customName} onChange={(e) => setCustomName(e.target.value)} style={{ marginBottom: 12 }} />
                  <label className="auth-label">Type</label>
                  <div className="chip-row">
                    {Object.values(MedicineType).map((t) => (
                      <div key={t} className={`chip ${selectedType === t ? 'selected' : ''}`} onClick={() => setSelectedType(t)}>
                        {t}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <label className="auth-label">{showCustomForm ? 'Strength' : 'Dosage'}</label>
              <input
                className="auth-input"
                placeholder={getDosageHint(selectedType)}
                value={showCustomForm ? customStrength : dosage}
                onChange={(e) => (showCustomForm ? setCustomStrength(e.target.value) : setDosage(e.target.value))}
                style={{ marginBottom: 12 }}
              />

              <label className="auth-label">Frequency</label>
              <div className="chip-row">
                {FREQUENCY_OPTIONS.map((f) => (
                  <div key={f} className={`chip ${frequency === f ? 'selected' : ''}`} onClick={() => setFrequency(f)}>{f}</div>
                ))}
              </div>

              <label className="auth-label">Duration</label>
              <div className="chip-row">
                {DURATION_OPTIONS.map((d) => (
                  <div key={d} className={`chip ${duration === d ? 'selected' : ''}`} onClick={() => setDuration(d)}>{d}</div>
                ))}
              </div>

              <label className="auth-label">Timing</label>
              <div className="chip-row">
                {TIMING_OPTIONS.map((t) => (
                  <div key={t} className={`chip ${timing === t ? 'selected' : ''}`} onClick={() => setTiming(t)}>{t}</div>
                ))}
              </div>

              <label className="auth-label">Notes (optional)</label>
              <input className="auth-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
        </div>
        <div className="modal-footer">
          {(category || showDosageForm) && (
            <button
              className="secondary-btn"
              onClick={() => {
                if (showDosageForm) { setSelected(null); setShowCustomForm(false); }
                else setCategory(null);
              }}
            >
              Back
            </button>
          )}
          {showDosageForm && (
            <button className="primary-btn" onClick={handleAdd}>Add Medicine</button>
          )}
        </div>
      </div>
    </div>
  );
}
