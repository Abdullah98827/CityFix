import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { db } from '../../../backend/firebase';
import CustomButton from '../../../components/CustomButton';
import MediaGallery from '../../../components/MediaGallery';
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';
import StatusTracker from '../../../components/StatusTracker';
import { logAction } from '../../../utils/logger';

export default function AdminReportDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      const docSnap = await getDoc(doc(db, 'reports', id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isDeleted) {
          Alert.alert('Report Deleted', 'This report has been removed.');
          router.back();
          return;
        }
        setReport({
          id: docSnap.id,
          ...data,
          beforePhotos: data.photoUrls || data.photos || [],
          beforeVideos: data.videoUrls || (data.video ? [data.video] : (data.videos || [])),
          afterPhotos: data.afterPhotos || [],
          afterVideos: data.afterVideos || (data.afterVideo ? [data.afterVideo] : []),
        });
      } else {
        Alert.alert('Error', 'Report not found');
      }
      setLoading(false);
    };
    fetchReport();
  }, []);

  const handleDelete = () => {
    Alert.alert(
      'Delete Report',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await updateDoc(doc(db, 'reports', id), { isDeleted: true });

            // Log deletion
            logAction('report_deleted', id, 'Soft deleted by admin');

            Alert.alert('Success', 'Report deleted', [{ text: 'OK', onPress: () => router.back() }]);
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
    <View style={styles.container}>
      <ReportHeader title="Report Details" />
      <ScrollView style={styles.scroll}>
        <StatusTracker status={report.status} />
        {/* BEFORE Evidence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before Evidence (Citizen)</Text>
          <MediaGallery photos={report.beforePhotos} videos={report.beforeVideos} />
        </View>
        <ReportInfoSection report={report} />
        {/* AFTER Evidence (Engineer) */}
        {(report.afterPhotos.length > 0 || report.afterVideos.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>After Evidence (Engineer)</Text>
            <MediaGallery photos={report.afterPhotos} videos={report.afterVideos} />
          </View>
        )}
        {/* Resolution Notes */}
        {report.resolutionNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolution Notes (Engineer)</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{report.resolutionNotes}</Text>
            </View>
          </View>
        )}
        {/* QA Feedback */}
        {(report.qaFeedback || report.reopenReason) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QA Review</Text>
            {report.qaFeedback && (
              <View style={styles.notesBox}>
                <Text style={styles.label}>QA Feedback:</Text>
                <Text style={styles.notesText}>{report.qaFeedback}</Text>
              </View>
            )}
            {report.reopenReason && (
              <View style={styles.notesBox}>
                <Text style={styles.label}>Reopen Reason:</Text>
                <Text style={styles.notesText}>{report.reopenReason}</Text>
              </View>
            )}
          </View>
        )}
        {/* Delete Button */}
        <View style={styles.deleteSection}>
          <CustomButton title="Delete Report" onPress={handleDelete} variant="danger" />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  notesBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12 },
  label: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  notesText: { fontSize: 15, color: '#475569', marginTop: 8, lineHeight: 22 },
  deleteSection: { padding: 24 },
  error: { fontSize: 18, color: '#dc2626' },
});