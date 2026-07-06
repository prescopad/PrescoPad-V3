import { useEffect, useState } from 'react';
import { fetchAdminOverview } from '../../api/adminService';
import type { AdminOverview } from '../../api/adminService';
import { APP_CONFIG } from '../../constants/config';
import PageLoader from '../../components/PageLoader';
import '../pages.css';

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);

  useEffect(() => {
    fetchAdminOverview().then(setData).catch(() => {});
  }, []);

  if (!data) return <PageLoader />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-title">Platform Overview</div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{data.users.doctors}</div>
          <div className="stat-label">Doctors</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.users.assistants}</div>
          <div className="stat-label">Assistants</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.users.onlineDoctors}</div>
          <div className="stat-label">Doctors online</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.clinics.total}</div>
          <div className="stat-label">Clinics</div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{data.patients.total}</div>
          <div className="stat-label">Total patients</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.prescriptions.total}</div>
          <div className="stat-label">Prescriptions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.prescriptions.today}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{APP_CONFIG.wallet.currencySymbol}{data.revenue.platformGross}</div>
          <div className="stat-label">Platform gross</div>
        </div>
      </div>
    </div>
  );
}
