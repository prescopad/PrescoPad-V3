import { useState } from 'react';
import type { Prescription } from '../types/prescription.types';
import { useClinicStore } from '../store/useClinicStore';
import { useAuthStore } from '../store/useAuthStore';
import { getShareToken, downloadPrescriptionPdf } from '../api/dataService';
import { PRODUCTION_BACKEND_URL } from '../constants/config';
import './prescriptionActions.css';

interface Props {
  prescription: Prescription | null;
}

export default function PrescriptionActions({ prescription }: Props) {
  const { clinic, doctorProfile } = useClinicStore();
  const { user } = useAuthStore();
  const [busy, setBusy] = useState<null | 'whatsapp' | 'download' | 'print'>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  if (!prescription) return null;

  const handleWhatsApp = async () => {
    if (busy) return;
    if (!prescription.patientPhone) {
      alert('Patient phone number is not available.');
      return;
    }

    setBusy('whatsapp');
    try {
      // 1. Fetch the share token from backend
      const { share_token } = await getShareToken(prescription.id);

      // 2. Build download URL pointing to production backend
      const cleanBaseUrl = PRODUCTION_BACKEND_URL.replace(/\/api\/?$/, '');
      const downloadUrl = `${cleanBaseUrl}/rx/${share_token}`;

      // 3. Build message matching the app exactly
      const docName = doctorProfile?.name || user?.name || 'Doctor';
      const clinicName = clinic?.name || 'PrescoPad';
      const message =
        `Namaste ${prescription.patientName}, this is Dr. ${docName} from ${clinicName}.\n\n` +
        `Your prescription is ready. Tap below to download:\n\n` +
        `${downloadUrl}\n\n` +
        `This link will remain valid for 7 days.`;

      // 4. Open WhatsApp link
      const cleaned = prescription.patientPhone.replace(/\D/g, '');
      const number = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
      const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      
      setShowSuccessOverlay(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to generate WhatsApp share link.');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    if (busy) return;
    setBusy('download');
    try {
      const blob = await downloadPrescriptionPdf(prescription.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const visitDate = new Date(prescription.createdAt)
        .toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        .replace(/\//g, '-');
      const safeName = (prescription.patientName || 'Patient')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_');
      
      a.download = `${visitDate}_${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to download PDF.');
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    if (busy) return;
    setBusy('print');
    try {
      const blob = await downloadPrescriptionPdf(prescription.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load PDF for printing.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="actions-container">
        <button
          className="action-btn action-whatsapp"
          disabled={busy !== null}
          onClick={handleWhatsApp}
        >
          {busy === 'whatsapp' ? (
            'Loading...'
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.706 1.458h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Send to Patient (WhatsApp)
            </>
          )}
        </button>

        <button
          className="action-btn action-download"
          disabled={busy !== null}
          onClick={handleDownload}
        >
          {busy === 'download' ? (
            'Loading...'
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDF
            </>
          )}
        </button>

        <button
          className="action-btn action-print"
          disabled={busy !== null}
          onClick={handlePrint}
        >
          {busy === 'print' ? (
            'Loading...'
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print / View PDF
            </>
          )}
        </button>
      </div>

      {showSuccessOverlay && (
        <div className="actions-success-banner">
          <div className="actions-success-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>Direct WhatsApp chat opened for {prescription.patientName}!</span>
          </div>
          <div className="actions-success-actions">
            <button className="secondary-btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowSuccessOverlay(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
