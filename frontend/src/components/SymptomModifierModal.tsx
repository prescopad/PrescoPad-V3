import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

interface SymptomModifierModalProps {
  visible: boolean;
  symptomName: string;
  onConfirm: (formattedSymptom: string) => void;
  onClose: () => void;
}

const DURATIONS = ['1 Day', '2 Days', '3 Days', '5 Days', '1 Week', '2 Weeks', '1 Month'] as const;
const PATTERNS = ['Intermittent', 'Continuous', 'Evening Rises', 'Sharp', 'Dull', 'Burning'] as const;

// Symptom-specific severity options (color-coded)
const SYMPTOM_SEVERITIES: Record<string, { label: string; color: string }[]> = {
  'Fever': [
    { label: 'Low Grade (99–100°F)', color: '#16a34a' },
    { label: 'Moderate (100–102°F)', color: '#d97706' },
    { label: 'High Grade (>102°F)', color: '#dc2626' },
  ],
  'Headache': [
    { label: 'Mild', color: '#16a34a' },
    { label: 'Moderate', color: '#d97706' },
    { label: 'Severe / Migraine', color: '#dc2626' },
  ],
  'Chest Pain': [
    { label: 'Mild Discomfort', color: '#16a34a' },
    { label: 'Moderate', color: '#d97706' },
    { label: 'Severe / Crushing', color: '#dc2626' },
  ],
  'Abdominal Pain': [
    { label: 'Mild', color: '#16a34a' },
    { label: 'Colicky', color: '#d97706' },
    { label: 'Severe', color: '#dc2626' },
  ],
  'Back Pain': [
    { label: 'Mild', color: '#16a34a' },
    { label: 'Moderate', color: '#d97706' },
    { label: 'Severe / Radiating', color: '#dc2626' },
  ],
  'Shortness of Breath': [
    { label: 'On Exertion', color: '#16a34a' },
    { label: 'At Rest', color: '#d97706' },
    { label: 'Acute / Distress', color: '#dc2626' },
  ],
};

const DEFAULT_SEVERITIES = [
  { label: 'Mild', color: '#16a34a' },
  { label: 'Moderate', color: '#d97706' },
  { label: 'Severe', color: '#dc2626' },
];

export default function SymptomModifierModal({
  visible,
  symptomName,
  onConfirm,
  onClose,
}: SymptomModifierModalProps): React.JSX.Element {
  const severities = SYMPTOM_SEVERITIES[symptomName] || DEFAULT_SEVERITIES;

  const [selectedSeverity, setSelectedSeverity] = useState(severities[0].label);
  const [selectedDuration, setSelectedDuration] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('');

  // Reset when symptom changes
  useEffect(() => {
    const sev = SYMPTOM_SEVERITIES[symptomName] || DEFAULT_SEVERITIES;
    setSelectedSeverity(sev[0].label);
    setSelectedDuration('');
    setCustomDuration('');
    setSelectedPattern('');
  }, [symptomName]);

  const effectiveDuration = customDuration.trim() ? customDuration.trim() : selectedDuration;

  const preview = [selectedSeverity, effectiveDuration, selectedPattern]
    .filter(Boolean)
    .join(', ');
  const formattedPreview = preview ? `${symptomName} (${preview})` : symptomName;

  const handleApply = useCallback(() => {
    onConfirm(formattedPreview);
    onClose();
  }, [formattedPreview, onConfirm, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>Symptom Details — {symptomName}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

            {/* Severity */}
            <Text style={styles.sectionTitle}>Severity</Text>
            <View style={styles.chipRow}>
              {severities.map((s) => {
                const isSelected = selectedSeverity === s.label;
                return (
                  <Pressable
                    key={s.label}
                    style={[
                      styles.chip,
                      isSelected && { backgroundColor: s.color, borderColor: s.color },
                    ]}
                    onPress={() => setSelectedSeverity(s.label)}
                    android_ripple={{ color: `${s.color}30`, borderless: false }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {isSelected ? '✓ ' : ''}{s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Duration chips */}
            <Text style={styles.sectionTitle}>Duration / Since</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => {
                const isSelected = selectedDuration === d && !customDuration.trim();
                return (
                  <Pressable
                    key={d}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => { setSelectedDuration(d); setCustomDuration(''); }}
                    android_ripple={{ color: COLORS.primaryLight, borderless: false }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {isSelected ? '✓ ' : ''}{d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {/* Custom duration text */}
            <TextInput
              style={styles.customInput}
              placeholder="Or type: Since 4 days, Since morning..."
              placeholderTextColor={COLORS.textLight}
              value={customDuration}
              onChangeText={(t) => { setCustomDuration(t); setSelectedDuration(''); }}
            />

            {/* Pattern */}
            <Text style={styles.sectionTitle}>Pattern / Type <Text style={styles.optional}>(Optional)</Text></Text>
            <View style={styles.chipRow}>
              {PATTERNS.map((p) => {
                const isSelected = selectedPattern === p;
                return (
                  <Pressable
                    key={p}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedPattern(isSelected ? '' : p)}
                    android_ripple={{ color: COLORS.primaryLight, borderless: false }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {isSelected ? '✓ ' : ''}{p}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Live Preview */}
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>PREVIEW</Text>
              <Text style={styles.previewText}>{formattedPreview}</Text>
            </View>

            <View style={{ height: 12 }} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>+ Add to Prescription</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  dialog: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '88%',
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
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginTop: 14,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  optional: {
    fontWeight: '500',
    textTransform: 'none',
    letterSpacing: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  customInput: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
    fontSize: 13,
    color: COLORS.text,
  },
  previewBox: {
    marginTop: 18,
    backgroundColor: COLORS.primarySurface,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
    padding: SPACING.md,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  applyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});
