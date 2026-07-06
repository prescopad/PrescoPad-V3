import { useEffect, useState } from 'react';
import { useAuthStore, useIsDoctor } from '../../store/useAuthStore';
import * as ConnectionService from '../../api/connectionService';
import type { ConnectionRequest, TeamMember, ClinicListItem, DoctorListItem } from '../../types/connection.types';
import { useToast } from '../../components/toast/ToastContext';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import { CloseIcon } from '../../components/icons';
import '../pages.css';
import '../auth/auth.css';

export default function ConnectionPage() {
  const user = useAuthStore((s) => s.user);
  const isDoctor = useIsDoctor();
  const toast = useToast();
  const confirm = useConfirm();

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [pending, setPending] = useState<ConnectionRequest[]>([]);
  const [assistantPhone, setAssistantPhone] = useState('');

  const [clinicQuery, setClinicQuery] = useState('');
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<ClinicListItem | null>(null);
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [doctorCode, setDoctorCode] = useState('');

  const load = () => {
    if (isDoctor) {
      ConnectionService.getTeamMembers().then(setTeam).catch(() => {});
      ConnectionService.getPendingRequests().then(setPending).catch(() => {});
    } else {
      ConnectionService.getPendingRequests().then(setPending).catch(() => {});
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoctor]);

  useEffect(() => {
    if (isDoctor) return;
    const t = setTimeout(() => {
      ConnectionService.listClinics(clinicQuery || undefined).then(setClinics).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [clinicQuery, isDoctor]);

  const handleInvite = async () => {
    if (!assistantPhone.trim()) return;
    try {
      await ConnectionService.inviteAssistant(assistantPhone.trim());
      toast.success('Invite sent.');
      setAssistantPhone('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to invite assistant');
    }
  };

  const handleAccept = async (id: string) => {
    await ConnectionService.acceptRequest(id);
    load();
  };

  const handleReject = async (id: string) => {
    await ConnectionService.rejectRequest(id);
    load();
  };

  const handleDisconnect = async (assistantId: string) => {
    if (!(await confirm({ title: 'Disconnect assistant', message: 'Disconnect this assistant?', danger: true }))) return;
    await ConnectionService.disconnectAssistant(assistantId);
    load();
  };

  const handleSelectClinic = async (clinic: ClinicListItem) => {
    setSelectedClinic(clinic);
    const docs = await ConnectionService.getDoctorsByClinic(clinic.id);
    setDoctors(docs);
  };

  const handleRequestJoin = async () => {
    if (!doctorCode.trim()) return;
    try {
      await ConnectionService.requestToJoin(doctorCode.trim());
      toast.success('Join request sent. Waiting for doctor approval.');
      setDoctorCode('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send join request');
    }
  };

  return (
    <div className="page-container-narrow">
      <div className="page-header">
        <div className="page-title">Connection</div>
      </div>

      {isDoctor ? (
        <>
          <div className="auth-field" style={{ background: 'var(--color-primary-surface)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
            <label className="auth-label">Your doctor code</label>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: 2 }}>{user?.doctorCode ?? '—'}</div>
            <div className="item-meta">Share this code with your assistant, or invite them by phone below.</div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Invite assistant by phone</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="auth-input" value={assistantPhone} onChange={(e) => setAssistantPhone(e.target.value)} placeholder="10-digit phone" />
              <button className="primary-btn" onClick={handleInvite}>Invite</button>
            </div>
          </div>

          {pending.length > 0 && (
            <div className="auth-field">
              <label className="auth-label">Pending requests</label>
              <div className="card-list">
                {pending.map((r) => (
                  <div key={r.id} className="item-card" style={{ cursor: 'default' }}>
                    <div>
                      <div className="item-name">{r.assistantName ?? 'Assistant'}</div>
                      <div className="item-meta">{r.assistantPhone}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="secondary-btn" onClick={() => handleAccept(r.id)}>Accept</button>
                      <button className="icon-btn" onClick={() => handleReject(r.id)}><CloseIcon size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Team</label>
            <div className="card-list">
              {team.length === 0 && <div className="empty-state">No assistants connected yet</div>}
              {team.map((m) => (
                <div key={m.id} className="item-card" style={{ cursor: 'default' }}>
                  <div>
                    <div className="item-name">{m.name}</div>
                    <div className="item-meta">{m.phone}</div>
                  </div>
                  <button className="icon-btn" onClick={() => handleDisconnect(m.id)}><CloseIcon size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="auth-field" style={{ background: 'var(--color-warning-light)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
              Waiting for doctor approval...
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Search clinics</label>
            <input className="auth-input" value={clinicQuery} onChange={(e) => setClinicQuery(e.target.value)} placeholder="Clinic name..." />
          </div>

          <div className="card-list">
            {clinics.map((c) => (
              <div key={c.id} className={`item-card ${selectedClinic?.id === c.id ? '' : ''}`} onClick={() => handleSelectClinic(c)}>
                <div>
                  <div className="item-name">{c.name}</div>
                  <div className="item-meta">{c.doctorName} · {c.doctorSpecialty}</div>
                </div>
              </div>
            ))}
          </div>

          {selectedClinic && doctors.length > 0 && (
            <div className="auth-field">
              <label className="auth-label">Enter doctor's code to join</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="auth-input" value={doctorCode} onChange={(e) => setDoctorCode(e.target.value)} placeholder="Doctor code" />
                <button className="primary-btn" onClick={handleRequestJoin}>Request to join</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
