import { useEffect, useState } from 'react';
import api from '../../api/client';
import { MedicineType, LAB_TEST_CATEGORIES } from '../../types/medicine.types';
import type { Medicine, LabTest } from '../../types/medicine.types';
import { useToast } from '../../components/toast/ToastContext';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import { CloseIcon } from '../../components/icons';
import '../pages.css';
import '../auth/auth.css';
import '../../components/modal.css';

export default function MedicineTestManagementPage() {
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
    const res = await api.get('/data/custom-medicines/frequent', { params: { limit: 1000 } });
    const mapped: Medicine[] = (res.data.medicines ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      type: (row.type ?? 'Tablet') as Medicine['type'],
      strength: (row.strength as string) ?? '',
      manufacturer: (row.manufacturer as string) ?? '',
      isCustom: true,
      usageCount: (row.usage_count as number) ?? 0,
    }));
    setMedicines(mapped);
  };

  const loadTests = async () => {
    const res = await api.get('/data/custom-lab-tests/frequent', { params: { limit: 1000 } });
    const mapped: LabTest[] = (res.data.labTests ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      category: (row.category as string) ?? '',
      isCustom: true,
      usageCount: (row.usage_count as number) ?? 0,
    }));
    setTests(mapped);
  };

  useEffect(() => {
    if (tab === 'medicines') loadMedicines();
    else loadTests();
  }, [tab]);

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
        await api.post('/data/custom-medicines', { name: formName.trim(), type: formType, strength: formStrength });
        await loadMedicines();
      } else {
        await api.post('/data/custom-lab-tests', { name: formName.trim(), category: formCategory });
        await loadTests();
      }
      setShowAddModal(false);
      resetForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete entry', message: 'Delete this entry?', danger: true }))) return;
    try {
      if (tab === 'medicines') {
        await api.delete(`/data/custom-medicines/${id}`);
        await loadMedicines();
      } else {
        await api.delete(`/data/custom-lab-tests/${id}`);
        await loadTests();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">Medicines & Tests</div>
        <button className="primary-btn" onClick={() => { resetForm(); setShowAddModal(true); }}>+ Add</button>
      </div>

      <div className="tab-row">
        <button className={`tab-btn ${tab === 'medicines' ? 'active' : ''}`} onClick={() => setTab('medicines')}>Medicines</button>
        <button className={`tab-btn ${tab === 'tests' ? 'active' : ''}`} onClick={() => setTab('tests')}>Tests</button>
      </div>

      <input
        className="auth-input"
        style={{ maxWidth: 360, marginBottom: 20 }}
        placeholder={`Search ${tab}...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="card-list">
        {tab === 'medicines' ? (
          filteredMedicines.map((m) => (
            <div key={m.id} className="item-card" style={{ cursor: 'default' }}>
              <div>
                <div className="item-name">{m.name}</div>
                <div className="item-meta">{m.type}{m.strength ? ` · ${m.strength}` : ''}</div>
              </div>
              <button className="icon-btn" onClick={() => handleDelete(m.id)}><CloseIcon size={14} /></button>
            </div>
          ))
        ) : (
          filteredTests.map((t) => (
            <div key={t.id} className="item-card" style={{ cursor: 'default' }}>
              <div>
                <div className="item-name">{t.name}</div>
                <div className="item-meta">{t.category}</div>
              </div>
              <button className="icon-btn" onClick={() => handleDelete(t.id)}><CloseIcon size={14} /></button>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Add {tab === 'medicines' ? 'Medicine' : 'Test'}</div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><CloseIcon /></button>
            </div>
            <div className="modal-body">
              <label className="auth-label">Name</label>
              <input className="auth-input" value={formName} onChange={(e) => setFormName(e.target.value)} style={{ marginBottom: 12 }} autoFocus />
              {tab === 'medicines' ? (
                <>
                  <label className="auth-label">Type</label>
                  <select className="auth-select" value={formType} onChange={(e) => setFormType(e.target.value)} style={{ marginBottom: 12 }}>
                    {Object.values(MedicineType).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label className="auth-label">Strength</label>
                  <input className="auth-input" value={formStrength} onChange={(e) => setFormStrength(e.target.value)} />
                </>
              ) : (
                <>
                  <label className="auth-label">Category</label>
                  <select className="auth-select" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                    {LAB_TEST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleAdd}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
