import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
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
import AssignmentDetails from '../../../components/AssignmentDetails';
import CustomButton from '../../../components/CustomButton';
import CustomInput from '../../../components/CustomInput';
import MediaGallery from '../../../components/MediaGallery';
import MergedReportsSection from '../../../components/MergedReportsSection';
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';
import StatusTracker from '../../../components/StatusTracker';
import { logAction } from '../../../utils/logger';
import { syncStatusToMergedReports } from '../../../utils/statusSyncHelper';

export default function QAVerifyScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); 
  const [qaFeedback, setQaFeedback] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [reopenNotes, setReopenNotes] = useState('');
  const [reopenReasons, setReopenReasons] = useState([]);
  const [showReopenSection, setShowReopenSection] = useState(false);

  // Load reopen reasons from ConfigMD
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'ConfigMD', 'reopenReasons'), (doc) => {
      if (doc.exists() && doc.data().list) {
        setReopenReasons(doc.data().list);
      } else {
        setReopenReasons([
          'Incomplete Fix',
          'After Media Not Clear',
          'Wrong Location',
          'Poor Cleanup/Quality',
          'Issue Recurred',
          'Other (Explain Below)'
        ]);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      const reportDoc = await getDoc(doc(db, 'reports', id));
      if (reportDoc.exists()) {
        const data = reportDoc.data();
        if (data.isDeleted) {
          Alert.alert('Report Deleted', 'This report has been removed by an admin.');
          router.back();
          return;
        }
        setReport({
          id: reportDoc.id,
          ...data,
          photoUrls: data.photoUrls || data.photos || [],
          videoUrls: data.videoUrls || (data.video ? [data.video] : (data.videos || [])),
        });
        setLoading(false);
      } else {
        Alert.alert('Error', 'Report not found');
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const handleVerify = () => {
    Alert.alert(
      'Verify Report',
      'Confirm that this issue has been resolved satisfactorily?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            const updateData = {
              status: 'verified',
              qaFeedback: qaFeedback.trim() || 'Approved',
              verifiedAt: new Date(),
            };
            await updateDoc(doc(db, 'reports', id), updateData);
            if (report.duplicateCount > 0) {
              await syncStatusToMergedReports(id, updateData);
            }

            // Log verification
            logAction('report_verified', id, `Feedback: ${qaFeedback.trim() || 'Approved'}`);

            setSubmitting(false);
            Alert.alert('Success', 'Report verified successfully!', [
              { text: 'OK', onPress: () => router.back() }
            ]);
          },
        },
      ]
    );
  };

  const handleReopen = () => {
    if (!selectedReason) {
      Alert.alert('Missing Information', 'Please select a reason for reopening');
      return;
    }
    Alert.alert(
      'Reopen Report',
      'This will send the report back to the engineer. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            const updateData = {
              status: 'reopened',
              reopenReason: selectedReason,
              qaFeedback: qaFeedback.trim(),
              reopenNotes: reopenNotes.trim(),
              reopenedAt: new Date(),
            };
            await updateDoc(doc(db, 'reports', id), updateData);
            if (report.duplicateCount > 0) {
              await syncStatusToMergedReports(id, updateData);
            }

            // Log reopen
            logAction('report_reopened', id, `Reason: ${selectedReason}${reopenNotes.trim() ? ` - ${reopenNotes.trim()}` : ''}`);

            setSubmitting(false);
            Alert.alert('Success', 'Report reopened and sent back to engineer', [
              { text: 'OK', onPress: () => router.back() }
            ]);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Report not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ReportHeader title="Verify Report" />
      <StatusTracker status={report.status} />
      <ScrollView style={styles.container}>
        {/* Side-by-side Before / After */}
        <View style={styles.comparisonContainer}>
          {/* BEFORE Evidence */}
          <View style={styles.sideBox}>
            <View style={styles.sideHeader}>
              <Text style={styles.sideTitle}>BEFORE</Text>
              <Text style={styles.sideSubtitle}>Original issue reported by citizen</Text>
            </View>
            <MediaGallery photos={report.photoUrls} videos={report.videoUrls} />
          </View>
          {/* AFTER Evidence */}
          <View style={styles.sideBox}>
            <View style={styles.sideHeader}>
              <Text style={styles.sideTitle}>AFTER</Text>
              <Text style={styles.sideSubtitle}>Media taken by engineer after fixing</Text>
            </View>
            {(report.afterPhotos && report.afterPhotos.length > 0) || (report.afterVideos && report.afterVideos.length > 0) ? (
              <MediaGallery photos={report.afterPhotos || []} videos={report.afterVideos || []} />
            ) : (
              <View style={styles.noAfterMedia}>
                <Text style={styles.noMediaText}>No after evidence provided</Text>
                <Text style={styles.noMediaSubtext}>Consider reopening the report</Text>
              </View>
            )}
          </View>
        </View>
        <ReportInfoSection report={report} />
        <MergedReportsSection masterReport={report} role="qa" />
        <AssignmentDetails report={report} />
        <View style={styles.resolutionSection}>
          <Text style={styles.sectionTitle}>Engineer`s Resolution</Text>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Resolved on:</Text>
              <Text style={styles.value}>
                {report.resolvedAt?.toDate?.().toLocaleDateString('en-GB') || 'Recently'}
              </Text>
            </View>
            {report.resolutionNotes && (
              <View style={styles.notesBox}>
                <Text style={styles.label}>Resolution Notes:</Text>
                <Text style={styles.notesText}>{report.resolutionNotes}</Text>
              </View>
            )}
          </View>
        </View>
        {report.status === 'resolved' && (
          <View style={styles.verificationSection}>
            <Text style={styles.sectionTitle}>Quality Verification</Text>
            <Text style={styles.instructionText}>
              Review the before and after evidence above.
            </Text>
            <CustomInput
              label="QA Feedback (Optional)"
              placeholder="Add any comments or observations..."
              value={qaFeedback}
              onChangeText={setQaFeedback}
              multiline
              numberOfLines={3}
            />
            <View style={styles.actionButtons}>
              <View style={styles.buttonWrapper}>
                <CustomButton title="Verify" onPress={handleVerify} variant="secondary" />
              </View>
              <View style={styles.buttonWrapper}>
                <CustomButton
                  title={showReopenSection ? "Cancel Reopen" : "Reopen Report"}
                  onPress={() => setShowReopenSection(!showReopenSection)}
                  variant="danger"
                />
              </View>
            </View>
            {showReopenSection && (
              <View style={styles.reopenExpanded}>
                <Text style={styles.inputLabel}>Reopen Reason (required)</Text>
                <View style={styles.reasonsContainer}>
                  {reopenReasons.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.reasonButton,
                        selectedReason === reason && styles.reasonButtonSelected,
                      ]}
                      onPress={() => setSelectedReason(reason)}
                    >
                      <Text
                        style={[
                          styles.reasonText,
                          selectedReason === reason && styles.reasonTextSelected,
                        ]}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedReason === 'Other (Explain Below)' && (
                  <CustomInput
                    label="Explain Reason"
                    placeholder="Provide details..."
                    value={reopenNotes}
                    onChangeText={setReopenNotes}
                    multiline
                    numberOfLines={4}
                  />
                )}
                <CustomButton
                  title="Submit Reopen"
                  onPress={handleReopen}
                  variant="danger"
                  disabled={!selectedReason}
                />
              </View>
            )}
          </View>
        )}
        {(report.status === 'verified' || report.status === 'reopened') && (
          <View style={styles.decisionSection}>
            <Text style={styles.sectionTitle}>QA Decision</Text>
            <View
              style={[
                styles.decisionBox,
                {
                  backgroundColor: report.status === 'verified' ? '#d1fae5' : '#fee2e2',
                  borderColor: report.status === 'verified' ? '#10b981' : '#ef4444',
                },
              ]}
            >
              <Text
                style={[
                  styles.decisionStatus,
                  { color: report.status === 'verified' ? '#065f46' : '#991b1b' },
                ]}
              >
                {report.status === 'verified' ? 'VERIFIED' : 'REOPENED'}
              </Text>
              {report.qaFeedback && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.label}>QA Feedback:</Text>
                  <Text style={styles.feedbackText}>{report.qaFeedback}</Text>
                </View>
              )}
              {report.reopenReason && (
                <View style={styles.feedbackBox}>
                  <Text style={styles.label}>Reopen Reason:</Text>
                  <Text style={styles.reopenText}>{report.reopenReason}</Text>
                </View>
              )}
              <Text style={styles.decisionDate}>
                Decision made on:{' '}
                {(report.verifiedAt || report.reopenedAt)?.toDate?.().toLocaleDateString('en-GB')}
              </Text>
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
  comparisonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  sideBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sideHeader: {
    marginBottom: 12,
  },
  sideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },
  sideSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  noAfterMedia: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMediaText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  noMediaSubtext: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  resolutionSection: { paddingHorizontal: 24, paddingBottom: 16 },
  verificationSection: { paddingHorizontal: 24, paddingBottom: 24, backgroundColor: '#f8fafc', paddingTop: 24 },
  decisionSection: { paddingHorizontal: 24, paddingBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  instructionText: { fontSize: 15, color: '#64748b', marginBottom: 20, lineHeight: 22 },
  infoBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  value: { fontSize: 15, color: '#334155', fontWeight: '500' },
  notesBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  notesText: { fontSize: 15, color: '#475569', marginTop: 8, lineHeight: 22 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  buttonWrapper: { flex: 1 },
  decisionBox: { padding: 20, borderRadius: 16, borderWidth: 3 },
  decisionStatus: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  feedbackBox: { marginTop: 12, marginBottom: 12 },
  feedbackText: { fontSize: 15, color: '#065f46', marginTop: 8, lineHeight: 22 },
  reopenText: { fontSize: 15, color: '#991b1b', marginTop: 8, lineHeight: 22, fontWeight: '500' },
  decisionDate: { fontSize: 13, color: '#64748b', marginTop: 12, textAlign: 'center', fontStyle: 'italic' },
  error: { fontSize: 18, color: '#dc2626' },
  inputLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 12 },
  reopenExpanded: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  reasonsContainer: {
    marginBottom: 16,
  },
  reasonButton: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reasonButtonSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  reasonText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#fff',
  },
});