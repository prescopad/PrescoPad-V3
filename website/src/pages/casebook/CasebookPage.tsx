import { useEffect, useState } from 'react';
import * as DataService from '../../api/dataService';
import type { Patient } from '../../types/patient.types';
import PageLoader from '../../components/PageLoader';
import CasebookViewerModal from '../../components/CasebookViewerModal';
import { useToast } from '../../components/toast/ToastContext';
import '../pages.css';

const PAGE_SIZE = 50;

export default function CasebookPage() {
  const toast = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useEffect(() => {
    DataService.getPatientsPage(undefined, PAGE_SIZE, 0)
      .then(({ patients: p, total: t }) => {
        setPatients(p);
        setTotal(t);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load patients'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    setIsLoadingMore(true);
    try {
      const { patients: more, total: t } = await DataService.getPatientsPage(undefined, PAGE_SIZE, patients.length);
      setPatients((prev) => [...prev, ...more]);
      setTotal(t);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load more patients');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filtered = query.trim()
    ? patients.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : patients;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">Casebook</div>
          <div className="page-subtitle">Open and view patient casebook summaries and download PDFs</div>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          className="auth-input"
          style={{ maxWidth: 360 }}
          placeholder="Search patients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="card-list">
          {filtered.length === 0 && <div className="empty-state">No patients found</div>}
          {filtered.map((p) => {
            return (
              <div
                key={p.id}
                className="item-card"
                style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer' }}
                onClick={() => setSelectedPatient(p)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div className="item-name">{p.name}</div>
                    <div className="item-meta">
                      {p.age} yrs · {p.gender} {p.phone ? `· ${p.phone}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', padding: '6px 14px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPatient(p);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                    Open Casebook
                  </button>
                </div>
                <div
                  className="item-meta"
                  style={{
                    marginTop: 8,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.caseSummary || 'No case summary generated yet. Click Open Casebook to view patient history.'}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!isLoading && !query.trim() && patients.length < total && (
        <button type="button" className="secondary-btn" style={{ marginTop: 12, width: '100%' }} disabled={isLoadingMore} onClick={loadMore}>
          {isLoadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}

      {selectedPatient && (
        <CasebookViewerModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
}
