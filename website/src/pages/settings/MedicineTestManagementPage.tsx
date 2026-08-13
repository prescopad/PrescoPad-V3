import { useEffect, useState } from 'react';
import {
  getAllCustomMedicines,
  getAllCustomLabTests,
  addCustomMedicine,
  addCustomLabTest,
  deleteCustomMedicine,
  deleteCustomLabTest,
} from '../../api/dataService';
import { useAuthStore } from '../../store/useAuthStore';
import { MedicineType, LAB_TEST_CATEGORIES } from '../../types/medicine.types';
import type { Medicine, LabTest } from '../../types/medicine.types';
import { useToast } from '../../components/toast/ToastContext';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import { CloseIcon } from '../../components/icons';
import Portal from '../../components/Portal';
import '../pages.css';
import '../auth/auth.css';
import '../../components/modal.css';

export default function MedicineTestManagementPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<'medicines' | 'tests'>('medicines');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [query, setQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<string>(MedicineType.TABLET);
  const [formStrength, setFormStrength] = useState('');
  const [formCategory, setFormCategory] = useState<string>(LAB_TEST_CATEGORIES[0]);

  const loadMedicines = async () => {
    setMedicines(await getAllCustomMedicines(1000));
  };

  const loadTests = async () => {
    setTests(await getAllCustomLabTests(1000));
  };

  useEffect(() => {
    if (!user?.clinicId) return;
    if (tab === 'medicines') loadMedicines();
    else loadTests();
  }, [tab, user?.clinicId]);

  const filteredMedicines = medicines.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));
  const filteredTests = tests.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));

  const resetForm = () => {
    setFormName('');
    setFormType(MedicineType.TABLET);
    setFormStrength('');
    setFormCategory(LAB_TEST_CATEGORIES[0]);
  };

  const handleAdd = async () => {
    if (!formName.trim()) return;
    try {
      if (tab === 'medicines') {
        await addCustomMedicine(formName.trim(), formType, formStrength);
        await loadMedicines();
        toast.success(`Added custom medicine "${formName.trim()}"`);
      } else {
        await addCustomLabTest(formName.trim(), formCategory);
        await loadTests();
        toast.success(`Added custom lab test "${formName.trim()}"`);
      }
      setShowAddModal(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add custom item');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirm({ title: 'Delete entry', message: `Delete "${name}" from custom catalog?`, danger: true }))) return;
    try {
      if (tab === 'medicines') {
        await deleteCustomMedicine(id);
        await loadMedicines();
      } else {
        await deleteCustomLabTest(id);
        await loadTests();
      }
      toast.success(`Deleted ${name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Custom Medicines & Lab Tests</div>
          <div className="page-subtitle">Manage clinic-specific medicine catalog and diagnostic test library</div>
        </div>
        <button className="primary-btn" onClick={() => { resetForm(); setShowAddModal(true); }}>
          + Add Custom {tab === 'medicines' ? 'Medicine' : 'Lab Test'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="tab-row" style={{ marginBottom: 0 }}>
          <button className={`tab-btn ${tab === 'medicines' ? 'active' : ''}`} onClick={() => setTab('medicines')}>Custom Medicines ({medicines.length})</button>
          <button className={`tab-btn ${tab === 'tests' ? 'active' : ''}`} onClick={() => setTab('tests')}>Custom Lab Tests ({tests.length})</button>
        </div>

        <input
          className="auth-input"
          style={{ maxWidth: 300 }}
          placeholder={`Search custom ${tab}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="card-list">
        {tab === 'medicines' ? (
          <>
            {filteredMedicines.length === 0 && (
              <div className="empty-state">No custom medicines found. Click "+ Add Custom Medicine" to create one.</div>
            )}
            {filteredMedicines.map((m) => (
              <div key={m.id} className="item-card" style={{ cursor: 'default' }}>
                <div>
                  <div className="item-name">{m.name}</div>
                  <div className="item-meta">{m.type}{m.strength ? ` · ${m.strength}` : ''}</div>
                </div>
                <button className="icon-btn" onClick={() => handleDelete(m.id, m.name)} title="Delete custom medicine">
                  <CloseIcon size={16} />
                </button>
              </div>
            ))}
          </>
        ) : (
          <>
            {filteredTests.length === 0 && (
              <div className="empty-state">No custom lab tests found. Click "+ Add Custom Lab Test" to create one.</div>
            )}
            {filteredTests.map((t) => (
              <div key={t.id} className="item-card" style={{ cursor: 'default' }}>
                <div>
                  <div className="item-name">{t.name}</div>
                  <div className="item-meta">{t.category}</div>
                </div>
                <button className="icon-btn" onClick={() => handleDelete(t.id, t.name)} title="Delete custom lab test">
                  <CloseIcon size={16} />
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {showAddModal && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div className="modal-header">
                <span className="modal-title">Add Custom {tab === 'medicines' ? 'Medicine' : 'Lab Test'}</span>
                <button className="modal-close-btn" onClick={() => setShowAddModal(false)}><CloseIcon size={18} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="auth-field">
                  <label className="auth-label">Name *</label>
                  <input className="auth-input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Paracetamol 650mg" autoFocus />
                </div>

                {tab === 'medicines' ? (
                  <>
                    <div className="auth-field">
                      <label className="auth-label">Medicine Form / Type</label>
                      <select className="auth-input" value={formType} onChange={(e) => setFormType(e.target.value)}>
                        {Object.values(MedicineType).map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="auth-field">
                      <label className="auth-label">Dose / Strength</label>
                      <input className="auth-input" value={formStrength} onChange={(e) => setFormStrength(e.target.value)} placeholder="e.g. 500mg or 10ml" />
                    </div>
                  </>
                ) : (
                  <div className="auth-field">
                    <label className="auth-label">Category</label>
                    <select className="auth-input" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                      {LAB_TEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="secondary-btn" onClick={() => setShowAddModal(false)}>Cancel (Esc)</button>
                <button className="primary-btn" disabled={!formName.trim()} onClick={handleAdd}>Save to Catalog</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
