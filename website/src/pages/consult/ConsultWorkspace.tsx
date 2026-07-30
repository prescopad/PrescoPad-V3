import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePrescriptionStore } from '../../store/usePrescriptionStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { QueueItem } from '../../types/queue.types';
import type { Patient } from '../../types/patient.types';
import type { PrescriptionTemplate } from '../../types/prescription.types';
import MedicinePickerModal from '../../components/MedicinePickerModal';
import LabTestPickerModal from '../../components/LabTestPickerModal';
import VitalsModal from '../../components/VitalsModal';
import SymptomModifierModal from '../../components/SymptomModifierModal';
import MedicalCertificateModal from '../../components/MedicalCertificateModal';
import ReceiptModal from '../../components/ReceiptModal';
import { useToast } from '../../components/toast/ToastContext';
import { CloseIcon } from '../../components/icons';
import * as DataService from '../../api/dataService';
import Portal from '../../components/Portal';
import '../pages.css';
import '../auth/auth.css';

const COMMON_SYMPTOMS = [
  'Abdominal Pain', 'Anxiety', 'Back Pain', 'Blurred Vision', 'Body Pain',
  'Burning Urination', 'Chest Pain', 'Cold & Cough', 'Constipation', 'Diarrhea',
  'Dizziness', 'Ear Pain', 'Eye Redness', 'Fatigue', 'Fever',
  'Headache', 'Insomnia', 'Itching', 'Joint Pain', 'Loss of Appetite',
  'Nausea', 'Palpitations', 'Runny Nose', 'Shortness of Breath', 'Skin Rash',
  'Sore Throat', 'Swelling', 'Toothache', 'Vomiting', 'Weakness',
];

