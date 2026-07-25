import { useEffect, useState } from 'react';
import { useClinicStore } from '../../store/useClinicStore';
import { useIsDoctor } from '../../store/useAuthStore';
import SignaturePad from '../../components/SignaturePad';
import { useToast } from '../../components/toast/ToastContext';
import { useConfirm } from '../../components/confirm/ConfirmContext';
import { CloseIcon } from '../../components/icons';
import Portal from '../../components/Portal';
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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

  const handleImageUpload = async (file: File) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary is not configured in website/.env (missing VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)');
    }

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const response = await fetch(endpoint, { method: 'POST', body: form });

    if (!response.ok) throw new Error('Cloudinary upload failed.');
    const data = await response.json();
    return data.secure_url as string;
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingQr(true);
    try {
      const url = await handleImageUpload(file);
      await updateClinic({ qrCodeUrl: url });
      toast.success('Payment QR code uploaded successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload QR code.');
    } finally {
      setIsUploadingQr(false);
      e.target.value = '';
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const url = await handleImageUpload(file);
      await updateClinic({ logoBase64: url });
      toast.success('Clinic logo uploaded successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload clinic logo.');
    } finally {
      setIsUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleRemoveQrCode = async () => {
    if (!(await confirm({ title: 'Remove QR code', message: 'Are you sure you want to remove the QR code image?', danger: true }))) return;
    try {
      await updateClinic({ qrCodeUrl: null });
      toast.success('QR code removed.');
    } catch {
      toast.error('Failed to remove QR code.');
    }
  };

  const handleRemoveLogo = async () => {
    if (!(await confirm({ title: 'Remove Logo', message: 'Are you sure you want to remove the clinic logo?', danger: true }))) return;
    try {
      await updateClinic({ logoBase64: null });
      toast.success('Clinic logo removed.');
    } catch {
      toast.error('Failed to remove clinic logo.');
    }
  };

  return (
    <div className="page-container-narrow animate-fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Clinic Profile</div>
          <div className="page-subtitle">Configure clinic branding, prescription headers, and UPI payments</div>
        </div>
      </div>

      {/* Clinic Section */}
      <h3 style={{ fontSize: '1.1rem', margin: '20px 0 10px', color: 'var(--color-primary)', fontWeight: 800 }}>🏥 Clinic Details</h3>

      <div className="auth-field">
        <label className="auth-label">Clinic Name *</label>
        <input className="auth-input" value={name} onChange={(e) => setName(e.target.value)} disabled={!isDoctor} placeholder="e.g. HealthCare Super Clinic" />
      </div>
      <div className="auth-field">
        <label className="auth-label">Address</label>
        <input className="auth-input" value={address} onChange={(e) => setAddress(e.target.value)} disabled={!isDoctor} placeholder="Full clinic address" />
      </div>
      <div className="auth-form-row">
        <div className="auth-field">
          <label className="auth-label">Clinic Phone</label>
          <input className="auth-input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isDoctor} />
        </div>
        <div className="auth-field">
          <label className="auth-label">Clinic Email</label>
          <input className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isDoctor} />
        </div>
      </div>

      {/* Doctor Section */}
      <h3 style={{ fontSize: '1.1rem', margin: '28px 0 10px', color: 'var(--color-primary)', fontWeight: 800 }}>👨‍⚕️ Doctor Credentials</h3>

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

      {/* Branding & Media Section */}
      <h3 style={{ fontSize: '1.1rem', margin: '36px 0 14px', color: 'var(--color-primary)', fontWeight: 800 }}>🎨 Branding & Prescription Customization</h3>

      {/* Clinic Logo */}
      <div style={{ marginBottom: 24, background: 'var(--color-surface)', padding: 18, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
        <div className="auth-label" style={{ marginBottom: 4 }}>Clinic Logo Image</div>
        <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
          Appears on top header of generated A4 prescriptions.
        </p>

        {clinic?.logoBase64 ? (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
            <img src={clinic.logoBase64} alt="Clinic Logo" style={{ height: 60, maxWidth: 180, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--color-border)' }} />
            {isDoctor && (
              <button className="secondary-btn" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error-light)' }} onClick={handleRemoveLogo}>
                Remove Logo
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 12 }}>No logo uploaded yet.</div>
        )}

        {isDoctor && (
          <div>
            <input type="file" id="logo-file-picker" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} disabled={isUploadingLogo} />
            <button className="secondary-btn" onClick={() => document.getElementById('logo-file-picker')?.click()} disabled={isUploadingLogo}>
              {isUploadingLogo ? 'Uploading logo...' : clinic?.logoBase64 ? 'Replace Logo' : 'Upload Clinic Logo'}
            </button>
          </div>
        )}
      </div>

      {/* Payment QR Code */}
      <div style={{ marginBottom: 30, background: 'var(--color-surface)', padding: 18, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)' }}>
        <div className="auth-label" style={{ marginBottom: 4 }}>UPI Payment QR Code</div>
        <p style={{ fontSize: '0.775rem', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
          Printed on bottom corner of prescriptions for instant patient UPI payment scanning.
        </p>

        {clinic?.qrCodeUrl ? (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
            <img src={clinic.qrCodeUrl} alt="UPI QR" style={{ height: 100, width: 100, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--color-border)' }} />
            {isDoctor && (
              <button className="secondary-btn" style={{ color: 'var(--color-error)', borderColor: 'var(--color-error-light)' }} onClick={handleRemoveQrCode}>
                Delete QR
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 12 }}>No QR code uploaded yet.</div>
        )}

        {isDoctor && (
          <div>
            <input type="file" id="qr-file-picker" accept="image/*" style={{ display: 'none' }} onChange={handleQrUpload} disabled={isUploadingQr} />
            <button className="secondary-btn" onClick={() => document.getElementById('qr-file-picker')?.click()} disabled={isUploadingQr}>
              {isUploadingQr ? 'Uploading QR...' : clinic?.qrCodeUrl ? 'Replace QR Code' : 'Upload UPI QR Code'}
            </button>
          </div>
        )}
      </div>

      {/* Signature Draw Modal */}
      {showSignaturePad && (
        <Portal>
          <div className="modal-backdrop" onClick={() => setShowSignaturePad(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
              <div className="modal-header">
                <span className="modal-title">Draw Digital Signature</span>
                <button className="modal-close-btn" onClick={() => setShowSignaturePad(false)}><CloseIcon size={18} /></button>
              </div>
              <div className="modal-body">
                <SignaturePad onConfirm={handleSaveSignature} onCancel={() => setShowSignaturePad(false)} />
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
