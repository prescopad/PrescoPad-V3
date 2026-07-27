import { useEffect, useState } from 'react';
import type { Patient } from '../types/patient.types';
import type { Prescription } from '../types/prescription.types';
import * as DataService from '../api/dataService';
import { downloadCasebookPdf } from '../api/casebookService';
import { printCasebookClient } from '../utils/clientPdfUtil';
import Portal from './Portal';
import { CloseIcon } from './icons';
import { useToast } from './toast/ToastContext';
import './modal.css';

interface CasebookViewerModalProps {
  patient: Patient;
  onClose: () => void;
}

export default function CasebookViewerModal({ patient, onClose }: CasebookViewerModalProps) {
  const toast = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    DataService.getPrescriptionsByPatient(patient.id)
      .then((rx) => setPrescriptions(rx))
      .catch(() => toast.error('Failed to load visit history for casebook.'))
      .finally(() => setIsLoading(false));
  }, [patient.id, toast]);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const blob = await downloadCasebookPdf(patient.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (patient.name || 'Patient')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      a.download = `Casebook_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Casebook PDF downloaded successfully.');
    } catch {
      printCasebookClient(patient, prescriptions);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    printCasebookClient(patient, prescriptions);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Portal>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-dialog"
          style={{ maxWidth: 840, height: '90vh', display: 'flex', flexDirection: 'column' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <span className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                📋 Casebook &mdash; {patient.name}
              </span>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                {patient.age} yrs · {patient.gender} {patient.phone ? `· ${patient.phone}` : ''}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print
              </button>

              <button
                type="button"
                className="primary-btn"
                disabled={isDownloading}
                onClick={handleDownloadPdf}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </button>

              <button className="modal-close-btn" onClick={onClose}>
                <CloseIcon size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
            {/* Patient Overview Card */}
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Patient Medical Overview
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Blood Group</span>
                  <strong style={{ fontSize: '0.9375rem' }}>{patient.bloodGroup || '—'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Weight</span>
                  <strong style={{ fontSize: '0.9375rem' }}>{patient.weight ? `${patient.weight} kg` : '—'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Allergies</span>
                  <strong style={{ fontSize: '0.9375rem', color: patient.allergies ? 'var(--color-error)' : 'inherit' }}>
                    {patient.allergies || 'None'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Total Visits</span>
                  <strong style={{ fontSize: '0.9375rem' }}>{prescriptions.length}</strong>
                </div>
              </div>

              {/* Consolidated AI Case Summary */}
              {patient.caseSummary && (
                <div style={{ background: 'var(--color-primary-surface)', borderLeft: '4px solid var(--color-primary)', padding: 12, borderRadius: '0 6px 6px 0', marginTop: 10 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
                    AI Case Summary
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {patient.caseSummary}
                  </div>
                </div>
              )}
            </div>

            {/* Visit History Section */}
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, color: 'var(--color-text)' }}>
              Visit History Timeline ({prescriptions.length})
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                Loading visit history...
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="empty-state">No visit history found for this patient.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {prescriptions.map((rx, index) => (
                  <div
                    key={rx.id || index}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--color-border-light)' }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-primary)' }}>
                          Visit #{prescriptions.length - index} &mdash; {rx.diagnosis || 'Consultation'}
                        </span>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          Date: {formatDate(rx.createdAt)} · Rx ID: {rx.id}
                        </div>
                      </div>
                      <span
                        className="status-pill"
                        style={{
                          background: rx.status === 'finalized' ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                          color: rx.status === 'finalized' ? 'var(--color-success)' : 'var(--color-warning)',
                        }}
                      >
                        {rx.status}
                      </span>
                    </div>

                    {rx.symptoms && rx.symptoms.length > 0 && (
                      <div style={{ marginBottom: 8, fontSize: '0.875rem' }}>
                        <strong style={{ color: 'var(--color-text-muted)' }}>Symptoms:</strong> {rx.symptoms.join(', ')}
                      </div>
                    )}

                    {/* Prescribed Medicines */}
                    {rx.medicines && rx.medicines.length > 0 && (
                      <div style={{ marginTop: 10, marginBottom: 10 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                          Prescribed Medicines ({rx.medicines.length}):
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="paper-med-table" style={{ width: '100%', fontSize: '0.8125rem' }}>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Medicine</th>
                                <th>Type</th>
                                <th>Dosage</th>
                                <th>Duration</th>
                                <th>Timing</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rx.medicines.map((m, i) => (
                                <tr key={m.id || i}>
                                  <td>{i + 1}</td>
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
                      </div>
                    )}

                    {/* Lab Tests */}
                    {rx.labTests && rx.labTests.length > 0 && (
                      <div style={{ marginBottom: 8, fontSize: '0.875rem' }}>
                        <strong style={{ color: 'var(--color-text-muted)' }}>Lab Tests:</strong>{' '}
                        {rx.labTests.map((t) => t.testName || t.test_name || t.name).join(', ')}
                      </div>
                    )}

                    {/* Advice */}
                    {rx.advice && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', background: 'var(--color-warning-light)', padding: 8, borderRadius: 4, marginTop: 8 }}>
                        <strong>Advice:</strong> {rx.advice}
                      </div>
                    )}

                    {/* Follow Up */}
                    {rx.followUpDate && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--color-error)', fontWeight: 600, marginTop: 8 }}>
                        Follow-up Date: {formatDate(rx.followUpDate)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
