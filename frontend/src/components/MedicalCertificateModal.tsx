import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useClinicStore } from '../store/useClinicStore';
import { useAuthStore } from '../store/useAuthStore';

interface MedicalCertificateModalProps {
  visible: boolean;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  patientAddress?: string;
  initialDiagnosis?: string;
  onClose: () => void;
}

export default function MedicalCertificateModal({
  visible,
  patientName,
  patientAge,
  patientGender,
  patientAddress = '',
  initialDiagnosis = '',
  onClose,
}: MedicalCertificateModalProps): React.JSX.Element {
  const clinic = useClinicStore((s) => s.clinic);
  const doctorProfile = useClinicStore((s) => s.doctorProfile);
  const user = useAuthStore((s) => s.user);

  const doctorName = doctorProfile?.name || user?.name || 'Doctor';
  const regNumber = doctorProfile?.regNumber || '';

  const [diagnosis, setDiagnosis] = useState(initialDiagnosis || 'Acute Illness');
  const [restDays, setRestDays] = useState('3');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [fitnessStatus, setFitnessStatus] = useState<'fit' | 'unfit' | 'light_duty'>('unfit');
  const [reason, setReason] = useState('Requires rest and medical treatment.');

  const handlePrint = () => {
    Alert.alert('Medical Certificate Ready', 'Certificate generated and ready for print/export.');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="document-text" size={22} color={COLORS.primary} />
              <Text style={styles.title}>Medical Certificate</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {/* Form Section */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Patient Name</Text>
              <TextInput style={[styles.input, styles.readOnly]} value={patientName} editable={false} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Diagnosis / Reason for Leave</Text>
              <TextInput
                style={styles.input}
                value={diagnosis}
                onChangeText={setDiagnosis}
                placeholder="Diagnosis"
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Rest Days</Text>
                <TextInput
                  style={styles.input}
                  value={restDays}
                  onChangeText={setRestDays}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Fitness Status</Text>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[styles.statusBtn, fitnessStatus === 'unfit' && styles.statusBtnActive]}
                  onPress={() => setFitnessStatus('unfit')}
                >
                  <Text style={[styles.statusBtnText, fitnessStatus === 'unfit' && styles.statusBtnTextActive]}>
                    Unfit for Work
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusBtn, fitnessStatus === 'fit' && styles.statusBtnActive]}
                  onPress={() => setFitnessStatus('fit')}
                >
                  <Text style={[styles.statusBtnText, fitnessStatus === 'fit' && styles.statusBtnTextActive]}>
                    Fit to Resume
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Paper Preview Box */}
            <View style={styles.certificatePaper}>
              <Text style={styles.certHeading}>MEDICAL CERTIFICATE</Text>
              <Text style={styles.clinicHeader}>{clinic?.name || 'Clinic'}</Text>
              <Text style={styles.certBody}>
                This is to certify that Mr./Mrs. <Text style={{ fontWeight: '700' }}>{patientName}</Text> (Age: {patientAge || '--'}, Gender: {patientGender || '--'}) has been under my medical treatment for <Text style={{ fontWeight: '700' }}>{diagnosis}</Text>.
              </Text>
              <Text style={styles.certBody}>
                I advise medical leave/rest for a period of <Text style={{ fontWeight: '700' }}>{restDays} Days</Text> starting from <Text style={{ fontWeight: '700' }}>{startDate}</Text>.
              </Text>
              <Text style={styles.certBody}>
                Status: <Text style={{ fontWeight: '700', color: fitnessStatus === 'fit' ? COLORS.success : COLORS.error }}>{fitnessStatus === 'fit' ? 'FIT TO RESUME DUTIES' : 'UNFIT FOR DUTY'}</Text>.
              </Text>

              <View style={styles.certFooter}>
                <Text style={styles.doctorName}>Dr. {doctorName}</Text>
                {regNumber ? <Text style={styles.doctorReg}>Reg. No: {regNumber}</Text> : null}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
              <Ionicons name="print" size={18} color={COLORS.white} />
              <Text style={styles.printText}>Print / Issue Certificate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: SPACING.xl,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  readOnly: {
    backgroundColor: COLORS.surfaceSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
  },
  statusBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statusBtnTextActive: {
    color: COLORS.white,
  },
  certificatePaper: {
    marginTop: 16,
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FAF9F6',
  },
  certHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  clinicHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  certBody: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  certFooter: {
    marginTop: 16,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  doctorName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  doctorReg: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  printBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});
