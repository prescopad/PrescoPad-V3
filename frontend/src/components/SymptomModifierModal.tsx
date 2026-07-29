import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
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

  const handleApply = useCallback(() => {
    const modifiers = [selectedSeverity, selectedDuration, selectedPattern].filter(Boolean);
    const result = modifiers.length > 0 ? `${symptomName} (${modifiers.join(', ')})` : symptomName;
    onConfirm(result);
    onClose();
    // Reset for next use
    setSelectedSeverity('Mild');
    setSelectedDuration('1 Day');
    setSelectedPattern('');
  }, [selectedSeverity, selectedDuration, selectedPattern, symptomName, onConfirm, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>⚡ Options for {symptomName}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Severity Section */}
            <Text style={styles.sectionTitle}>🔥 Severity</Text>
            <View style={styles.chipRow}>
              {SEVERITIES.map((s) => {
                const isSelected = selectedSeverity === s;
                return (
                  <Pressable
                    key={s}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedSeverity(s)}
                    android_ripple={{ color: COLORS.primaryLight, borderless: false }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {isSelected ? '✓ ' : ''}{s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Duration Section */}
            <Text style={styles.sectionTitle}>⏱️ Duration</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => {
                const isSelected = selectedDuration === d;
                return (
                  <Pressable
                    key={d}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedDuration(d)}
                    android_ripple={{ color: COLORS.primaryLight, borderless: false }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                      {isSelected ? '✓ ' : ''}{d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Pattern Section */}
            <Text style={styles.sectionTitle}>🌀 Pattern / Type (Optional)</Text>
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
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyText}>+ Add Symptom</Text>
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
    maxHeight: '80%',
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
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginTop: 14,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
