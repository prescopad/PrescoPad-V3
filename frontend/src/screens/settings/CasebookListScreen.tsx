import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ParamListBase } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { Patient } from '../../types/patient.types';
import { getPatients } from '../../services/dataService';
import { downloadCasebookPdf } from '../../services/casebookService';
import { exportPDFCopy, shareViaPDF } from '../../services/shareService';
import { useToast } from '../../components/Toast/ToastContext';
import { HEADER_PADDING_TOP } from '../../utils/responsive';

import CasebookViewerModal from '../../components/CasebookViewerModal';

interface CasebookListScreenProps {
  navigation: NativeStackNavigationProp<ParamListBase>;
}

export default function CasebookListScreen({ navigation }: CasebookListScreenProps): React.JSX.Element {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadPatients();
    }, [])
  );

  const loadPatients = async () => {
    setLoading(true);
    try {
      const result = await getPatients();
      setPatients(result);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = searchQuery.trim()
    ? patients.filter((p) => p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : patients;

  const renderPatient = ({ item }: { item: Patient }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedPatient(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.patientName}>{item.name}</Text>
          <View style={styles.openPill}>
            <Ionicons name="book-outline" size={14} color={COLORS.primary} />
            <Text style={styles.openPillText}>Open</Text>
          </View>
        </View>

        <Text style={styles.previewText} numberOfLines={2}>
          {item.caseSummary || 'Tap to open full casebook history and summary'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Casebook</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search patients..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          renderItem={renderPatient}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No patients found</Text>
            </View>
          }
        />
      )}

      <CasebookViewerModal
        visible={!!selectedPatient}
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: HEADER_PADDING_TOP,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: SPACING.md,
  },
  headerSpacer: {
    width: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primarySurface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  openPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  previewText: {
    marginTop: SPACING.xs,
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.xl * 2,
  },
  emptyText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textLight,
  },
});
