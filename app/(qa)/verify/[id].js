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
import AfterMediaGallery from '../../../components/AfterMediaGallery';
import AssignmentDetails from '../../../components/AssignmentDetails';
import CustomButton from '../../../components/CustomButton';
import CustomInput from '../../../components/CustomInput';
import FormMessage from '../../../components/FormMessage';
import MediaGallery from '../../../components/MediaGallery';
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';
import StatusTracker from '../../../components/StatusTracker';

export default function QAVerifyScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qaFeedback, setQaFeedback] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const reportDoc = await getDoc(doc(db, 'reports', id));
        if (reportDoc.exists()) {
          const data = reportDoc.data();
          setReport({
            id: reportDoc.id,
            ...data,
            photoUrls: data.photoUrls || data.photos || [],
            videoUrls: data.videoUrls || (data.video ? [data.video] : (data.videos || [])),
          });
        } else {
          setMessage('Report not found');
          setIsError(true);
        }
      } catch (error) {
        console.error('Error fetching report:', error);
        setMessage('Failed to load report');
        setIsError(true);
      } finally {
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
            try {
              await updateDoc(doc(db, 'reports', id), {
                status: 'verified',
                qaFeedback: qaFeedback.trim() || 'Approved',
                verifiedAt: new Date(),
              });
              setMessage('Report verified successfully!');
              setIsError(false);
              setTimeout(() => {
                router.back();
              }, 1500);
            } catch (error) {
              console.error('Error verifying report:', error);
              setMessage('Failed to verify report');
              setIsError(true);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleReopen = () => {
    if (!reopenReason.trim()) {
      setMessage('Please provide a reason for reopening');
      setIsError(true);
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
            try {
              await updateDoc(doc(db, 'reports', id), {
                status: 'reopened',
                reopenReason: reopenReason.trim(),
                qaFeedback: qaFeedback.trim(),
                reopenedAt: new Date(),
              });
              setMessage('Report reopened and sent back to engineer');
              setIsError(false);
              setTimeout(() => {
                router.back();
              }, 1500);
            } catch (error) {
              console.error('Error reopening report:', error);
              setMessage('Failed to reopen report');
              setIsError(true);
            } finally {
              setSubmitting(false);
            }
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
        <View style={styles.photoSection}>
          <View style={styles.photoSectionHeader}>
            <Text style={styles.photoSectionTitle}>BEFORE Evidence</Text>
            <Text style={styles.photoSectionSubtitle}>Original issue reported by citizen</Text>
          </View>
          <MediaGallery photos={report.photoUrls} videos={report.videoUrls} />
        </View>

        <ReportInfoSection report={report} />

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

        <View style={styles.photoSection}>
          <View style={styles.photoSectionHeader}>
            <Text style={styles.photoSectionTitle}>AFTER Evidence</Text>
            <Text style={styles.photoSectionSubtitle}>Media taken by engineer after fixing</Text>
          </View>
          {(report.afterPhotos && report.afterPhotos.length > 0) || (report.afterVideos && report.afterVideos.length > 0) ? (
            <View style={styles.galleryWrapper}>
              <AfterMediaGallery
                photos={report.afterPhotos || []}
                videos={report.afterVideos || []}
                title=""
              />
            </View>
          ) : (
            <View style={styles.noPhotos}>
              <Text style={styles.noPhotosText}>No after evidence provided</Text>
              <Text style={styles.noPhotosSubtext}>Engineer did not upload after media</Text>
            </View>
          )}
        </View>

        {report.status === 'resolved' && (
          <View style={styles.verificationSection}>
            <Text style={styles.sectionTitle}>Quality Verification</Text>
            <Text style={styles.instructionText}>
              Review the before and after evidence above. Verify if the issue has been resolved satisfactorily.
            </Text>
            <CustomInput
              label="QA Feedback (optional)"
              placeholder="Add any comments or observations..."
              value={qaFeedback}
              onChangeText={setQaFeedback}
              multiline
              numberOfLines={3}
            />
            <CustomInput
              label="Reason for Reopening (required if rejecting)"
              placeholder="Explain what needs to be fixed..."
              value={reopenReason}
              onChangeText={setReopenReason}
              multiline
              numberOfLines={3}
            />
            <FormMessage message={message} isError={isError} />
            {submitting ? (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.actionButtons}>
                <View style={styles.buttonWrapper}>
                  <CustomButton
                    title="Verify"
                    onPress={handleVerify}
                    variant="secondary"
                  />
                </View>
                <View style={styles.buttonWrapper}>
                  <CustomButton
                    title="Reopen"
                    onPress={handleReopen}
                    variant="danger"
                  />
                </View>
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
                {report.status === 'verified' ? '✓ VERIFIED' : '✗ REOPENED'}
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
  photoSection: { marginBottom: 24 },
  photoSectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
  },
  photoSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  photoSectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  galleryWrapper: {
    paddingHorizontal: 24,
  },
  noPhotos: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#fecaca',
    borderStyle: 'dashed',
  },
  noPhotosText: {
    fontSize: 18,
    color: '#991b1b',
    fontWeight: '600',
  },
  noPhotosSubtext: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 4,
  },
  resolutionSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  verificationSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#f8fafc',
    paddingTop: 24,
  },
  decisionSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  value: { fontSize: 15, color: '#334155', fontWeight: '500' },
  notesBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  notesText: {
    fontSize: 15,
    color: '#475569',
    marginTop: 8,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  buttonWrapper: {
    flex: 1,
  },
  decisionBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 3,
  },
  decisionStatus: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  feedbackBox: {
    marginTop: 12,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 15,
    color: '#065f46',
    marginTop: 8,
    lineHeight: 22,
  },
  reopenText: {
    fontSize: 15,
    color: '#991b1b',
    marginTop: 8,
    lineHeight: 22,
    fontWeight: '500',
  },
  decisionDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  error: {
    fontSize: 18,
    color: '#dc2626',
  },
});