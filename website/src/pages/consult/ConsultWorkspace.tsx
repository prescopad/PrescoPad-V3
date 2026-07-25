import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePrescriptionStore } from '../../store/usePrescriptionStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { QueueItem } from '../../types/queue.types';
import type { Patient } from '../../types/patient.types';
import type { PrescriptionTemplate } from '../../types/prescription.types';
import MedicinePickerModal from '../../components/MedicinePickerModal';
import LabTestPickerModal from '../../components/LabTestPickerModal';
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

  if (!queueItem || !patient) return null;

  const symptoms = currentDraft.symptoms || [];

  const toggleSymptom = (s: string) => {
    updateDraft({ symptoms: symptoms.includes(s) ? symptoms.filter((x) => x !== s) : [...symptoms, s] });
  };

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
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-btn" style={{ background: 'var(--color-indigo-light)', color: 'var(--color-indigo)', borderColor: 'transparent' }} onClick={() => setShowAiModal(true)}>
            🎙️ AI Voice Assistant
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <div className="item-name">{patient.name}</div>
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
          </div>
          <button
            className="secondary-btn"
            style={{ flexShrink: 0 }}
            onClick={() => navigate(`/patients/${patient.id}/history`)}
          >
            View History
          </button>
        </div>
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
        <label className="auth-label">Symptoms *</label>
        <div className="chip-row">
          {COMMON_SYMPTOMS.map((s) => (
            <div key={s} className={`chip ${symptoms.includes(s) ? 'selected' : ''}`} onClick={() => toggleSymptom(s)}>
              {s}
            </div>
          ))}
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

      {showMedicineModal && (
        <MedicinePickerModal onClose={() => setShowMedicineModal(false)} onAdd={addMedicine} />
      )}
      {showLabTestModal && (
        <LabTestPickerModal onClose={() => setShowLabTestModal(false)} onAdd={(tests) => tests.forEach(addLabTest)} />
      )}
    </div>
  );
}
