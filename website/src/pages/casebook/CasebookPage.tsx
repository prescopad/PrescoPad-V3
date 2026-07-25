import { useEffect, useState } from 'react';
import * as DataService from '../../api/dataService';
import { downloadCasebookPdf } from '../../api/casebookService';
import type { Patient } from '../../types/patient.types';
import PageLoader from '../../components/PageLoader';
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleDownloadPdf = async (patient: Patient) => {
    if (downloadingId) return;
    setDownloadingId(patient.id);
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to download casebook PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">Casebook</div>
          <div className="page-subtitle">Quick patient summaries, date-wise</div>
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
            const isDownloading = downloadingId === p.id;
            return (
              <div key={p.id} className="item-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div className="item-name">{p.name}</div>
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                    disabled={isDownloading}
                    onClick={() => handleDownloadPdf(p)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>
                <div
                  className="item-meta"
                  style={{
                    marginTop: 6,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {p.caseSummary || 'No case summary yet'}
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
    </div>
  );
}
