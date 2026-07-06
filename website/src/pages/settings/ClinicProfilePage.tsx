import { useEffect, useState } from 'react';
import { useClinicStore } from '../../store/useClinicStore';
import { useIsDoctor } from '../../store/useAuthStore';
import SignaturePad from '../../components/SignaturePad';
import { useToast } from '../../components/toast/ToastContext';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import '../pages.css';
import '../auth/auth.css';
import '../../components/modal.css';

export default function ClinicProfilePage() {
  const { clinic, doctorProfile, loadClinic, loadDoctorProfile, updateClinic, updateDoctorProfile } = useClinicStore();
  const isDoctor = useIsDoctor();
  const toast = useToast();
  const confirm = useConfirm();

  // Clinic Details
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  
  // Doctor Details
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [regNumber, setRegNumber] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  useEffect(() => {
    loadClinic();
    loadDoctorProfile();
  }, [loadClinic, loadDoctorProfile]);

  useEffect(() => {
    if (!clinic) return;
    setName(clinic.name || '');
    setAddress(clinic.address || '');
    setPhone(clinic.phone || '');
    setEmail(clinic.email || '');
  }, [clinic]);

  useEffect(() => {
    if (!doctorProfile) return;
    setDoctorName(doctorProfile.name || '');
    setSpecialty(doctorProfile.specialty || '');
    setRegNumber(doctorProfile.regNumber || '');
  }, [doctorProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateClinic({ name, address, phone, email });
      if (isDoctor) {
        await updateDoctorProfile({
          name: doctorName.trim(),
          specialty: specialty.trim(),
          regNumber: regNumber.trim(),
        });
      }
      toast.success('Clinic and doctor profile details updated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update clinic profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSignature = async (svgPath: string) => {
    setShowSignaturePad(false);
    try {
      await updateDoctorProfile({ signatureBase64: svgPath });
      toast.success('Signature saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save signature');
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingQr(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', 'itzjvzjx'); // Using unsigned upload preset

      const endpoint = `https://api.cloudinary.com/v1_1/dkyby5fyw/image/upload`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        throw new Error('Cloudinary upload failed.');
      }

      const data = await response.json();
      const qrUrl = data.secure_url;

      await updateClinic({ qrCodeUrl: qrUrl });
      toast.success('Payment QR code uploaded successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload QR code.');
    } finally {
      setIsUploadingQr(false);
      // Clear file input value to allow uploading same file again
      e.target.value = '';
    }
  };

  const handleRemoveQrCode = async () => {
    if (!(await confirm({ title: 'Remove QR code', message: 'Are you sure you want to remove the QR code image?', danger: true }))) return;
    try {
      await updateClinic({ qrCodeUrl: null });
      toast.success('QR code removed.');
    } catch (err) {
      toast.error('Failed to remove QR code.');
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <div className="page-title">Clinic Profile</div>
      </div>

      {/* Clinic Section */}
      <h3 style={{ fontSize: '1.1rem', margin: '20px 0 10px', color: 'var(--color-primary)' }}>Clinic Information</h3>
      
      <div className="auth-field">
        <label className="auth-label">Clinic name *</label>
        <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} disabled={!isDoctor} />
      </div>
      <div className="auth-field">
        <label className="auth-label">Address</label>
        <input className="auth-input" value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isDoctor} />
      </div>
      <div className="auth-form-row">
        <div className="auth-field">
          <label className="auth-label">Phone</label>
          <input className="auth-input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isDoctor} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isDoctor} />
        </div>
      </div>

      {/* Doctor Section (Only for doctor editing / assistant viewing) */}
      <h3 style={{ fontSize: '1.1rem', margin: '28px 0 10px', color: 'var(--color-primary)' }}>Doctor Details</h3>
      
      <div className="auth-field">
        <label className="auth-label">Doctor Name *</label>
        <input className="auth-input" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} disabled={!isDoctor} />
      </div>
      <div className="auth-form-row">
        <div className="auth-field">
          <label className="auth-label">Specialty</label>
          <input className="auth-input" value={specialty} onChange={(e) => setSpecialty(e.target.value)} disabled={!isDoctor} placeholder="e.g. Cardiologist" />
        </div>
        <div className="auth-field">
          <label className="auth-label">Registration Number</label>
          <input className="auth-input" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} disabled={!isDoctor} placeholder="e.g. MH/12345" />
        </div>
      </div>

      {isDoctor && (
        <button className="primary-btn" style={{ width: '100%', padding: 12, marginTop: 10 }} disabled={isSaving} onClick={handleSave}>
          {isSaving ? 'Saving Profile Details...' : 'Save Profile Details'}
        </button>
      )}

      {/* Digital Signature Section */}
      <h3 style={{ fontSize: '1.1rem', margin: '36px 0 10px', color: 'var(--color-primary)' }}>Signatures & Customizations</h3>

      <div style={{ marginBottom: 20 }}>
        <div className="auth-label" style={{ marginBottom: 6 }}>Digital Signature</div>
        {doctorProfile?.signatureBase64 ? (
          <div style={{ marginBottom: 10, padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-secondary)', display: 'inline-block' }}>
            {doctorProfile.signatureBase64.startsWith('M') ? (
              <svg width={200} height={60} style={{ display: 'block' }}>
                <path d={doctorProfile.signatureBase64} stroke="var(--color-text)" strokeWidth={3} fill="none" />
              </svg>
            ) : (
              <img src={doctorProfile.signatureBase64} alt="signature" style={{ maxHeight: 60, display: 'block' }} />
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 10 }}>No digital signature drawn yet.</div>
        )}
        {isDoctor && (
          <button className="secondary-btn" onClick={() => setShowSignaturePad(true)}>
            {doctorProfile?.signatureBase64 ? 'Draw New Signature' : 'Draw Digital Signature'}
          </button>
        )}
      </div>

      {/* QR Code Section */}
      <div style={{ marginBottom: 30 }}>
        <div className="auth-label" style={{ marginBottom: 6 }}>Payment QR Code</div>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 10px' }}>
          Upload a UPI QR code image. This QR code will print on A4 prescriptions for patient payment scans.
        </p>
        
        {clinic?.qrCodeUrl ? (
          <div style={{ marginBottom: 10, display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            <div style={{ padding: 8, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-white)' }}>
              <img src={clinic.qrCodeUrl} alt="UPI QR" style={{ height: 100, width: 100, objectFit: 'contain' }} />
            </div>
            {isDoctor && (
              <button className="secondary-btn" style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)', background: '#fff1f2' }} onClick={handleRemoveQrCode}>
                Delete QR
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 10 }}>No QR code uploaded yet.</div>
        )}

        {isDoctor && (
          <div>
            <input
              type="file"
              id="qr-file-picker"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleQrUpload}
              disabled={isUploadingQr}
            />
            <button
              className="secondary-btn"
              onClick={() => document.getElementById('qr-file-picker')?.click()}
              disabled={isUploadingQr}
            >
              {isUploadingQr ? 'Uploading code...' : clinic?.qrCodeUrl ? 'Replace QR Code' : 'Upload QR Code'}
            </button>
          </div>
        )}
      </div>

      {/* Signature Draw Modal */}
      {showSignaturePad && (
        <div className="modal-backdrop" onClick={() => setShowSignaturePad(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div className="modal-title">Draw your signature</div>
              <button className="modal-close" onClick={() => setShowSignaturePad(false)}>✕</button>
            </div>
            <div className="modal-body">
              <SignaturePad onConfirm={handleSaveSignature} onCancel={() => setShowSignaturePad(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
