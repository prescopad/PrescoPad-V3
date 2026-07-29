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
import { numberToWords } from '../utils/numberToWords';

interface ReceiptModalProps {
  visible: boolean;
  patientName: string;
  initialAmount?: number;
  onClose: () => void;
}

export default function ReceiptModal({
  visible,
  patientName,
  initialAmount = 500,
  onClose,
}: ReceiptModalProps): React.JSX.Element {
  const clinic = useClinicStore((s) => s.clinic);
  const doctorProfile = useClinicStore((s) => s.doctorProfile);
  const user = useAuthStore((s) => s.user);

  const doctorName = doctorProfile?.name || user?.name || 'Doctor';

  const [receiptNo, setReceiptNo] = useState(`REC-${Date.now().toString().slice(-5)}`);
  const [amountStr, setAmountStr] = useState(initialAmount.toString());
  const [paymentMode, setPaymentMode] = useState<'cash' | 'cheque' | 'online'>('cash');
  const [txnRef, setTxnRef] = useState('');
  const [towards, setTowards] = useState('Consultation & Treatment Fee');
  const [dateStr] = useState(new Date().toISOString().split('T')[0]);

  const numAmount = parseFloat(amountStr) || 0;
  const wordsAmount = numberToWords(numAmount);

  const handlePrint = () => {
    Alert.alert('Receipt Ready', `Receipt #${receiptNo} generated successfully.`);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="receipt" size={22} color={COLORS.primary} />
              <Text style={styles.title}>Payment Receipt</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            {/* Form Section */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Receipt No.</Text>
                <TextInput style={styles.input} value={receiptNo} onChangeText={setReceiptNo} />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Date</Text>
                <TextInput style={[styles.input, styles.readOnly]} value={dateStr} editable={false} />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Received With Thanks From (Patient)</Text>
              <TextInput style={[styles.input, styles.readOnly]} value={patientName} editable={false} />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={amountStr}
                  onChangeText={setAmountStr}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Payment Mode</Text>
                <View style={styles.modeRow}>
                  {(['cash', 'online', 'cheque'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modeBtn, paymentMode === m && styles.modeBtnActive]}
                      onPress={() => setPaymentMode(m)}
                    >
                      <Text style={[styles.modeText, paymentMode === m && styles.modeTextActive]}>
                        {m.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {paymentMode !== 'cash' && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cheque / UPI / Ref Transaction No.</Text>
                <TextInput
                  style={styles.input}
                  value={txnRef}
                  onChangeText={setTxnRef}
                  placeholder="Txn ID / Cheque No"
                />
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Drawn On / Towards</Text>
              <TextInput style={styles.input} value={towards} onChangeText={setTowards} />
            </View>

            {/* Receipt Preview Box (Matching Photo Layout) */}
            <View style={styles.receiptPaper}>
              <Text style={styles.clinicTitle}>{clinic?.name || 'KRISHNAI CLINIC'}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>No. {receiptNo}</Text>
                <Text style={styles.metaText}>Date: {dateStr}</Text>
              </View>

              <Text style={styles.paperLine}>
                Received with thanks from Mr. / Mrs. <Text style={styles.boldText}>{patientName}</Text>
              </Text>

              <Text style={styles.paperLine}>
                the Sum of Rupees <Text style={styles.boldText}>{wordsAmount}</Text>
              </Text>

              <Text style={styles.paperLine}>
                Only by <Text style={styles.boldText}>{paymentMode.toUpperCase()}</Text> {txnRef ? `(Ref: ${txnRef})` : ''}
              </Text>

              <Text style={styles.paperLine}>
                Drawn on / Towards <Text style={styles.boldText}>{towards}</Text>
              </Text>

              <View style={styles.amountBox}>
                <Text style={styles.amountText}>₹ {numAmount.toFixed(2)}</Text>
              </View>

              <View style={styles.signatureArea}>
                <Text style={styles.sigLabel}>Payee's Signature</Text>
                <Text style={styles.doctorLabel}>For Dr. {doctorName}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
              <Ionicons name="print" size={18} color={COLORS.white} />
              <Text style={styles.printText}>Print / Share Receipt</Text>
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
  modeRow: {
    flexDirection: 'row',
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceSecondary,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modeTextActive: {
    color: COLORS.white,
  },
  receiptPaper: {
    marginTop: 16,
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: '#FAFCFF',
  },
  clinicTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  paperLine: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 6,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.text,
  },
  amountBox: {
    marginTop: 12,
    padding: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primarySurface,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  signatureArea: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  sigLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  doctorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
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
