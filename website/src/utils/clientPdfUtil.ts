import type { Prescription } from '../types/prescription.types';
import type { Clinic, DoctorProfile } from '../types/clinic.types';
import type { Patient } from '../types/patient.types';
import { renderPrescriptionPdf } from './prescriptionPdf';
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
  });

  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

export async function printCasebookClient(patient: Patient, prescriptions?: Prescription[]) {
  const visits = (prescriptions ?? []).map((rx) => ({
    date: rx.createdAt
      ? new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—',
    diagnosis: rx.diagnosis || undefined,
    symptoms: rx.symptoms && rx.symptoms.length > 0 ? rx.symptoms : undefined,
    medicines: (rx.medicines ?? []).map((m: any) => {
      const name = m.medicineName || m.medicine_name || m.name || '';
      const parts = [name, m.type, m.frequency, m.duration ? `for ${m.duration}` : '', m.timing].filter(Boolean);
      return parts.join(' | ');
    }),
    labTests: (rx.labTests ?? []).map((t: any) => t.testName || t.test_name || t.name || '').filter(Boolean),
    advice: rx.advice || undefined,
    followUpDate: rx.followUpDate
      ? new Date(rx.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : undefined,
  }));

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
