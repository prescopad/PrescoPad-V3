import { useEffect, useState } from 'react';
import * as DataService from '../../api/dataService';
import type { Patient } from '../../types/patient.types';
import PageLoader from '../../components/PageLoader';
import '../pages.css';

export default function CasebookPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    DataService.getPatients().then((p) => {
      setPatients(p);
      setIsLoading(false);
    });
  }, []);

  const filtered = query.trim()
    ? patients.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : patients;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
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
            const isExpanded = expandedId === p.id;
            const entries = p.casebookEntries ?? [];
            return (
              <div key={p.id} className="item-card" style={{ flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="item-name">{p.name}</div>
                  <span>{isExpanded ? '▲' : '▼'}</span>
                </div>
                {!isExpanded && (
                  <div className="item-meta" style={{ marginTop: 4 }}>
                    {entries[0]?.summary || 'No visits yet'}
                  </div>
                )}
                {isExpanded && (
                  entries.length > 0 ? (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {entries.map((entry) => (
                        <div key={entry.prescriptionId} style={{ borderLeft: '2px solid var(--color-primary)', paddingLeft: 10 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatDate(entry.date)}</div>
                          <div style={{ fontSize: '0.875rem' }}>{entry.summary}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="item-meta" style={{ marginTop: 4 }}>No visits yet</div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
