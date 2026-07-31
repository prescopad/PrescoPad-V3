import type { Prescription } from '../types/prescription.types';
import type { Clinic, DoctorProfile } from '../types/clinic.types';
import type { Patient } from '../types/patient.types';
import { renderPrescriptionPdf, renderCertificatePdf, renderReceiptPdf } from './prescriptionPdf';
import type { CertificatePdfInput, ReceiptPdfInput } from './prescriptionPdf';
import { renderCasebookPdf } from './casebookPdf';

export async function downloadPrescriptionClient(
  rx: Prescription,
  clinic: Clinic | null,
  doctorProfile: DoctorProfile | null
) {
  const docName = doctorProfile?.name || 'Doctor';
  const clinicName = clinic?.name || 'PrescoPad Clinic';

  const pdfBytes = await renderPrescriptionPdf({
    clinicName,
    clinicAddress: clinic?.address || undefined,
    clinicPhone: clinic?.phone || undefined,
    clinicEmail: clinic?.email || undefined,
    doctorName: docName,
    qualification: doctorProfile?.specialty || undefined,
    regNumber: doctorProfile?.regNumber || undefined,
    patientName: rx.patientName || 'Patient',
    patientAge: rx.patientAge || undefined,
    patientGender: rx.patientGender || undefined,
    date: new Date(rx.createdAt),
    consultationType: rx.consultationType === 'new' ? 'New Consultation' : rx.consultationType === 'follow_up' ? 'Follow-up' : undefined,
    symptoms: rx.symptoms,
    diagnosis: rx.diagnosis || undefined,
    medicines: rx.medicines,
    labTests: rx.labTests,
    advice: rx.advice || undefined,
    referredTo: rx.referredTo || undefined,
    followUpDate: rx.followUpDate || undefined,
    signatureSvgPath: rx.signature && rx.signature.startsWith('M') ? rx.signature : undefined,
    pdfHash: rx.pdfHash || undefined,
    isMlc: rx.isMlc || false,
    attachCertificate: rx.attachCertificate ? {
      clinicName,
      doctorName: docName,
      regNumber: doctorProfile?.regNumber || undefined,
      patientName: rx.patientName || 'Patient',
      patientAge: rx.patientAge || undefined,
      patientGender: rx.patientGender || undefined,
      diagnosis: rx.attachCertificate.diagnosis || rx.diagnosis || 'Acute Illness',
      restDays: rx.attachCertificate.restDays || '3',
      startDate: rx.attachCertificate.startDate || new Date().toISOString().split('T')[0],
      fitnessStatus: rx.attachCertificate.fitnessStatus || 'unfit',
    } : undefined,
    attachReceipt: rx.attachReceipt ? {
      clinicName,
      doctorName: docName,
      patientName: rx.patientName || 'Patient',
      receiptNo: `REC-${rx.id.slice(-5).toUpperCase()}`,
      date: new Date(rx.createdAt).toLocaleDateString('en-IN'),
      amount: rx.attachReceipt.amount || rx.chargeAmount || 500,
      paymentMode: rx.attachReceipt.paymentMode || 'Cash',
      towards: rx.attachReceipt.towards || 'Consultation & Treatment Fee',
    } : undefined,
  });

  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const visitDate = new Date(rx.createdAt)
    .toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-');
  const safeName = (rx.patientName || 'Patient')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  a.download = `${visitDate}_${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function printPrescriptionClient(
  rx: Prescription,
  clinic: Clinic | null,
  doctorProfile: DoctorProfile | null
) {
  const docName = doctorProfile?.name || 'Doctor';
  const clinicName = clinic?.name || 'PrescoPad Clinic';

  const pdfBytes = await renderPrescriptionPdf({
    clinicName,
    clinicAddress: clinic?.address || undefined,
    clinicPhone: clinic?.phone || undefined,
    clinicEmail: clinic?.email || undefined,
    doctorName: docName,
    qualification: doctorProfile?.specialty || undefined,
    regNumber: doctorProfile?.regNumber || undefined,
    patientName: rx.patientName || 'Patient',
    patientAge: rx.patientAge || undefined,
    patientGender: rx.patientGender || undefined,
    date: new Date(rx.createdAt),
    consultationType: rx.consultationType === 'new' ? 'New Consultation' : rx.consultationType === 'follow_up' ? 'Follow-up' : undefined,
    symptoms: rx.symptoms,
    diagnosis: rx.diagnosis || undefined,
    medicines: rx.medicines,
    labTests: rx.labTests,
    advice: rx.advice || undefined,
    referredTo: rx.referredTo || undefined,
    followUpDate: rx.followUpDate || undefined,
    signatureSvgPath: rx.signature && rx.signature.startsWith('M') ? rx.signature : undefined,
    pdfHash: rx.pdfHash || undefined,
    isMlc: rx.isMlc || false,
    attachCertificate: rx.attachCertificate ? {
      clinicName,
      doctorName: docName,
      regNumber: doctorProfile?.regNumber || undefined,
      patientName: rx.patientName || 'Patient',
      patientAge: rx.patientAge || undefined,
      patientGender: rx.patientGender || undefined,
      diagnosis: rx.attachCertificate.diagnosis || rx.diagnosis || 'Acute Illness',
      restDays: rx.attachCertificate.restDays || '3',
      startDate: rx.attachCertificate.startDate || new Date().toISOString().split('T')[0],
      fitnessStatus: rx.attachCertificate.fitnessStatus || 'unfit',
    } : undefined,
    attachReceipt: rx.attachReceipt ? {
      clinicName,
      doctorName: docName,
      patientName: rx.patientName || 'Patient',
      receiptNo: `REC-${rx.id.slice(-5).toUpperCase()}`,
      date: new Date(rx.createdAt).toLocaleDateString('en-IN'),
      amount: rx.attachReceipt.amount || rx.chargeAmount || 500,
      paymentMode: rx.attachReceipt.paymentMode || 'Cash',
      towards: rx.attachReceipt.towards || 'Consultation & Treatment Fee',
    } : undefined,
  });

  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}


function parseList(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((x) => (typeof x === 'string' ? x.trim() : String(x))).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => (typeof x === 'string' ? x.trim() : String(x))).filter(Boolean);
        }
      } catch {
        // Fallback
      }
    }
    return trimmed.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

export async function printCasebookClient(patient: Patient, prescriptions?: Prescription[]) {
  const visits = (prescriptions ?? []).map((rx) => {
    const syms = parseList(rx.symptoms);
    return {
      date: rx.createdAt
        ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
      diagnosis: rx.diagnosis || undefined,
      symptoms: syms.length > 0 ? syms : undefined,
      medicines: (rx.medicines ?? []).map((m: any) => {
        const name = m.medicineName || m.medicine_name || m.name || '';
        const parts = [
          name,
          m.type,
          m.dosage || m.frequency,
          m.duration ? `for ${m.duration}` : '',
          m.timing,
        ].filter(Boolean);
        return parts.join(' | ');
      }),
      labTests: (rx.labTests ?? []).map((t: any) => t.testName || t.test_name || t.name || '').filter(Boolean),
      advice: rx.advice || undefined,
      followUpDate: rx.followUpDate
        ? new Date(rx.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : undefined,
    };
  });

  const pdfBytes = await renderCasebookPdf({
    clinicName: 'PrescoPad AI Casebook',
    patientName: patient.name,
    patientAge: patient.age || undefined,
    patientGender: patient.gender || undefined,
    bloodGroup: patient.bloodGroup || undefined,
    allergies: patient.allergies || undefined,
    caseSummary: patient.caseSummary || undefined,
    visits: visits.length > 0 ? visits : undefined,
  });

  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const safeName = (patient.name || 'Patient')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  a.download = `Casebook_${safeName}.pdf`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadCertificateClient(input: CertificatePdfInput, patientName: string) {
  const pdfBytes = await renderCertificatePdf(input);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = (patientName || 'Patient').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  a.download = `Certificate_${safe}.pdf`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadReceiptClient(input: ReceiptPdfInput, patientName: string) {
  const pdfBytes = await renderReceiptPdf(input);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safe = (patientName || 'Patient').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  a.download = `Receipt_${safe}.pdf`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function shareCertificateWhatsApp(input: CertificatePdfInput, patientPhone?: string) {
  if (!patientPhone) return;
  const message =
    `Namaste ${input.patientName},\n\n` +
    `Medical Certificate from Dr. ${input.doctorName} (${input.clinicName}):\n` +
    `- Diagnosis: ${input.diagnosis}\n` +
    `- Advised Rest: ${input.restDays} Day(s) from ${input.startDate}\n` +
    `- Status: ${input.fitnessStatus === 'fit' ? 'FIT TO RESUME DUTIES' : 'UNFIT FOR DUTY'}`;

  const cleaned = patientPhone.replace(/\D/g, '');
  const number = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

export function shareReceiptWhatsApp(input: ReceiptPdfInput, patientPhone?: string) {
  if (!patientPhone) return;
  const message =
    `Namaste ${input.patientName},\n\n` +
    `Payment Receipt from ${input.clinicName} (Dr. ${input.doctorName}):\n` +
    `- Receipt No: ${input.receiptNo}\n` +
    `- Amount Received: Rs. ${input.amount.toFixed(2)} (${input.paymentMode.toUpperCase()})\n` +
    `- Purpose: ${input.towards}`;

  const cleaned = patientPhone.replace(/\D/g, '');
  const number = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}


