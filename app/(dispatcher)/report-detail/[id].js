import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../../backend/firebase';
import CustomButton from '../../../components/CustomButton';
import CustomInput from '../../../components/CustomInput';
import MediaGallery from '../../../components/MediaGallery';
import MergedReportsSection from '../../../components/MergedReportsSection';
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';
import StatusTracker from '../../../components/StatusTracker';
import { syncStatusToMergedReports } from '../../../utils/statusSyncHelper';

export default function DispatcherReportDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // State for report data and assignment form
  const [report, setReport] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch report and list of engineers when screen loads
  useEffect(() => {
    const fetchData = async () => {
      // Get the main report
      const reportDoc = await getDoc(doc(db, 'reports', id));
      if (reportDoc.exists()) {
        setReport({ id: reportDoc.id, ...reportDoc.data() });
      } else {
        Alert.alert('Error', 'Report not found');
      }

      // Get all engineers for assignment dropdown
      const engineersQuery = query(
        collection(db, 'UserMD'),
        where('role', '==', 'engineer')
      );
      const engineersSnapshot = await getDocs(engineersQuery);
      const engineersList = [];
      engineersSnapshot.forEach((doc) => {
        engineersList.push({ id: doc.id, ...doc.data() });
      });
      setEngineers(engineersList);

      setLoading(false);
    };

    fetchData();
  }, [id]);

  // Handle assigning the report to an engineer
  const handleAssign = async () => {
    // Basic validation
    if (!selectedEngineer) {
      Alert.alert('Missing Information', 'Please select an engineer');
      return;
    }
    if (!deadline) {
      Alert.alert('Missing Information', 'Please set a deadline');
      return;
    }

    const selectedEngineerData = engineers.find((e) => e.id === selectedEngineer);

    // Confirm with dispatcher
    Alert.alert(
      'Confirm Assignment',
      `Assign this report to ${selectedEngineerData?.name}?${
        report.duplicateCount > 0
          ? `\n\nThis will also assign ${report.duplicateCount} merged duplicate report(s).`
          : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setSubmitting(true);

            // Validate deadline is a future date
            const deadlineDate = new Date(deadline);
            if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
              Alert.alert('Invalid Deadline', 'Please enter a valid future date like YYYY-MM-DD');
              setSubmitting(false);
              return;
            }

            const updateData = {
              status: 'assigned',
              assignedTo: selectedEngineer,
              assignedToName: selectedEngineerData?.name,
              priority,
              deadline: deadlineDate,
              dispatcherNotes: notes,
              assignedAt: new Date(),
            };

            // Update the main report
            await updateDoc(doc(db, 'reports', id), updateData);

            // If there are merged duplicates, sync the status to them too
            if (report.duplicateCount > 0) {
              await syncStatusToMergedReports(id, updateData);
            }

            setSubmitting(false);
            Alert.alert(
              'Success',
              report.duplicateCount > 0
                ? `Report and ${report.duplicateCount} duplicate(s) assigned successfully!`
                : 'Report assigned successfully!',
              [{ text: 'OK', onPress: () => router.back() }]
            );
          },
        },
      ]
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // Report not found
  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Report not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ReportHeader title="Report Details" />
      {!report.isDraft && <StatusTracker status={report.status} />}
      <ScrollView style={styles.container}>
        <MediaGallery
          photos={report.photoUrls || report.photos || []}
          videos={report.videoUrls || []}
        />
        <ReportInfoSection report={report} />
        <MergedReportsSection masterReport={report} role="dispatcher" />

        {/* Assignment form – only shown when report is submitted */}
        {report.status === 'submitted' && (
          <View style={styles.workOrderSection}>
            <Text style={styles.sectionTitle}>Create Work Order</Text>
            <Text style={styles.inputLabel}>Assign to Engineer</Text>
            {engineers.length === 0 ? (
              <Text style={styles.noEngineers}>No engineers available</Text>
            ) : (
              <View style={styles.engineerList}>
                {engineers.map((engineer) => (
                  <TouchableOpacity
                    key={engineer.id}
                    style={[
                      styles.engineerCard,
                      selectedEngineer === engineer.id && styles.engineerCardSelected,
                    ]}
                    onPress={() => setSelectedEngineer(engineer.id)}
                  >
                    <View style={styles.engineerAvatar} />
                    <View style={styles.engineerInfo}>
                      <Text style={styles.engineerName}>{engineer.name}</Text>
                      <Text style={styles.engineerEmail}>{engineer.email}</Text>
                    </View>
                    {selectedEngineer === engineer.id && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityButtons}>
              {['low', 'medium', 'high', 'urgent'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, priority === p && styles.priorityBtnSelected]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[styles.priorityText, priority === p && styles.priorityTextSelected]}
                  >
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <CustomInput
              label="Deadline (e.g. 2025-12-31)"
              placeholder="YYYY-MM-DD"
              value={deadline}
              onChangeText={setDeadline}
            />

            <CustomInput
              label="Dispatcher Notes (optional)"
              placeholder="Add any instructions or notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />

            {submitting ? (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : (
              <CustomButton title="Assign to Engineer" onPress={handleAssign} variant="secondary" />
            )}
          </View>
        )}

        {/* Show assignment info if already assigned */}
        {report.status !== 'submitted' && (
          <View style={styles.assignedInfo}>
            <Text style={styles.sectionTitle}>Assignment Details</Text>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Assigned to:</Text>
                <Text style={styles.value}>{report.assignedToName || 'Unknown'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Priority:</Text>
                <Text style={styles.value}>{report.priority?.toUpperCase()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Deadline:</Text>
                <Text style={styles.value}>{report.deadline}</Text>
              </View>
              {report.dispatcherNotes && (
                <View style={styles.notesBox}>
                  <Text style={styles.label}>Notes:</Text>
                  <Text style={styles.notesText}>{report.dispatcherNotes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  workOrderSection: { paddingHorizontal: 24, paddingBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  inputLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 12 },
  engineerList: { marginBottom: 24 },
  engineerCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    borderWidth: 2, 
    borderColor: '#e2e8f0' 
  },
  engineerCardSelected: { borderColor: '#4F46E5', backgroundColor: '#f5f3ff' },
  engineerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e0e7ff', marginRight: 16 },
  engineerInfo: { flex: 1 },
  engineerName: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  engineerEmail: { fontSize: 14, color: '#64748b', marginTop: 2 },
  checkMark: { fontSize: 24, color: '#4F46E5', fontWeight: 'bold' },
  noEngineers: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  priorityButtons: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  priorityBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 12, 
    backgroundColor: '#f1f5f9', 
    alignItems: 'center', 
    borderWidth: 2, 
    borderColor: '#e2e8f0' 
  },
  priorityBtnSelected: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  priorityText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  priorityTextSelected: { color: '#fff' },
  assignedInfo: { paddingHorizontal: 24, paddingBottom: 24 },
  infoBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  value: { fontSize: 15, color: '#334155', fontWeight: '500' },
  notesBox: { marginTop: 12 },
  notesText: { fontSize: 15, color: '#475569', marginTop: 8, lineHeight: 22 },
  error: { fontSize: 18, color: '#dc2626' },
});