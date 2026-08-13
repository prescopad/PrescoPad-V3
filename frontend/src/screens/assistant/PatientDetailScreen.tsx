import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { APP_CONFIG } from '../../constants/config';
import { usePatientStore } from '../../store/usePatientStore';
import { useQueueStore } from '../../store/useQueueStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Patient } from '../../types/patient.types';
import { Prescription, Vitals } from '../../types/prescription.types';
import { getPrescriptionsByPatient, updatePatientVitals } from '../../services/dataService';
import type { AssistantStackParamList } from '../../types/navigation.types';
import { ConsultTypeModal } from '../../components/ConsultTypeModal';
import { useToast } from '../../components/Toast/ToastContext';
import MedicalCertificateModal from '../../components/MedicalCertificateModal';
import ReceiptModal from '../../components/ReceiptModal';
import CollectFeeModal from '../../components/CollectFeeModal';
import VitalsInputModal from '../../components/VitalsInputModal';

type NavigationProp = NativeStackNavigationProp<AssistantStackParamList>;
type DetailRouteProp = RouteProp<AssistantStackParamList, 'PatientDetail'>;

export default function PatientDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { patientId } = route.params;

  const getPatientById = usePatientStore((s) => s.getPatientById);
  const addToQueue = useQueueStore((s) => s.addToQueue);
  const user = useAuthStore((s) => s.user);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [isLoadingRx, setIsLoadingRx] = useState(true);
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [certRx, setCertRx] = useState<Prescription | null>(null);
  const [receiptRx, setReceiptRx] = useState<Prescription | null>(null);
  const [collectFeeRx, setCollectFeeRx] = useState<Prescription | null>(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [isSavingVitals, setIsSavingVitals] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadPatient();
      loadPrescriptions();
    }, [patientId]),
  );

  const loadPatient = async () => {
    setIsLoadingPatient(true);
    try {
      const data = await getPatientById(patientId);
      setPatient(data);
    } catch {
      toast.error('Failed to load patient information.');
    } finally {
      setIsLoadingPatient(false);
    }
  };

  const loadPrescriptions = async () => {
    setIsLoadingRx(true);
    try {
      const rxList = await getPrescriptionsByPatient(patientId);
      setPrescriptions(rxList);
    } catch {
      // Silently handle
    } finally {
      setIsLoadingRx(false);
    }
  };

  const processAddToQueue = async (type: 'new' | 'follow_up') => {
    if (!user || !patient) return;
    setShowConsultModal(false);
    setAddingToQueue(true);
    try {
      await addToQueue(patient.id, user.id, undefined, type);
      toast.success(`${patient.name} has been added to the queue.`);
      navigation.goBack();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to add to queue';
      toast.error(message);
    } finally {
      setAddingToQueue(false);
    }
  };

  const handleSaveVitals = async (vitals: Vitals) => {
    if (!patient) return;
    setIsSavingVitals(true);
    try {
      const updated = await updatePatientVitals(patient.id, vitals);
      setPatient(updated);
      toast.success('Vitals recorded successfully!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save vitals';
      toast.error(message);
    } finally {
      setIsSavingVitals(false);
    }
  };

  const handleEditPatient = () => {
    navigation.navigate('EditPatient', { patientId });
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoadingPatient) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />
        <Ionicons name="person-outline" size={56} color={COLORS.textLight} />
        <Text style={styles.notFoundText}>Patient not found</Text>
        <TouchableOpacity
          style={styles.goBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const vitals = patient.vitals as Vitals | null | undefined;
  const hasVitals = vitals && (vitals.bp || vitals.pulse || vitals.temp || vitals.spo2 || vitals.weight);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('patient.patientDetails')}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEditPatient}
        >
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>
                {patient.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.nameSection}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientSubtitle}>
                {patient.age} years / {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <InfoRow
              icon="call-outline"
              label={t('patient.phone')}
              value={patient.phone || '--'}
            />
            <InfoRow
              icon="location-outline"
              label={t('patient.address')}
              value={patient.address || '--'}
            />
            <InfoRow
              icon="water-outline"
              label={t('patient.bloodGroup')}
              value={patient.bloodGroup || '--'}
            />
            <InfoRow
              icon="fitness-outline"
              label={t('patient.weight')}
              value={patient.weight ? `${patient.weight} kg` : '--'}
            />
            <InfoRow
              icon="warning-outline"
              label={t('patient.allergies')}
              value={patient.allergies || t('common.none')}
              isLast
            />
          </View>
        </View>

        {/* Vitals Card */}
        {hasVitals && (
          <View style={styles.vitalsCard}>
            <View style={styles.vitalsCardHeader}>
              <Ionicons name="pulse-outline" size={18} color={COLORS.primary} />
              <Text style={styles.vitalsCardTitle}>Current Vitals</Text>
            </View>
            <View style={styles.vitalsGrid}>
              {vitals!.bp && <VitalChip label="Blood Pressure" value={`${vitals!.bp} mmHg`} />}
              {vitals!.pulse && <VitalChip label="Pulse" value={`${vitals!.pulse} bpm`} />}
              {vitals!.temp && <VitalChip label="Temperature" value={`${vitals!.temp} °F`} />}
              {vitals!.spo2 && <VitalChip label="SpO₂" value={`${vitals!.spo2}%`} />}
              {vitals!.weight && <VitalChip label="Weight" value={`${vitals!.weight} kg`} />}
              {vitals!.height && <VitalChip label="Height" value={`${vitals!.height} cm`} />}
              {vitals!.bmi && <VitalChip label="BMI" value={`${vitals!.bmi} kg/m²`} accent />}
              {vitals!.bloodSugar && <VitalChip label="Blood Sugar" value={`${vitals!.bloodSugar} mg/dL`} />}
            </View>
          </View>
        )}

        {/* Record Vitals Button */}
        <TouchableOpacity
          style={[styles.vitalsButton, isSavingVitals && styles.addQueueButtonDisabled]}
          onPress={() => setShowVitalsModal(true)}
          disabled={isSavingVitals}
          activeOpacity={0.85}
        >
          {isSavingVitals ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Ionicons name="pulse-outline" size={20} color={COLORS.primary} />
              <Text style={styles.vitalsButtonText}>
                {hasVitals ? 'Update Vitals' : '📊 Record Vitals'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Add to Queue Button */}
        <TouchableOpacity
          style={[styles.addQueueButton, addingToQueue && styles.addQueueButtonDisabled]}
          onPress={() => setShowConsultModal(true)}
          disabled={addingToQueue}
          activeOpacity={0.85}
        >
          {addingToQueue ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={22} color={COLORS.white} />
              <Text style={styles.addQueueButtonText}>{t('queue.addToQueue')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Previous Prescriptions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.sectionTitle}>Previous Prescriptions</Text>
            <Text style={styles.sectionCount}>({prescriptions.length})</Text>
          </View>

          {isLoadingRx ? (
            <View style={styles.rxLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : prescriptions.length === 0 ? (
            <View style={styles.emptyRxContainer}>
              <Ionicons
                name="document-outline"
                size={40}
                color={COLORS.textLight}
              />
              <Text style={styles.emptyRxText}>No prescriptions yet</Text>
              <Text style={styles.emptyRxHint}>Add the patient to the queue so the doctor can start a consultation</Text>
            </View>
          ) : (
            prescriptions.map((rx) => (
              <View key={rx.id} style={styles.rxCard}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('PrescriptionView', { prescriptionId: rx.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.rxCardHeader}>
                    <View style={styles.rxIdBadge}>
                      <Text style={styles.rxIdText} numberOfLines={1}>{rx.id}</Text>
                    </View>
                    <Text style={styles.rxDate}>{formatDate(rx.createdAt)}</Text>
                  </View>

                  {rx.diagnosis ? (
                    <View style={styles.rxDiagnosisRow}>
                      <Text style={styles.rxDiagnosisLabel}>Diagnosis:</Text>
                      <Text style={styles.rxDiagnosis} numberOfLines={2}>
                        {rx.diagnosis}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.rxStatsRow}>
                    {rx.medicines.length > 0 && (
                      <View style={styles.rxStat}>
                        <Ionicons name="medkit-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.rxStatText}>
                          {rx.medicines.length} medicine{rx.medicines.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                    {rx.labTests.length > 0 && (
                      <View style={styles.rxStat}>
                        <Ionicons name="flask-outline" size={14} color={COLORS.warning} />
                        <Text style={styles.rxStatText}>
                          {rx.labTests.length} test{rx.labTests.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                    {rx.followUpDate && (
                      <View style={styles.rxStat}>
                        <Ionicons name="calendar-outline" size={14} color={COLORS.success} />
                        <Text style={styles.rxStatText}>Follow-up: {formatDate(rx.followUpDate)}</Text>
                      </View>
                    )}
                  </View>

                  {rx.chargeAmount !== null && rx.chargeAmount !== undefined ? (
                    <View style={styles.rxChargeRow}>
                      <Ionicons name="cash-outline" size={14} color={COLORS.success} />
                      <Text style={styles.rxChargeText}>
                        Charge: {APP_CONFIG.billing.currencySymbol}{rx.chargeAmount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                {/* Action buttons */}
                <View style={styles.rxActionsRow}>
                  <TouchableOpacity
                    style={[styles.rxActionBtn, { borderColor: COLORS.success }]}
                    onPress={() => setCollectFeeRx(rx)}
                  >
                    <Ionicons name="cash-outline" size={13} color={COLORS.success} />
                    <Text style={[styles.rxActionText, { color: COLORS.success }]}>Collect Fee</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rxActionBtn}
                    onPress={() => setCertRx(rx)}
                  >
                    <Ionicons name="document-text-outline" size={13} color={COLORS.primary} />
                    <Text style={[styles.rxActionText, { color: COLORS.primary }]}>Certificate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rxActionBtn, { borderColor: '#d97706' }]}
                    onPress={() => setReceiptRx(rx)}
                  >
                    <Ionicons name="receipt-outline" size={13} color="#d97706" />
                    <Text style={[styles.rxActionText, { color: '#d97706' }]}>Receipt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <ConsultTypeModal
        visible={showConsultModal}
        patientName={patient?.name || ''}
        onClose={() => setShowConsultModal(false)}
        onSelectType={processAddToQueue}
        isLoading={addingToQueue}
      />

      {/* Vitals Modal */}
      <VitalsInputModal
        visible={showVitalsModal}
        initialVitals={vitals ?? undefined}
        onSave={handleSaveVitals}
        onClose={() => setShowVitalsModal(false)}
      />

      {/* Medical Certificate Modal */}
      {certRx && patient && (
        <MedicalCertificateModal
          visible={true}
          patientName={patient.name}
          patientAge={patient.age}
          patientGender={patient.gender}
          initialDiagnosis={certRx.diagnosis || ''}
          onClose={() => setCertRx(null)}
        />
      )}

      {/* Receipt Modal */}
      {receiptRx && patient && (
        <ReceiptModal
          visible={true}
          patientName={patient.name}
          initialAmount={receiptRx.chargeAmount || 500}
          onClose={() => setReceiptRx(null)}
        />
      )}

      {/* Collect Fee Modal */}
      {collectFeeRx && patient && (
        <CollectFeeModal
          visible={true}
          patientName={patient.name}
          prescriptionId={collectFeeRx.id}
          initialAmount={collectFeeRx.chargeAmount || 500}
          onClose={() => setCollectFeeRx(null)}
          onSuccess={() => {
            loadPrescriptions();
          }}
        />
      )}
    </SafeAreaView>
  );
}

/* ---- VitalChip Sub-component ---- */
interface VitalChipProps {
  label: string;
  value: string;
  accent?: boolean;
}

function VitalChip({ label, value, accent }: VitalChipProps): React.JSX.Element {
  return (
    <View style={[vitalStyles.chip, accent && vitalStyles.chipAccent]}>
      <Text style={vitalStyles.chipLabel}>{label}</Text>
      <Text style={[vitalStyles.chipValue, accent && vitalStyles.chipValueAccent]}>{value}</Text>
    </View>
  );
}

const vitalStyles = StyleSheet.create({
  chip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minWidth: 90,
    flex: 1,
  },
  chipAccent: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  chipValueAccent: {
    color: COLORS.primary,
  },
});

/* ---- Info Row Sub-component ---- */
interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}

function InfoRow({ icon, label, value, isLast }: InfoRowProps): React.JSX.Element {
  return (
    <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
      <View style={styles.infoRowIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={styles.infoRowContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
  goBackButton: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  goBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingTop: 52,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },

  /* Info Card */
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
    overflow: 'hidden',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.primarySurface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  avatarLargeText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  nameSection: {
    flex: 1,
  },
  patientName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  patientSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoGrid: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  infoRowContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 1,
  },

  /* Vitals Card */
  vitalsCard: {
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  vitalsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  vitalsCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },

  /* Vitals Button */
  vitalsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    paddingVertical: 13,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
  },
  vitalsButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },

  /* Add to Queue */
  addQueueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    marginTop: SPACING.md,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  addQueueButtonDisabled: {
    opacity: 0.6,
  },
  addQueueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  /* Prescriptions Section */
  sectionContainer: {
    marginTop: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  rxLoading: {
    paddingVertical: SPACING.xxxl,
    alignItems: 'center',
  },
  emptyRxContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
  },
  emptyRxText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontWeight: '600',
  },
  emptyRxHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    lineHeight: 18,
  },

  /* Prescription Card */
  rxCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  rxCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  rxIdBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  rxIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  rxDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  rxDiagnosisRow: {
    marginBottom: SPACING.sm,
  },
  rxDiagnosisLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rxDiagnosis: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  rxStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  rxStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  rxStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  rxChargeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  rxChargeText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  rxActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  rxActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  rxActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
