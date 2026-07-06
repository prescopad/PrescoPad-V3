import { useEffect, useState } from 'react';
import { getAnalytics } from '../../api/analyticsService';
import type { ComprehensiveAnalytics, TimePeriod } from '../../types/analytics.types';
import { APP_CONFIG } from '../../constants/config';
import PageLoader from '../../components/PageLoader';
import '../pages.css';

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<TimePeriod>('today');
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getAnalytics(period)
      .then(setAnalytics)
      .finally(() => setIsLoading(false));
  }, [period]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Analytics</div>
      </div>

      <div className="tab-row">
        {PERIODS.map((p) => (
          <button key={p.value} className={`tab-btn ${period === p.value ? 'active' : ''}`} onClick={() => setPeriod(p.value)}>
            {p.label}
          </button>
        ))}
      </div>

      {isLoading || !analytics ? (
        <PageLoader />
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-value">{analytics.prescriptions.total}</div>
              <div className="stat-label">Prescriptions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.prescriptions.finalized}</div>
              <div className="stat-label">Finalized</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{APP_CONFIG.wallet.currencySymbol}{analytics.earnings.netEarnings}</div>
              <div className="stat-label">Net earnings</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.patients.newPatients}</div>
              <div className="stat-label">New patients</div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-value">{analytics.consultations.completed}</div>
              <div className="stat-label">Consultations completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.consultations.avgWaitMinutes}m</div>
              <div className="stat-label">Avg wait time</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.consultations.avgConsultMinutes}m</div>
              <div className="stat-label">Avg consult time</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="page-title" style={{ fontSize: '1rem', marginBottom: 10 }}>Top Medicines</div>
              <div className="card-list">
                {analytics.popular.topMedicines.length === 0 && <div className="empty-state">No data yet</div>}
                {analytics.popular.topMedicines.map((m) => (
                  <div key={m.name} className="item-card" style={{ cursor: 'default' }}>
                    <div className="item-name">{m.name}</div>
                    <div className="item-meta">{m.count}×</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="page-title" style={{ fontSize: '1rem', marginBottom: 10 }}>Top Lab Tests</div>
              <div className="card-list">
                {analytics.popular.topTests.length === 0 && <div className="empty-state">No data yet</div>}
                {analytics.popular.topTests.map((t) => (
                  <div key={t.name} className="item-card" style={{ cursor: 'default' }}>
                    <div className="item-name">{t.name}</div>
                    <div className="item-meta">{t.count}×</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
