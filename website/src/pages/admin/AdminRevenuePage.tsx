import { useEffect, useState } from 'react';
import { fetchAdminRevenue } from '../../api/adminService';
import type { AdminRevenue } from '../../api/adminService';
import { APP_CONFIG } from '../../constants/config';
import '../pages.css';

const PERIODS: { value: 'today' | 'week' | 'month'; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export default function AdminRevenuePage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [data, setData] = useState<AdminRevenue | null>(null);

  useEffect(() => {
    fetchAdminRevenue(period).then(setData).catch(() => {});
  }, [period]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Revenue</div>
      </div>

      <div className="tab-row">
        {PERIODS.map((p) => (
          <button key={p.value} className={`tab-btn ${period === p.value ? 'active' : ''}`} onClick={() => setPeriod(p.value)}>{p.label}</button>
        ))}
      </div>

      {data && (
        <>
          <div className="stat-card" style={{ marginBottom: 20 }}>
            <div className="stat-value" style={{ fontSize: '2rem' }}>{APP_CONFIG.wallet.currencySymbol}{data.platformRevenue}</div>
            <div className="stat-label">Platform revenue ({data.period})</div>
          </div>

          <div className="card-list">
            {Object.entries(data.byType).map(([type, stat]) => (
              <div key={type} className="item-card" style={{ cursor: 'default' }}>
                <div className="item-name" style={{ textTransform: 'capitalize' }}>{type}</div>
                <div>{APP_CONFIG.wallet.currencySymbol}{stat.total} · {stat.count} transactions</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
