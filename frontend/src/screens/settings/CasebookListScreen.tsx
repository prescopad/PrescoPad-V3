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

interface CasebookListScreenProps {
  navigation: NativeStackNavigationProp<ParamListBase>;
}

export default function CasebookListScreen({ navigation }: CasebookListScreenProps): React.JSX.Element {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const toast = useToast();

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

  const handleDownloadPdf = async (patient: Patient) => {
    if (downloadingId) return;
    setDownloadingId(patient.id);
    try {
      const signedUrl = await downloadCasebookPdf(patient.id);

      // Download the remote PDF into a temp local file first (same approach
      // used elsewhere in the app for pulling a remote asset onto disk),
      // then reuse the existing export/share pattern.
      const tempFilename = `casebook_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
      const localUri = `${FileSystem.cacheDirectory}${tempFilename}`;
      const result = await FileSystem.downloadAsync(signedUrl, localUri);
      if (result.status !== 200) {
        throw new Error('Failed to download casebook PDF.');
      }

      const safeName = (patient.name || 'Patient').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
      const exported = await exportPDFCopy(result.uri, `Casebook_${safeName}`);
      await shareViaPDF(exported);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to download casebook PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const renderPatient = ({ item }: { item: Patient }) => {
    const isDownloading = downloadingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.patientName}>{item.name}</Text>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => handleDownloadPdf(item)}
            disabled={isDownloading}
            activeOpacity={0.7}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="download-outline" size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.previewText} numberOfLines={3}>
          {item.caseSummary || 'No case summary yet'}
        </Text>
      </View>
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
  downloadBtn: {
    padding: SPACING.xs,
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
