import { useEffect, useState } from 'react';
import { useAuthStore, useIsDoctor } from '../../store/useAuthStore';
import * as ConnectionService from '../../api/connectionService';
import { getMe } from '../../api/authService';
import { supabase } from '../../api/supabase';
import type { ConnectionRequest, TeamMember, ClinicListItem } from '../../types/connection.types';
import { useToast } from '../../components/toast/ToastContext';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import { CloseIcon } from '../../components/icons';
import '../pages.css';
import '../auth/auth.css';

export default function ConnectionPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const isDoctor = useIsDoctor();
  const toast = useToast();
  const confirm = useConfirm();

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [pending, setPending] = useState<ConnectionRequest[]>([]);
  const [assistantPhone, setAssistantPhone] = useState('');

  const [clinicQuery, setClinicQuery] = useState('');
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<ClinicListItem | null>(null);
  const [doctorCode, setDoctorCode] = useState('');

  const syncUserSession = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        const freshProfile = await getMe();
        setUser(freshProfile, sessionData.session.access_token, sessionData.session.refresh_token);
      }
    } catch {
      // silent
    }
  };

  const load = () => {
    ConnectionService.getPendingRequests().then(setPending).catch(() => {});
    ConnectionService.getTeamMembers().then(setTeam).catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [isDoctor]);

  useEffect(() => {
    if (isDoctor) return;
    const t = setTimeout(() => {
      ConnectionService.listClinics(clinicQuery || undefined).then(setClinics).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [clinicQuery, isDoctor]);

  const handleCopyCode = () => {
    if (!user?.doctorCode) return;
    navigator.clipboard.writeText(user.doctorCode);
    toast.success('Doctor code copied to clipboard!');
  };

  const handleInvite = async () => {
    const phone = assistantPhone.trim().replace(/\D/g, '');
    if (phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number.');
      return;
    }
    try {
      await ConnectionService.inviteAssistant(phone);
      toast.success('Invite sent to assistant.');
      setAssistantPhone('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to invite assistant');
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await ConnectionService.acceptRequest(id);
      await syncUserSession();
      toast.success('Connection established successfully!');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to accept request');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await ConnectionService.rejectRequest(id);
      toast.success('Connection request cancelled/rejected.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject request');
    }
  };

  const handleDisconnect = async (assistantId: string) => {
    if (!(await confirm({ title: 'Disconnect assistant', message: 'Disconnect this assistant from clinic?', danger: true }))) return;
    try {
      await ConnectionService.disconnectAssistant(assistantId);
      toast.success('Assistant disconnected.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to disconnect assistant');
    }
  };

  const handleSelectClinic = async (clinic: ClinicListItem) => {
    setSelectedClinic(clinic);
  };

  const handleRequestJoin = async () => {
    const code = doctorCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error('Please enter a valid 6-character Doctor Code.');
      return;
    }
    try {
      await ConnectionService.requestToJoin(code);
      toast.success('Join request sent. Waiting for doctor approval.');
      setDoctorCode('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send join request');
    }
  };

  // Assistant: find connected doctor if any
  const connectedDoctor = !isDoctor ? team.find((m) => m.role === 'doctor') : null;
  const incomingInvitesForAssistant = !isDoctor
    ? pending.filter((r) => r.initiatedBy === 'doctor')
    : [];
  const outgoingRequestsForAssistant = !isDoctor
    ? pending.filter((r) => r.initiatedBy !== 'doctor')
    : [];

  // Doctor: incoming requests vs outgoing invites
  const incomingRequestsForDoctor = isDoctor
    ? pending.filter((r) => r.initiatedBy !== 'doctor')
    : [];
  const outgoingInvitesForDoctor = isDoctor
    ? pending.filter((r) => r.initiatedBy === 'doctor')
    : [];

  return (
    <div className="page-container-narrow animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Doctor & Assistant Connection</div>
          <div className="page-subtitle">Link doctor and assistant accounts to share the live queue</div>
        </div>
      </div>

      {isDoctor ? (
        <>
          <div className="stat-card" style={{ padding: 24, marginBottom: 20, background: 'linear-gradient(135deg, var(--color-primary-surface), #f0fdf4)', border: '1px solid var(--color-primary-light)' }}>
            <div className="auth-label" style={{ color: 'var(--color-primary-dark)', fontSize: '0.85rem' }}>Your Unique Doctor Code</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: 4, color: 'var(--color-primary-dark)' }}>
                {user?.doctorCode ?? '—'}
              </div>
              <button className="secondary-btn" onClick={handleCopyCode}>📋 Copy Code</button>
            </div>
            <div className="item-meta" style={{ marginTop: 8 }}>Share this code with your assistants so they can join your clinic queue.</div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Invite Assistant by Phone</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="auth-input" value={assistantPhone} onChange={(e) => setAssistantPhone(e.target.value)} placeholder="Enter 10-digit mobile number" maxLength={10} />
              <button className="primary-btn" onClick={handleInvite}>Send Invite</button>
            </div>
          </div>

          {/* Incoming Join Requests from Assistants */}
          {incomingRequestsForDoctor.length > 0 && (
            <div className="auth-field" style={{ marginTop: 24 }}>
              <label className="auth-label" style={{ color: 'var(--color-warning)' }}>Incoming Join Requests ({incomingRequestsForDoctor.length})</label>
              <div className="card-list" style={{ marginTop: 8 }}>
                {incomingRequestsForDoctor.map((r) => (
                  <div key={r.id} className="item-card" style={{ cursor: 'default' }}>
                    <div>
                      <div className="item-name">{r.assistantName ?? 'Assistant'}</div>
                      <div className="item-meta">
                        {r.assistantPhone ? `Phone: ${r.assistantPhone}` : ''}
                        {r.qualification ? ` · ${r.qualification}` : ''}
                        {r.city ? ` · ${r.city}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="primary-btn" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => handleAccept(r.id)}>Accept</button>
                      <button className="secondary-btn" style={{ padding: '6px 14px', fontSize: '0.8rem', color: 'var(--color-error)' }} onClick={() => handleReject(r.id)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing Invites Sent by Doctor */}
          {outgoingInvitesForDoctor.length > 0 && (
            <div className="auth-field" style={{ marginTop: 24 }}>
              <label className="auth-label" style={{ color: 'var(--color-text-muted)' }}>Pending Sent Invites ({outgoingInvitesForDoctor.length})</label>
              <div className="card-list" style={{ marginTop: 8 }}>
                {outgoingInvitesForDoctor.map((r) => (
                  <div key={r.id} className="item-card" style={{ cursor: 'default' }}>
                    <div>
                      <div className="item-name">{r.assistantName ?? 'Assistant'}</div>
                      <div className="item-meta">{r.assistantPhone} · Waiting for assistant to accept</div>
                    </div>
                    <button className="secondary-btn" style={{ padding: '6px 14px', fontSize: '0.8rem', color: 'var(--color-error)' }} onClick={() => handleReject(r.id)}>Cancel</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="auth-field" style={{ marginTop: 24 }}>
            <label className="auth-label">Connected Clinic Members ({team.length})</label>
            <div className="card-list" style={{ marginTop: 8 }}>
              {team.length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>
                  No assistants connected yet. Share your doctor code or send an invite to connect.
                </div>
              )}
              {team.map((m) => (
                <div key={m.id} className="item-card" style={{ cursor: 'default' }}>
                  <div className="item-card-left">
                    <div className="token-badge" style={{ width: 36, height: 36, fontSize: '0.85rem' }}>
                      {m.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="item-name">{m.name} {m.role === 'assistant' ? '(Assistant)' : '(Doctor)'}</div>
                      <div className="item-meta">{m.phone} {m.qualification ? `· ${m.qualification}` : ''}</div>
                    </div>
                  </div>
                  {m.role === 'assistant' && (
                    <button className="icon-btn" onClick={() => handleDisconnect(m.id)} title="Disconnect assistant">
                      <CloseIcon size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Connected Doctor Info */}
          {connectedDoctor && (
            <div className="stat-card" style={{ padding: 20, background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)', border: '1px solid #6ee7b7', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 800, color: '#047857', fontSize: '1.05rem' }}>Connected with Dr. {connectedDoctor.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#065f46', marginTop: 2 }}>
                    {connectedDoctor.specialty || 'General Practitioner'} · {connectedDoctor.phone}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#059669', marginTop: 4 }}>
                    Live clinic queue is synchronized with the doctor.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Incoming Invites from Doctors to this Assistant */}
          {incomingInvitesForAssistant.length > 0 && (
            <div className="auth-field" style={{ marginBottom: 24 }}>
              <label className="auth-label" style={{ color: 'var(--color-primary-dark)', fontWeight: 800 }}>
                Doctor Invitations for You ({incomingInvitesForAssistant.length})
              </label>
              <div className="card-list" style={{ marginTop: 8 }}>
                {incomingInvitesForAssistant.map((r) => (
                  <div key={r.id} className="item-card" style={{ cursor: 'default', border: '2px solid var(--color-primary-light)' }}>
                    <div>
                      <div className="item-name" style={{ color: 'var(--color-primary-dark)', fontWeight: 800 }}>
                        Dr. {r.doctorName || 'Doctor'}
                      </div>
                      <div className="item-meta">
                        {r.clinicName ? `Clinic: ${r.clinicName}` : 'Doctor has invited you to join their clinic queue.'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="primary-btn" style={{ padding: '6px 16px', fontSize: '0.85rem' }} onClick={() => handleAccept(r.id)}>Accept</button>
                      <button className="secondary-btn" style={{ padding: '6px 14px', fontSize: '0.85rem', color: 'var(--color-error)' }} onClick={() => handleReject(r.id)}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing join request pending */}
          {outgoingRequestsForAssistant.length > 0 && (
            <div className="stat-card" style={{ padding: 18, background: 'var(--color-warning-light)', border: '1px solid #fcd34d', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, color: '#b45309', fontSize: '0.95rem' }}>⏳ Join Request Pending Doctor Approval</div>
              <div style={{ fontSize: '0.825rem', color: '#b45309', marginTop: 4 }}>
                Your request has been submitted to Dr. {outgoingRequestsForAssistant[0].doctorName || 'the doctor'}. Once approved, the clinic queue will appear automatically.
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Search Clinic & Doctor</label>
            <input className="auth-input" value={clinicQuery} onChange={(e) => setClinicQuery(e.target.value)} placeholder="Type clinic name or doctor name..." />
          </div>

          <div className="card-list">
            {clinics.map((c) => (
              <div key={c.id} className="item-card" onClick={() => handleSelectClinic(c)}>
                <div>
                  <div className="item-name">{c.name}</div>
                  <div className="item-meta">Dr. {c.doctorName} · {c.doctorSpecialty}</div>
                </div>
                <button className="secondary-btn" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Select</button>
              </div>
            ))}
          </div>

          {selectedClinic && (
            <div className="auth-field" style={{ marginTop: 20, background: 'var(--color-surface)', padding: 18, borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-primary-light)' }}>
              <label className="auth-label">Enter Doctor Code for "{selectedClinic.name}"</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input className="auth-input" value={doctorCode} onChange={(e) => setDoctorCode(e.target.value)} placeholder="Enter 6-digit Doctor Code" />
                <button className="primary-btn" onClick={handleRequestJoin}>Request to Join</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