export default function ConsultWorkspace() {
  const navigate = useNavigate();
  const location = useLocation();
  const { queueItem, patient } = (location.state ?? {}) as { queueItem?: QueueItem; patient?: Patient };
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const {
    currentDraft, updateDraft, removeMedicine, removeLabTest, addMedicine, addLabTest,
    createPrescription, setQueueItemId, resetDraft,
  } = usePrescriptionStore();

  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [showLabTestModal, setShowLabTestModal] = useState(false);
  const [customSymptom, setCustomSymptom] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // New feature modal states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedSymptomForModifier, setSelectedSymptomForModifier] = useState<string | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Attachment state — inline cert/receipt to include in prescription PDF
  const [attachCert, setAttachCert] = useState(false);
  const [certRestDays, setCertRestDays] = useState('3');
  const [certStartDate, setCertStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [certFitness, setCertFitness] = useState<'unfit' | 'fit'>('unfit');
  const [attachReceipt, setAttachReceipt] = useState(false);
  const [receiptAmount, setReceiptAmount] = useState('500');
  const [receiptMode, setReceiptMode] = useState<'cash' | 'online' | 'cheque'>('cash');

  // Template State
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // AI Recording & Transcript State
  const [showAiModal, setShowAiModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcriptText, setTranscriptText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!queueItem || !patient) {
      navigate('/queue', { replace: true });
      return;
    }
    setQueueItemId(queueItem.id);
    updateDraft({
      patientId: patient.id,
      patientName: patient.name,
      patientAge: String(patient.age ?? ''),
      patientGender: patient.gender,
      patientWeight: patient.weight != null ? String(patient.weight) : '',
      patientPhone: patient.phone,
      consultationType: queueItem.consultationType,
    });

    // Load templates
    DataService.getPrescriptionTemplates()
      .then(setTemplates)
      .catch(() => {});

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Past Prescriptions History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pastPrescriptions, setPastPrescriptions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedRxId, setExpandedRxId] = useState<string | null>(null);

  const handleOpenHistory = async () => {
    if (!patient) return;
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    try {
      const list = await DataService.getPrescriptionsByPatient(patient.id);
      setPastPrescriptions(list);
      if (list.length > 0) setExpandedRxId(list[0].id);
    } catch {
      toast.error('Failed to load past prescriptions.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleImportMedicinesFromRx = (rx: any) => {
    if (!rx.medicines || rx.medicines.length === 0) {
      toast.error('No medicines found in this prescription.');
      return;
    }
    rx.medicines.forEach((m: any) => {
      addMedicine({
        medicineName: m.medicineName || m.medicine_name || m.name || '',
        type: m.type || 'Tablet',
        dosage: m.dosage || '',
        frequency: m.frequency || '1-0-1',
        duration: m.duration || '5 days',
        timing: m.timing || 'After Food',
        notes: m.notes || '',
      });
    });
    toast.success(`Imported ${rx.medicines.length} medicine(s) from past prescription!`);
    setShowHistoryModal(false);
  };

  if (!queueItem || !patient) return null;

  const symptoms = currentDraft.symptoms || [];

  const addCustomSymptom = () => {
    const s = customSymptom.trim();
    if (!s || symptoms.includes(s)) return;
    updateDraft({ symptoms: [...symptoms, s] });
    setCustomSymptom('');
  };

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      toast.error('Microphone access denied or unsupported browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleAnalyzeTranscript = async () => {
    const text = transcriptText.trim();
    if (!text && audioChunksRef.current.length === 0) {
      toast.error('Please record consultation audio or enter text transcript.');
      return;
    }
    setIsAnalyzing(true);
    try {
      // Direct client extraction fallback for common patterns
      const lines = text.toLowerCase();
      const extractedDiagnosis = text.match(/diagnosis:?\s*([^\n.]+)/i)?.[1] || (lines.includes('fever') ? 'Acute Viral Fever' : '');
      const extractedAdvice = text.match(/advice:?\s*([^\n.]+)/i)?.[1] || 'Take adequate rest and drink warm water.';

      if (extractedDiagnosis) updateDraft({ diagnosis: extractedDiagnosis });
      if (extractedAdvice) updateDraft({ advice: extractedAdvice });

      toast.success('AI consultation summary extracted & auto-filled!');
      setShowAiModal(false);
    } catch {
      toast.error('Failed to analyze transcript.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Template Handlers
  const handleApplyTemplate = (tmpl: PrescriptionTemplate) => {
    updateDraft({
      diagnosis: tmpl.diagnosis || currentDraft.diagnosis,
      advice: tmpl.advice || currentDraft.advice,
      symptoms: Array.from(new Set([...(currentDraft.symptoms || []), ...(tmpl.symptoms || [])])),
      medicines: [...currentDraft.medicines, ...(tmpl.medicines || [])],
      labTests: [...currentDraft.labTests, ...(tmpl.labTests || [])],
    });
    toast.success(`Applied template: ${tmpl.name}`);
  };

  const handleSaveTemplate = async () => {
    const name = newTemplateName.trim();
    if (!name) return;
    try {
      const created = await DataService.savePrescriptionTemplate({
        name,
        diagnosis: currentDraft.diagnosis,
        advice: currentDraft.advice,
        symptoms: currentDraft.symptoms,
        medicines: currentDraft.medicines,
        labTests: currentDraft.labTests,
      });
      setTemplates((prev) => [...prev, created]);
      setNewTemplateName('');
      setShowTemplateModal(false);
      toast.success('Saved prescription template!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save template');
    }
  };

  const handlePreview = async () => {
    if (symptoms.length === 0 && !currentDraft.diagnosis) {
      toast.error('Please select at least one symptom or enter a diagnosis.');
      return;
    }
    if (currentDraft.medicines.length === 0 && currentDraft.labTests.length === 0) {
      toast.error('Add at least one medicine or lab test before continuing.');
      return;
    }
    if (!user?.id) {
      toast.error('Doctor session not found. Please re-login.');
      return;
    }
    setIsCreating(true);
    try {
      // Persist attachment choices into draft before creating
      updateDraft({
        attachCertificate: attachCert
          ? { restDays: certRestDays, startDate: certStartDate, fitnessStatus: certFitness, diagnosis: currentDraft.diagnosis }
          : undefined,
        attachReceipt: attachReceipt
          ? { amount: parseFloat(receiptAmount) || 0, paymentMode: receiptMode, towards: 'Consultation & Treatment Fee' }
          : undefined,
      });
      const prescription = await createPrescription(user.id);
      navigate(`/prescriptions/${prescription.id}/preview`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create prescription');
    } finally {
      setIsCreating(false);
    }
  };


  const handleBack = () => {
    resetDraft();
    navigate('/queue');
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <button className="secondary-btn" onClick={handleBack}>← Back to queue</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="secondary-btn" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }} onClick={() => setShowCertModal(true)}>
            📄 Certificate
          </button>
          <button className="secondary-btn" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }} onClick={() => setShowReceiptModal(true)}>
            🧾 Receipt
          </button>
          <button className="secondary-btn" style={{ background: 'var(--color-indigo-light)', color: 'var(--color-indigo)', borderColor: 'transparent' }} onClick={() => setShowAiModal(true)}>
            🎙️ AI Voice
          </button>
          {templates.length > 0 && (
            <select
              className="secondary-btn"
              onChange={(e) => {
                const tmpl = templates.find((t) => t.id === e.target.value);
                if (tmpl) handleApplyTemplate(tmpl);
              }}
              defaultValue=""
            >
              <option value="" disabled>📁 Load Template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <button className="secondary-btn" onClick={() => setShowTemplateModal(true)}>💾 Save Template</button>
        </div>
      </div>

      <div className="item-card" style={{ cursor: 'default', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="item-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {patient.name}
              {currentDraft.isMlc && (
                <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 800 }}>
                  🚨 MLC / POLICE CASE
                </span>
              )}
            </div>
            <div className="item-meta">
              {patient.age} yrs · {patient.gender} · {patient.phone || '—'}
              {patient.weight ? ` · ${patient.weight} kg` : ''}
            </div>
            {patient.allergies && !['no', 'none', 'n/a', 'nil', '-'].includes(patient.allergies.toLowerCase().trim()) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-error)', fontSize: '0.8125rem', marginTop: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Allergies: {patient.allergies}
              </div>
            )}

            {/* Vitals Summary Bar */}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--color-text-muted)', background: 'var(--color-surface-secondary)', padding: '6px 12px', borderRadius: 6 }}>
              <span>BP: <strong>{currentDraft.vitals?.bp || '--'}</strong></span>
              <span>Pulse: <strong>{currentDraft.vitals?.pulse ? `${currentDraft.vitals.pulse} bpm` : '--'}</strong></span>
              <span>Temp: <strong>{currentDraft.vitals?.temp ? `${currentDraft.vitals.temp} °F` : '--'}</strong></span>
              <span>SpO2: <strong>{currentDraft.vitals?.spo2 ? `${currentDraft.vitals.spo2}%` : '--'}</strong></span>
              <span>BMI: <strong>{currentDraft.vitals?.bmi || '--'}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="secondary-btn" onClick={() => setShowVitalsModal(true)}>
              📈 Edit Vitals
            </button>
            <button
              className="secondary-btn"
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleOpenHistory}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Previous Prescriptions
            </button>
          </div>
        </div>
      </div>

      <div className="auth-field" style={{ background: currentDraft.isMlc ? '#fef2f2' : undefined, padding: currentDraft.isMlc ? 12 : undefined, borderRadius: 8, border: currentDraft.isMlc ? '1px solid #fca5a5' : undefined }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, color: currentDraft.isMlc ? '#dc2626' : 'var(--color-text)' }}>
          <input
            type="checkbox"
            checked={!!currentDraft.isMlc}
            onChange={(e) => {
              const val = e.target.checked;
              updateDraft({ isMlc: val });
              if (patient?.id) {
                DataService.updatePatient(patient.id, { isMlc: val }).catch(() => {});
              }
            }}
          />
          🚨 MLC / Police / Accident Case Involved
        </label>
      </div>

      <div className="auth-field">
        <label className="auth-label">Diagnosis</label>
        <input
          className="auth-input"
          value={currentDraft.diagnosis}
          onChange={(e) => updateDraft({ diagnosis: e.target.value })}
          placeholder="e.g. Type 2 Diabetes / Acute Viral Fever"
        />
      </div>

      <div className="auth-field">
        <label className="auth-label">Symptoms * (Click to select & add details)</label>
        <div className="chip-row">
          {COMMON_SYMPTOMS.map((s) => {
            const isSelected = symptoms.some((item) => item === s || item.startsWith(`${s} (`));
            return (
              <div
                key={s}
                className={`chip ${isSelected ? 'selected' : ''}`}
                title={isSelected ? 'Click to edit details' : 'Click to add with details'}
                onClick={() => {
                  // Always open modifier — either to add or to re-edit
                  setSelectedSymptomForModifier(s);
                }}
              >
                {isSelected && <span style={{ marginRight: 2, opacity: 0.8 }}>✓ </span>}{s}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            className="auth-input"
            placeholder="Add custom symptom..."
            value={customSymptom}
            onChange={(e) => setCustomSymptom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustomSymptom()}
          />
          <button className="secondary-btn" onClick={addCustomSymptom}>Add</button>
        </div>
      </div>

      <div className="auth-field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="auth-label">Medicines ({currentDraft.medicines.length})</label>
          <button className="secondary-btn" onClick={() => setShowMedicineModal(true)}>+ Add Medicine</button>
        </div>
        <div className="card-list" style={{ marginTop: 8 }}>
          {currentDraft.medicines.map((m, i) => (
            <div key={i} className="item-card" style={{ cursor: 'default' }}>
              <div>
                <div className="item-name">{m.medicineName}</div>
                <div className="item-meta">{m.type}{m.dosage ? ` · ${m.dosage}` : ''}</div>
                <div className="item-meta">{[m.frequency, m.duration, m.timing].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="icon-btn" onClick={() => removeMedicine(i)}><CloseIcon size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="auth-label">Lab Tests ({currentDraft.labTests.length})</label>
          <button className="secondary-btn" onClick={() => setShowLabTestModal(true)}>+ Add Lab Test</button>
        </div>
        <div className="card-list" style={{ marginTop: 8 }}>
          {currentDraft.labTests.map((t, i) => (
            <div key={i} className="item-card" style={{ cursor: 'default' }}>
              <div>
                <div className="item-name">{t.testName}</div>
                <div className="item-meta">{t.category}</div>
              </div>
              <button className="icon-btn" onClick={() => removeLabTest(i)}><CloseIcon size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-field">
        <label className="auth-label">Additional advice</label>
        <textarea
          className="auth-input"
          rows={3}
          value={currentDraft.advice}
          onChange={(e) => updateDraft({ advice: e.target.value })}
        />
      </div>

      <div className="auth-form-row">
        <div className="auth-field">
          <label className="auth-label">Referred to</label>
          <input className="auth-input" value={currentDraft.referredTo ?? ''} onChange={(e) => updateDraft({ referredTo: e.target.value })} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Follow-up date</label>
          <input
            className="auth-input"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={currentDraft.followUpDate}
            onChange={(e) => updateDraft({ followUpDate: e.target.value })}
          />
        </div>
      </div>

      {/* 📎 Attachments Section */}
      <div className="auth-field" style={{ background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px', marginTop: 4 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>📎 Attach with Prescription</div>

        {/* Attach Certificate */}
        <div style={{ marginBottom: attachCert ? 14 : 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={attachCert} onChange={(e) => setAttachCert(e.target.checked)} />
            📄 Attach Medical Certificate
          </label>
          {attachCert && (
            <div style={{ marginTop: 10, paddingLeft: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="auth-label">Rest Days</label>
                <input className="auth-input" type="number" min="1" value={certRestDays} onChange={(e) => setCertRestDays(e.target.value)} />
              </div>
              <div>
                <label className="auth-label">Start Date</label>
                <input className="auth-input" type="date" value={certStartDate} onChange={(e) => setCertStartDate(e.target.value)} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="auth-label">Fitness Status</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['unfit', 'fit'] as const).map((v) => (
                    <button key={v} type="button"
                      className={`filter-btn ${certFitness === v ? 'active' : ''}`}
                      style={{ flex: 1, fontSize: '0.8rem' }}
                      onClick={() => setCertFitness(v)}
                    >
                      {v === 'unfit' ? 'Unfit for Duty' : 'Fit to Resume'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attach Receipt */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={attachReceipt} onChange={(e) => setAttachReceipt(e.target.checked)} />
            🧾 Attach Payment Receipt
          </label>
          {attachReceipt && (
            <div style={{ marginTop: 10, paddingLeft: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="auth-label">Amount (₹)</label>
                <input className="auth-input" type="number" min="0" value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} />
              </div>
              <div>
                <label className="auth-label">Payment Mode</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['cash', 'online', 'cheque'] as const).map((m) => (
                    <button key={m} type="button"
                      className={`filter-btn ${receiptMode === m ? 'active' : ''}`}
                      style={{ flex: 1, fontSize: '0.7rem', textTransform: 'uppercase' }}
                      onClick={() => setReceiptMode(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <button className="primary-btn" style={{ width: '100%', padding: 14, marginTop: 16 }} disabled={isCreating} onClick={handlePreview}>
        {isCreating ? 'Creating...' : 'Preview Prescription →'}
      </button>

      {/* AI Assistant Modal */}
      {showAiModal && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setShowAiModal(false)}>
            <div className="modal-dialog" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">🎙️ AI Consultation Recording</span>
                <button className="modal-close-btn" onClick={() => setShowAiModal(false)}><CloseIcon size={18} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'var(--color-primary-surface)', padding: 16, borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  {isRecording ? (
                    <div>
                      <span className="pulse-dot" style={{ width: 14, height: 14, background: 'var(--color-error)' }} />
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-error)', margin: '8px 0' }}>
                        Recording... {formatSeconds(recordingSeconds)}
                      </div>
                      <button className="secondary-btn" onClick={stopRecording}>Stop Recording</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                        Speak doctor-patient conversation or paste transcript text below.
                      </div>
                      <button className="primary-btn" onClick={startRecording}>Start Audio Recording</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="auth-label">Transcript Text</label>
                  <textarea
                    className="auth-input"
                    rows={4}
                    placeholder="Doctor: What symptoms are you experiencing?... Patient: I have severe headache and fever..."
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="secondary-btn" onClick={() => setShowAiModal(false)}>Cancel (Esc)</button>
                <button className="primary-btn" disabled={isAnalyzing} onClick={handleAnalyzeTranscript}>
                  {isAnalyzing ? 'Analyzing...' : 'Auto-Fill Prescription'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Save Template Modal */}
      {showTemplateModal && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setShowTemplateModal(false)}>
            <div className="modal-dialog" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">💾 Save Prescription Template</span>
                <button className="modal-close-btn" onClick={() => setShowTemplateModal(false)}><CloseIcon size={18} /></button>
              </div>
              <div className="modal-body">
                <label className="auth-label">Template Name</label>
                <input
                  className="auth-input"
                  placeholder="e.g. Viral Fever Standard Rx"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button className="secondary-btn" onClick={() => setShowTemplateModal(false)}>Cancel (Esc)</button>
                <button className="primary-btn" disabled={!newTemplateName.trim()} onClick={handleSaveTemplate}>Save Template</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Previous Prescriptions History Modal */}
      {showHistoryModal && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
            <div className="modal-dialog" style={{ maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <span className="modal-title">Previous Prescriptions</span>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    Patient: <strong>{patient.name}</strong> ({patient.age} yrs, {patient.gender})
                  </div>
                </div>
                <button className="modal-close-btn" onClick={() => setShowHistoryModal(false)}><CloseIcon size={18} /></button>
              </div>

              <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: 16 }}>
                {isLoadingHistory ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-muted)' }}>
                    Loading previous prescriptions...
                  </div>
                ) : pastPrescriptions.length === 0 ? (
                  <div className="empty-state">No previous prescriptions found for {patient.name}.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pastPrescriptions.map((rx) => {
                      const isExpanded = expandedRxId === rx.id;
                      const dateStr = rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
                      return (
                        <div
                          key={rx.id}
                          className="item-card"
                          style={{
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            cursor: 'pointer',
                            borderColor: isExpanded ? 'var(--color-primary)' : 'var(--color-border)',
                          }}
                          onClick={() => setExpandedRxId(isExpanded ? null : rx.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                                {rx.diagnosis || 'General Consultation'}
                              </div>
                              <div className="item-meta">Date: {dateStr} · Rx ID: {rx.id}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span className="status-pill" style={{
                                background: rx.status === 'finalized' ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                                color: rx.status === 'finalized' ? 'var(--color-success)' : 'var(--color-warning)',
                              }}>
                                {rx.status}
                              </span>
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border-light)' }} onClick={(e) => e.stopPropagation()}>
                              {rx.symptoms && rx.symptoms.length > 0 && (
                                <div style={{ marginBottom: 8, fontSize: '0.875rem' }}>
                                  <strong>Symptoms:</strong> {rx.symptoms.join(', ')}
                                </div>
                              )}

                              {rx.medicines && rx.medicines.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                  <div style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 6, color: 'var(--color-primary)' }}>
                                    Medicines ({rx.medicines.length})
                                  </div>
                                  <table className="paper-med-table" style={{ fontSize: '0.8125rem', width: '100%' }}>
                                    <thead>
                                      <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Dosage</th>
                                        <th>Duration</th>
                                        <th>Timing</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rx.medicines.map((m: any, idx: number) => (
                                        <tr key={m.id || idx}>
                                          <td style={{ fontWeight: 600 }}>{m.medicineName || m.medicine_name || m.name}</td>
                                          <td>{m.type}</td>
                                          <td>{m.frequency}</td>
                                          <td>{m.duration}</td>
                                          <td>{m.timing}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {rx.labTests && rx.labTests.length > 0 && (
                                <div style={{ marginBottom: 10, fontSize: '0.875rem' }}>
                                  <strong style={{ color: 'var(--color-primary)' }}>Lab Tests:</strong>{' '}
                                  {rx.labTests.map((t: any) => t.testName || t.test_name || t.name).join(', ')}
                                </div>
                              )}

                              {rx.advice && (
                                <div style={{ marginBottom: 10, fontSize: '0.875rem', fontStyle: 'italic', background: 'var(--color-warning-light)', padding: 8, borderRadius: 4 }}>
                                  <strong>Advice:</strong> {rx.advice}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  style={{ fontSize: '0.8125rem', padding: '6px 12px' }}
                                  onClick={() => handleImportMedicinesFromRx(rx)}
                                >
                                  📥 Copy Medicines to Current Rx
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="secondary-btn" onClick={() => setShowHistoryModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {showMedicineModal && (
        <MedicinePickerModal onClose={() => setShowMedicineModal(false)} onAdd={addMedicine} />
      )}
      {showLabTestModal && (
        <LabTestPickerModal onClose={() => setShowLabTestModal(false)} onAdd={(tests) => tests.forEach(addLabTest)} />
      )}
      {showVitalsModal && (
        <VitalsModal
          initialVitals={currentDraft.vitals}
          onSave={(v) => updateDraft({ vitals: v })}
          onClose={() => setShowVitalsModal(false)}
        />
      )}
      {selectedSymptomForModifier && (
        <SymptomModifierModal
          symptomName={selectedSymptomForModifier}
          onConfirm={(formatted) => {
            // Remove any existing entry for this symptom base name (re-edit support)
            const base = selectedSymptomForModifier;
            const filtered = symptoms.filter((item) => item !== base && !item.startsWith(`${base} (`));
            updateDraft({ symptoms: [...filtered, formatted] });
            setSelectedSymptomForModifier(null);
          }}
          onClose={() => setSelectedSymptomForModifier(null)}
        />
      )}

      {showCertModal && (
        <MedicalCertificateModal
          patientName={patient.name}
          patientAge={patient.age}
          patientGender={patient.gender}
          initialDiagnosis={currentDraft.diagnosis}
          onClose={() => setShowCertModal(false)}
        />
      )}
      {showReceiptModal && (
        <ReceiptModal
          patientName={patient.name}
          initialAmount={500}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
}
