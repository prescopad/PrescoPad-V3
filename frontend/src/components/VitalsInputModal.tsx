import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { Vitals } from '../types/prescription.types';

interface VitalsInputModalProps {
  visible: boolean;
  initialVitals?: Vitals;
  onSave: (vitals: Vitals) => void;
  onClose: () => void;
}

export default function VitalsInputModal({
  visible,
  initialVitals,
  onSave,
  onClose,
}: VitalsInputModalProps): React.JSX.Element {
  const [bp, setBp] = useState(initialVitals?.bp || '');
  const [pulse, setPulse] = useState(initialVitals?.pulse || '');
  const [temp, setTemp] = useState(initialVitals?.temp || '');
  const [spo2, setSpo2] = useState(initialVitals?.spo2 || '');
  const [weight, setWeight] = useState(initialVitals?.weight || '');
  const [height, setHeight] = useState(initialVitals?.height || '');
  const [bloodSugar, setBloodSugar] = useState(initialVitals?.bloodSugar || '');

  // Calculate BMI on the fly
  const calculateBmi = (): string => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // cm to meters
    if (w > 0 && h > 0) {
      return (w / (h * h)).toFixed(1);
    }
    return initialVitals?.bmi || '';
  };

  const handleSave = () => {
    const calculatedBmi = calculateBmi();
    onSave({
      bp,
      pulse,
      temp,
      spo2,
      weight,
      height,
      bmi: calculatedBmi,
      bloodSugar,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="pulse" size={22} color={COLORS.primary} />
              <Text style={styles.title}>Patient Vitals</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.grid}>
              <View style={styles.field}>
                <Text style={styles.label}>Blood Pressure (mmHg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="120/80"
                  value={bp}
                  onChangeText={setBp}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Pulse Rate (bpm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="72"
                  value={pulse}
                  onChangeText={setPulse}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Temperature (°F)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="98.6"
                  value={temp}
                  onChangeText={setTemp}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>SpO2 (%)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="98"
                  value={spo2}
                  onChangeText={setSpo2}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="65"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="170"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Blood Sugar (mg/dL)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="110"
                  value={bloodSugar}
                  onChangeText={setBloodSugar}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>BMI (Auto-calculated)</Text>
                <View style={[styles.input, styles.readOnlyInput]}>
                  <Text style={styles.bmiText}>{calculateBmi() || '--'}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save Vitals</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '85%',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  field: {
    width: '47%',
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
  readOnlyInput: {
    backgroundColor: COLORS.surfaceSecondary,
    justifyContent: 'center',
  },
  bmiText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});
