import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

interface SymptomModifierModalProps {
  visible: boolean;
  symptomName: string;
  onConfirm: (formattedSymptom: string) => void;
  onClose: () => void;
}

const SEVERITIES = ['Mild', 'Moderate', 'High'] as const;
const DURATIONS = ['1 Day', '2 Days', '3 Days', '5 Days', '1 Week', '2 Weeks', '1 Month'] as const;
const PATTERNS = ['Intermittent', 'Continuous', 'Evening Rises', 'Sharp', 'Dull'] as const;

export default function SymptomModifierModal({
  visible,
  symptomName,
  onConfirm,
  onClose,
}: SymptomModifierModalProps): React.JSX.Element {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('Mild');
  const [selectedDuration, setSelectedDuration] = useState<string>('1 Day');
  const [selectedPattern, setSelectedPattern] = useState<string>('');

  const handleApply = () => {
    const modifiers = [selectedSeverity, selectedDuration, selectedPattern].filter(Boolean);
    const result = modifiers.length > 0 ? `${symptomName} (${modifiers.join(', ')})` : symptomName;
    onConfirm(result);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>Tap Options for {symptomName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {/* Severity Section */}
            <Text style={styles.sectionTitle}>Severity</Text>
            <View style={styles.chipRow}>
              {SEVERITIES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, selectedSeverity === s && styles.chipActive]}
                  onPress={() => setSelectedSeverity(s)}
                >
                  <Text style={[styles.chipText, selectedSeverity === s && styles.chipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration Section */}
            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, selectedDuration === d && styles.chipActive]}
                  onPress={() => setSelectedDuration(d)}
                >
                  <Text style={[styles.chipText, selectedDuration === d && styles.chipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Type / Pattern Section */}
            <Text style={styles.sectionTitle}>Pattern / Type (Optional)</Text>
            <View style={styles.chipRow}>
              {PATTERNS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, selectedPattern === p && styles.chipActive]}
                  onPress={() => setSelectedPattern(selectedPattern === p ? '' : p)}
                >
                  <Text style={[styles.chipText, selectedPattern === p && styles.chipTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>Add Symptom to Prescribing</Text>
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
    maxHeight: '75%',
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
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
  },
  footer: {
    padding: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  applyBtn: {
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
