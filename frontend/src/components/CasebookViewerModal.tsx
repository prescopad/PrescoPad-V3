import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { Patient } from '../types/patient.types';
import { Prescription } from '../types/prescription.types';
import { getPrescriptionsByPatient } from '../services/dataService';
import { downloadCasebookPdf } from '../services/casebookService';
import { exportPDFCopy, shareViaPDF } from '../services/shareService';
import { useToast } from './Toast/ToastContext';

interface CasebookViewerModalProps {
  visible: boolean;
  patient: Patient | null;
  onClose: () => void;
}

export default function CasebookViewerModal({
  visible,
  patient,
  onClose,
}: CasebookViewerModalProps): React.JSX.Element | null {
  const toast = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (visible && patient) {
      loadHistory();
    }
  }, [visible, patient]);

  const loadHistory = async () => {
    if (!patient) return;
    setLoading(true);
    try {
      const rxList = await getPrescriptionsByPatient(patient.id);
      setPrescriptions(rxList);
    } catch {
      toast.error('Failed to load visit history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!patient || isDownloading) return;
    setIsDownloading(true);
    try {
      const signedUrl = await downloadCasebookPdf(patient.id);
      const tempFilename = `casebook_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
      const localUri = `${FileSystem.cacheDirectory}${tempFilename}`;
      const result = await FileSystem.downloadAsync(signedUrl, localUri);
      if (result.status !== 200) {
        throw new Error('Failed to download casebook PDF.');
      }
      const safeName = (patient.name || 'Patient').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
      const exported = await exportPDFCopy(result.uri, `Casebook_${safeName}`);
      await shareViaPDF(exported);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to download casebook PDF.';
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!patient) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="journal-outline" size={22} color={COLORS.primary} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientSub}>
                  {patient.age} yrs | {patient.gender} | {patient.phone || 'No phone'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.downloadBtn, isDownloading && styles.btnDisabled]}
              onPress={handleDownloadPdf}
              disabled={isDownloading}
              activeOpacity={0.8}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={18} color={COLORS.white} />
                  <Text style={styles.downloadBtnText}>Download PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {/* Overview Card */}
            <View style={styles.overviewCard}>
              <Text style={styles.sectionHeaderTitle}>PATIENT OVERVIEW</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Blood Group</Text>
                  <Text style={styles.statVal}>{patient.bloodGroup || '—'}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Weight</Text>
                  <Text style={styles.statVal}>{patient.weight ? `${patient.weight} kg` : '—'}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Allergies</Text>
                  <Text style={[styles.statVal, patient.allergies ? { color: COLORS.error } : null]}>
                    {patient.allergies || 'None'}
                  </Text>
                </View>
              </View>

              {patient.caseSummary && (
                <View style={styles.aiSummaryBox}>
                  <Text style={styles.aiSummaryTitle}>AI Case Summary</Text>
                  <Text style={styles.aiSummaryText}>{patient.caseSummary}</Text>
                </View>
              )}
            </View>

            {/* Visit History Timeline */}
            <Text style={styles.timelineTitle}>Visit History ({prescriptions.length})</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading visits...</Text>
              </View>
            ) : prescriptions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={40} color={COLORS.textLight} />
                <Text style={styles.emptyText}>No visit history recorded yet</Text>
              </View>
            ) : (
              prescriptions.map((rx, idx) => (
                <View key={rx.id || idx} style={styles.rxCard}>
                  <View style={styles.rxHeader}>
                    <View>
                      <Text style={styles.rxDiagnosis}>{rx.diagnosis || 'Consultation'}</Text>
                      <Text style={styles.rxDate}>Date: {formatDate(rx.createdAt)}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: rx.status === 'finalized' ? COLORS.successLight : COLORS.warningLight },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: rx.status === 'finalized' ? COLORS.success : COLORS.warning },
                        ]}
                      >
                        {rx.status === 'finalized' ? 'Issued' : 'Draft'}
                      </Text>
                    </View>
                  </View>

                  {rx.symptoms && rx.symptoms.length > 0 && (
                    <Text style={styles.rxDetailText}>
                      <Text style={{ fontWeight: '700' }}>Symptoms: </Text>
                      {rx.symptoms.join(', ')}
                    </Text>
                  )}

                  {rx.medicines && rx.medicines.length > 0 && (
                    <View style={styles.medsSection}>
                      <Text style={styles.medsTitle}>Medicines ({rx.medicines.length}):</Text>
                      {rx.medicines.map((m: any, mIdx) => (
                        <View key={m.id || mIdx} style={styles.medItem}>
                          <Text style={styles.medBullet}>•</Text>
                          <Text style={styles.medName}>
                            {m.medicineName || m.medicine_name || m.name} ({m.type}) &mdash; {m.frequency} for {m.duration} ({m.timing})
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {rx.labTests && rx.labTests.length > 0 && (
                    <Text style={styles.rxDetailText}>
                      <Text style={{ fontWeight: '700' }}>Lab Tests: </Text>
                      {rx.labTests.map((t: any) => t.testName || t.test_name || t.name).join(', ')}
                    </Text>
                  )}

                  {rx.advice ? (
                    <View style={styles.adviceBox}>
                      <Text style={styles.adviceText}>Advice: {rx.advice}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '88%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  patientSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: SPACING.sm,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    justifyContent: 'flex-end',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  downloadBtnText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  overviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  statVal: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  aiSummaryBox: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primarySurface,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    padding: SPACING.sm,
    borderRadius: 4,
  },
  aiSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  aiSummaryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
  },
  emptyText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  rxCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  rxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  rxDiagnosis: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  rxDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rxDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  medsSection: {
    marginTop: SPACING.sm,
  },
  medsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
  },
  medBullet: {
    fontSize: 12,
    color: COLORS.primary,
    marginRight: 4,
  },
  medName: {
    fontSize: 12,
    color: COLORS.text,
    flex: 1,
  },
  adviceBox: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.warningLight,
    padding: SPACING.sm,
    borderRadius: 4,
  },
  adviceText: {
    fontSize: 11,
    color: COLORS.warning,
  },
});
