import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { auth, db, storage } from '../../../backend/firebase';
import AfterMediaGallery from '../../../components/AfterMediaGallery';
import AssignmentDetails from '../../../components/AssignmentDetails';
import CustomButton from '../../../components/CustomButton';
import CustomInput from '../../../components/CustomInput';
import FormMessage from '../../../components/FormMessage';
import MediaGallery from '../../../components/MediaGallery';
import { MediaPicker } from '../../../components/MediaPicker';
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';
import StatusTracker from '../../../components/StatusTracker';

export default function EngineerJobDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [afterMedia, setAfterMedia] = useState([]);
  const [newStatus, setNewStatus] = useState('in progress');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobDoc = await getDoc(doc(db, 'reports', id));
        if (jobDoc.exists()) {
          const jobData = { id: jobDoc.id, ...jobDoc.data() };
          setJob(jobData);
          if (jobData.resolutionNotes) setResolutionNotes(jobData.resolutionNotes);

          // Loads existing media
          const loadedMedia = [];
          if (jobData.afterPhotos && Array.isArray(jobData.afterPhotos)) {
            jobData.afterPhotos.forEach(uri => loadedMedia.push({ uri, type: 'photo' }));
          }
          if (jobData.afterVideos && Array.isArray(jobData.afterVideos)) {
            jobData.afterVideos.forEach(uri => loadedMedia.push({ uri, type: 'video' }));
          } else if (jobData.afterVideo) {
            loadedMedia.push({ uri: jobData.afterVideo, type: 'video' });
          }
          setAfterMedia(loadedMedia);

          if (jobData.status === 'in progress') setNewStatus('in progress');
        }
      } catch (error) {
        console.error('Error fetching job:', error);
        setMessage('Failed to load job');
        setIsError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleAfterGalleryPick = async () => {
    await MediaPicker.pickFromGallery(
      (newMedia) => setAfterMedia([...afterMedia, ...newMedia]),
      afterMedia,
      5
    );
  };

  const handleAfterCameraPick = async () => {
    await MediaPicker.pickFromCamera(
      (newMedia) => setAfterMedia([...afterMedia, ...newMedia]),
      afterMedia,
      5
    );
  };

  const handleRemoveAfterMedia = (index) => {
    setAfterMedia(afterMedia.filter((_, i) => i !== index));
  };

  const handleStartJob = async () => {
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'reports', id), {
        status: 'in progress',
        startedAt: new Date(),
      });
      setJob({ ...job, status: 'in progress' });
      setMessage('Job started');
      setIsError(false);
    } catch (error) {
      console.error('Error starting job:', error);
      setMessage('Failed to start job');
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async () => {
    setMessage('');
    setIsError(false);

    if (newStatus === 'resolved') {
      if (!resolutionNotes.trim()) {
        setMessage('Please add resolution notes');
        setIsError(true);
        return;
      }
      if (afterMedia.length === 0) {
        setMessage('Please add after media (photos or videos)');
        setIsError(true);
        return;
      }
    }

    Alert.alert(
      'Confirm',
      newStatus === 'resolved' ? 'Mark job as resolved?' : 'Save progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'resolved' ? 'Mark Resolved' : 'Save Progress',
          onPress: async () => {
            setSubmitting(true);
            try {
              const photoUris = afterMedia.filter(m => m.type === 'photo').map(m => m.uri);
              const videoUris = afterMedia.filter(m => m.type === 'video').map(m => m.uri);

              const uploadedAfterPhotoUrls = [];
              for (let uri of photoUris) {
                const fileName = `after_photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                const storageRef = ref(storage, `images/${auth.currentUser.uid}/${fileName}`);
                const response = await fetch(uri);
                const blob = await response.blob();
                await uploadBytes(storageRef, blob);
                const url = await getDownloadURL(storageRef);
                uploadedAfterPhotoUrls.push(url);
              }

              const uploadedAfterVideoUrls = [];
              for (let uri of videoUris) {
                const fileName = `after_video_${Date.now()}.mp4`;
                const storageRef = ref(storage, `videos/${auth.currentUser.uid}/${fileName}`);
                const response = await fetch(uri);
                const blob = await response.blob();
                await uploadBytes(storageRef, blob);
                const url = await getDownloadURL(storageRef);
                uploadedAfterVideoUrls.push(url);
              }

              const updateData = {
                status: newStatus,
                resolutionNotes: resolutionNotes.trim(),
                afterPhotos: uploadedAfterPhotoUrls,
                afterVideos: uploadedAfterVideoUrls,
                resolvedAt: newStatus === 'resolved' ? new Date() : null,
              };

              await updateDoc(doc(db, 'reports', id), updateData);

              setMessage(newStatus === 'resolved' ? 'Job marked resolved!' : 'Progress saved!');
              setIsError(false);
              setTimeout(() => router.back(), 2000);
            } catch (error) {
              console.error('Error:', error);
              setMessage('Failed to update job');
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

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Job not found</Text>
      </View>
    );
  }

  const photosForDisplay = afterMedia.filter(m => m.type === 'photo').map(m => m.uri);
  const videosForDisplay = afterMedia.filter(m => m.type === 'video').map(m => m.uri);

  return (
    <View style={styles.wrapper}>
      <ReportHeader title="Job Details" />

      <StatusTracker status={job.status} />

      <ScrollView style={styles.container}>
        <MediaGallery
          photos={job.photoUrls || job.photos || []}
          videos={job.videoUrls || []}
        />

        <ReportInfoSection report={job} />

        <AssignmentDetails report={job} />

        {job.status === 'reopened' && (
          <View style={styles.reopenedSection}>
            <Text style={styles.sectionTitle}>QA Feedback</Text>
            <View style={styles.reopenedBox}>
              <Text style={styles.reopenedLabel}>Report reopened by QA</Text>
              {job.reopenReason && <Text style={styles.reopenReasonText}>{job.reopenReason}</Text>}
              {job.qaFeedback && <Text style={styles.qaFeedbackText}>{job.qaFeedback}</Text>}
              <Text style={styles.reopenInstruction}>
                Please fix the issues and resubmit.
              </Text>
            </View>

            {job.resolutionNotes && (
              <View style={styles.previousWorkSection}>
                <Text style={styles.previousWorkTitle}>Previous Work</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.label}>Previous Notes:</Text>
                  <Text style={styles.notesText}>{job.resolutionNotes}</Text>
                  <View style={{ marginTop: 16 }}>
                    <AfterMediaGallery
                      photos={job.afterPhotos || []}
                      videos={job.afterVideos || (job.afterVideo ? [job.afterVideo] : [])}
                      title=""
                    />
                  </View>
                </View>
              </View>
            )}

            {submitting ? (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : (
              <CustomButton title="Start Fixing" onPress={handleStartJob} variant="secondary" />
            )}
          </View>
        )}

        {job.status === 'in progress' && (
          <View style={styles.resolutionSection}>
            <Text style={styles.sectionTitle}>Resolution</Text>

            <Text style={styles.inputLabel}>Job Status</Text>
            <View style={styles.statusButtons}>
              <CustomButton
                title="In Progress"
                onPress={() => setNewStatus('in progress')}
                variant={newStatus === 'in progress' ? 'secondary' : 'default'}
              />
              <CustomButton
                title="Resolved"
                onPress={() => setNewStatus('resolved')}
                variant={newStatus === 'resolved' ? 'secondary' : 'default'}
              />
            </View>

            <CustomInput
              label="Resolution Notes"
              placeholder="Describe what you did..."
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>After Evidence (Required)</Text>
            <Text style={styles.helperText}>Add any mix of photos & videos (5 items max)</Text>

            <View style={styles.photoButtons}>
              <CustomButton title="Gallery" onPress={handleAfterGalleryPick} variant="secondary" />
              <CustomButton title="Camera" onPress={handleAfterCameraPick} variant="secondary" />
            </View>

            <AfterMediaGallery
              photos={photosForDisplay}
              videos={videosForDisplay}
              showRemove={true}
              onRemove={handleRemoveAfterMedia}
              title={`${afterMedia.length} / 5`}
            />

            <FormMessage message={message} isError={isError} />

            {submitting ? (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : (
              <CustomButton
                title={newStatus === 'resolved' ? 'Mark Resolved' : 'Save Progress'}
                onPress={handleResolve}
                variant="secondary"
              />
            )}
          </View>
        )}

        {job.status === 'assigned' && (
          <View style={styles.startJobContainer}>
            <Text style={styles.instructionText}>
              Start working on this job
            </Text>
            {submitting ? (
              <ActivityIndicator size="large" color="#4F46E5" />
            ) : (
              <CustomButton title="Start Job" onPress={handleStartJob} variant="secondary" />
            )}
          </View>
        )}

        {(job.status === 'resolved' || job.status === 'verified') && (
          <View style={styles.resolvedSection}>
            <Text style={styles.sectionTitle}>Resolution Details</Text>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Resolution Notes:</Text>
              <Text style={styles.notesText}>{job.resolutionNotes}</Text>

              <View style={{ marginTop: 16 }}>
                <AfterMediaGallery
                  photos={job.afterPhotos || []}
                  videos={job.afterVideos || (job.afterVideo ? [job.afterVideo] : [])}
                  title="After Evidence"
                />
              </View>

              {job.status === 'verified' && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ VERIFIED BY QA</Text>
                  {job.qaFeedback && <Text style={styles.qaFeedbackSuccess}>{job.qaFeedback}</Text>}
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
  reopenedSection: { paddingHorizontal: 24, paddingBottom: 24, backgroundColor: '#fef2f2', paddingTop: 24 },
  reopenedBox: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#ef4444' },
  reopenedLabel: { fontSize: 18, fontWeight: '800', color: '#991b1b', marginBottom: 16, textAlign: 'center' },
  reopenReasonText: { fontSize: 15, color: '#991b1b', lineHeight: 22, fontWeight: '500' },
  qaFeedbackText: { fontSize: 15, color: '#dc2626', lineHeight: 22 },
  reopenInstruction: { fontSize: 14, color: '#7f1d1d', fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
  previousWorkSection: { marginTop: 20 },
  previousWorkTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 12 },
  resolutionSection: { paddingHorizontal: 24, paddingBottom: 24 },
  resolvedSection: { paddingHorizontal: 24, paddingBottom: 24 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  infoBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12 },
  label: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  notesText: { fontSize: 15, color: '#475569', marginTop: 8, lineHeight: 22 },
  startJobContainer: { marginBottom: 24, paddingHorizontal: 24 },
  instructionText: { fontSize: 15, color: '#64748b', marginBottom: 16, textAlign: 'center' },
  inputLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 12 },
  helperText: { fontSize: 13, color: '#666', marginBottom: 12, fontStyle: 'italic' },
  statusButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  verifiedBadge: { marginTop: 20, padding: 16, backgroundColor: '#d1fae5', borderRadius: 12, alignItems: 'center' },
  verifiedText: { fontSize: 18, fontWeight: '800', color: '#065f46', marginBottom: 8 },
  qaFeedbackSuccess: { fontSize: 15, color: '#047857', textAlign: 'center' },
  error: { fontSize: 18, color: '#dc2626' },
});