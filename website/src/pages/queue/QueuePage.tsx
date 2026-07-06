import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueueStore } from '../../store/useQueueStore';
import { QueueStatus } from '../../types/queue.types';
import type { QueueItem } from '../../types/queue.types';
import { COLORS } from '../../theme';
import { useToast } from '../../components/toast/ToastContext';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import { CloseIcon } from '../../components/icons';
import '../pages.css';

type Tab = 'all' | 'waiting' | 'in_progress' | 'completed';

const STATUS_COLOR: Record<string, string> = {
  [QueueStatus.WAITING]: COLORS.warning,
  [QueueStatus.IN_PROGRESS]: COLORS.primary,
  [QueueStatus.COMPLETED]: COLORS.success,
  [QueueStatus.CANCELLED]: COLORS.textMuted,
};

const STATUS_LABEL: Record<string, string> = {
  [QueueStatus.WAITING]: 'Waiting',
  [QueueStatus.IN_PROGRESS]: 'In Progress',
  [QueueStatus.COMPLETED]: 'Completed',
  [QueueStatus.CANCELLED]: 'Cancelled',
};

export default function QueuePage() {
  const navigate = useNavigate();
  const { queueItems, stats, lastError, startPolling, stopPolling, startConsult, removeFromQueue, clearError } = useQueueStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('all');

  useEffect(() => {
    if (lastError) {
      toast.error(lastError);
      clearError();
    }
  }, [lastError, toast, clearError]);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const filtered = queueItems.filter((item) => activeTab === 'all' || item.status === activeTab);

  const handleItemClick = async (item: QueueItem) => {
    if (item.status === QueueStatus.COMPLETED) {
      if (item.patient) navigate(`/patients/${item.patient.id}/history`);
      return;
    }
    if (!item.patient) return;
    if (item.status === QueueStatus.IN_PROGRESS) {
      navigate('/consult', { state: { queueItem: item, patient: item.patient } });
      return;
    }
    try {
      await startConsult(item.id);
      navigate('/consult', { state: { queueItem: item, patient: item.patient, consultType: item.consultationType || 'new' } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start consultation');
    }
  };

  const handleRemove = async (e: React.MouseEvent, item: QueueItem) => {
    e.stopPropagation();
    if (!(await confirm({ title: 'Remove from queue', message: `Remove ${item.patient?.name ?? 'this patient'} from the queue?`, danger: true }))) return;
    try {
      await removeFromQueue(item.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove from queue');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">Today's Queue</div>
          <div className="page-subtitle">Patients waiting, in consultation, and completed today</div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.waiting}</div>
          <div className="stat-label">Waiting</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div className="tab-row">
        {(['all', 'waiting', 'in_progress', 'completed'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'all' ? 'All' : STATUS_LABEL[tab]}
          </button>
        ))}
      </div>

      <div className="card-list">
        {filtered.length === 0 && <div className="empty-state">No patients in this view</div>}
        {filtered.map((item) => (
          <div key={item.id} className="item-card" onClick={() => handleItemClick(item)}>
            <div className="item-card-left">
              <div className="token-badge" style={{ background: STATUS_COLOR[item.status] }}>
                {item.tokenNumber}
              </div>
              <div>
                <div className="item-name">{item.patient?.name ?? 'Unknown patient'}</div>
                <div className="item-meta">
                  {item.patient?.age ? `${item.patient.age} yrs` : ''}
                  {item.consultationType === 'follow_up' ? ' · Follow-up' : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="status-pill" style={{ background: `${STATUS_COLOR[item.status]}22`, color: STATUS_COLOR[item.status] }}>
                {STATUS_LABEL[item.status]}
              </span>
              {item.status === QueueStatus.WAITING && (
                <button type="button" className="icon-btn" onClick={(e) => handleRemove(e, item)} title="Remove from queue">
                  <CloseIcon size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
