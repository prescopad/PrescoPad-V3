import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueueStore } from '../../store/useQueueStore';
import { QueueStatus } from '../../types/queue.types';
import type { QueueItem } from '../../types/queue.types';
import { useToast } from '../../components/toast/ToastContext';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import { CloseIcon } from '../../components/icons';
import AddPatientModal from './AddPatientModal';
import Portal from '../../components/Portal';
import '../pages.css';

type Tab = 'all' | 'waiting' | 'in_progress' | 'completed';

const STATUS_COLOR: Record<string, string> = {
  [QueueStatus.WAITING]: '#f59e0b',
  [QueueStatus.IN_PROGRESS]: '#0284c7',
  [QueueStatus.COMPLETED]: '#10b981',
  [QueueStatus.CANCELLED]: '#64748b',
};

const STATUS_LABEL: Record<string, string> = {
  [QueueStatus.WAITING]: 'Waiting',
  [QueueStatus.IN_PROGRESS]: 'In Progress',
  [QueueStatus.COMPLETED]: 'Completed',
  [QueueStatus.CANCELLED]: 'Cancelled',
};

export default function QueuePage() {
  const navigate = useNavigate();
  const { queueItems, stats, lastError, startPolling, stopPolling, startConsult, removeFromQueue, clearError, getNextPatient } = useQueueStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showAddModal, setShowAddModal] = useState(false);

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
  const nextPatient = getNextPatient();

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
      toast.success('Patient removed from queue.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove from queue');
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="page-title">Today's Queue</span>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--color-success-light)', color: '#047857', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="pulse-dot" /> Live WebSocket Sync
            </span>
          </div>
          <div className="page-subtitle">Real-time clinic queue management across Website & App</div>
        </div>
        <button className="primary-btn" onClick={() => setShowAddModal(true)}>
          ➕ Add Patient to Queue
        </button>
      </div>

      {/* Next Patient Hero Callout */}
      {nextPatient && (
        <div className="hero-action-card">
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85, marginBottom: 4 }}>
              Next Patient Up · Token #{nextPatient.tokenNumber}
            </div>
            <div className="hero-action-title">{nextPatient.patient?.name || 'Patient'}</div>
            <div className="hero-action-desc">
              {nextPatient.patient?.age} yrs · {nextPatient.patient?.gender} {nextPatient.consultationType === 'follow_up' ? '· Follow Up' : '· New Visit'}
            </div>
          </div>
          <button className="hero-action-btn" onClick={() => handleItemClick(nextPatient)}>
            Start Consultation →
          </button>
        </div>
      )}

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Registered</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.waiting}</div>
          <div className="stat-label">Waiting</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#0284c7' }}>{stats.inProgress}</div>
          <div className="stat-label">In Consultation</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#10b981' }}>{stats.completed}</div>
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
            {tab === 'all' ? 'All Queue' : STATUS_LABEL[tab]}
          </button>
        ))}
      </div>

      <div className="card-list">
        {filtered.length === 0 && (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M10 9l5 3-5 3V9z" />
            </svg>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>No Patients in Queue</div>
            <div>Click "+ Add Patient to Queue" to register or check-in a patient.</div>
          </div>
        )}

        {filtered.map((item) => (
          <div key={item.id} className="item-card" onClick={() => handleItemClick(item)}>
            <div className="item-card-left">
              <div className="token-badge" style={{ background: STATUS_COLOR[item.status] || 'var(--color-primary)' }}>
                #{item.tokenNumber}
              </div>
              <div>
                <div className="item-name">{item.patient?.name ?? 'Unknown patient'}</div>
                <div className="item-meta">
                  {item.patient?.age ? `${item.patient.age} yrs` : ''}
                  {item.patient?.gender ? ` · ${item.patient.gender}` : ''}
                  {item.consultationType === 'follow_up' ? ' · Follow-up' : ' · New Visit'}
                  {item.notes ? ` · Note: ${item.notes}` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={`status-pill ${item.status}`}>
                <span className="pulse-dot" style={{ width: 6, height: 6, background: STATUS_COLOR[item.status] }} />
                {STATUS_LABEL[item.status]}
              </span>
              {item.status === QueueStatus.WAITING && (
                <button type="button" className="icon-btn" onClick={(e) => handleRemove(e, item)} title="Remove from queue">
                  <CloseIcon size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <Portal>
          <AddPatientModal onClose={() => setShowAddModal(false)} />
        </Portal>
      )}
    </div>
  );
}
