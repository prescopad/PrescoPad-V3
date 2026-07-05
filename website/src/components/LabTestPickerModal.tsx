import { useEffect, useState } from 'react';
import { LAB_TEST_CATEGORIES } from '../types/medicine.types';
import type { LabTest } from '../types/medicine.types';
import type { PrescriptionLabTest } from '../types/prescription.types';
import * as DataService from '../api/dataService';
import './modal.css';

type LabTestDraft = Omit<PrescriptionLabTest, 'id' | 'prescriptionId'>;

interface Props {
  onClose: () => void;
  onAdd: (tests: LabTestDraft[]) => void;
}

export default function LabTestPickerModal({ onClose, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [selected, setSelected] = useState<Map<string, LabTestDraft>>(new Map());
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<string>(LAB_TEST_CATEGORIES[0]);

  useEffect(() => {
    const fetcher = query.trim()
      ? DataService.searchAllLabTests(query)
      : category
        ? DataService.getLabTestsByCategory(category)
        : DataService.getAllFrequentLabTests();
    fetcher.then(setTests).catch(() => setTests([]));
  }, [query, category]);

  const toggleSelect = (test: LabTest) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(test.id)) next.delete(test.id);
      else next.set(test.id, { testName: test.name, category: test.category, notes: '' });
      return next;
    });
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    try {
      const custom = await DataService.addCustomLabTest(customName.trim(), customCategory);
      setSelected((prev) => new Map(prev).set(custom.id, { testName: custom.name, category: custom.category, notes: '' }));
      setShowCustomForm(false);
      setCustomName('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to add custom test');
    }
  };

  const handleConfirm = () => {
    const drafts = Array.from(selected.values());
    if (drafts.length === 0) return;
    onAdd(drafts);
    selected.forEach((_, id) => {
      const t = tests.find((x) => x.id === id);
      if (t) DataService.incrementLabTestUsage(t.name, t.isCustom).catch(() => {});
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Lab Tests</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <input
            className="auth-input"
            placeholder="Search lab tests..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCategory(null); }}
            style={{ marginBottom: 12 }}
            autoFocus
          />
          {!query.trim() && (
            <div className="chip-row">
              {LAB_TEST_CATEGORIES.map((c) => (
                <div key={c} className={`chip ${category === c ? 'selected' : ''}`} onClick={() => setCategory(category === c ? null : c)}>
                  {c}
                </div>
              ))}
            </div>
          )}

          <div className="pick-list">
            {tests.map((t) => (
              <div key={t.id} className={`pick-item ${selected.has(t.id) ? 'selected' : ''}`} onClick={() => toggleSelect(t)}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t.category}</div>
                </div>
                {selected.has(t.id) && <span>✓</span>}
              </div>
            ))}
            {!showCustomForm && (
              <div className="pick-item" onClick={() => { setShowCustomForm(true); setCustomName(query); }} style={{ borderStyle: 'dashed' }}>
                + Add custom test{query ? `: "${query}"` : ''}
              </div>
            )}
          </div>

          {showCustomForm && (
            <div style={{ marginTop: 12 }}>
              <label className="auth-label">Test name</label>
              <input className="auth-input" value={customName} onChange={(e) => setCustomName(e.target.value)} style={{ marginBottom: 10 }} />
              <label className="auth-label">Category</label>
              <select className="auth-select" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} style={{ marginBottom: 10 }}>
                {LAB_TEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="secondary-btn" onClick={handleAddCustom}>Save custom test</button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onClose}>Cancel</button>
          <button className="primary-btn" disabled={selected.size === 0} onClick={handleConfirm}>
            Add {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
