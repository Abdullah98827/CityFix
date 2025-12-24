import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
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
import AssignmentDetails from '../../../components/AssignmentDetails';
import CustomButton from '../../../components/CustomButton';
import CustomInput from '../../../components/CustomInput';
import MediaGallery from '../../../components/MediaGallery';
import { MediaPicker } from '../../../components/MediaPicker';
import MergedReportsSection from '../../../components/MergedReportsSection';
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';
import StatusTracker from '../../../components/StatusTracker';
import { syncStatusToMergedReports } from '../../../utils/statusSyncHelper';

export default function EngineerJobDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [afterMedia, setAfterMedia] = useState([]);
  const [newStatus, setNewStatus] = useState('in progress');

  // Fetch job details when screen loads
  useEffect(() => {
    const fetchJob = async () => {
      const jobDoc = await getDoc(doc(db, 'reports', id));

      if (jobDoc.exists()) {
        const jobData = { id: jobDoc.id, ...jobDoc.data() };
        setJob(jobData);

        if (jobData.resolutionNotes) setResolutionNotes(jobData.resolutionNotes);

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
      } else {
        Alert.alert('Error', 'Job not found');
      }

      setLoading(false);
    };

    fetchJob();
  }, [id]);

  // Pick from gallery for after evidence
  const handleAfterGalleryPick = async () => {
    const videoCount = afterMedia.filter(m => m.type === 'video').length;
    if (videoCount >= 1) {
      Alert.alert('Video Limit', 'You can only upload 1 video. Remove the existing video first.');
      return;
    }

    await MediaPicker.pickFromGallery(
      (newMedia) => {
        const newVideoCount = newMedia.filter(m => m.type === 'video').length;
        if (videoCount + newVideoCount > 1) {
          Alert.alert('Video Limit', 'You can only upload 1 video maximum.');
          return;
        }
        setAfterMedia([...afterMedia, ...newMedia]);
      },
      afterMedia,
      5
    );
  };

  // Pick from camera for after evidence
  const handleAfterCameraPick = async () => {
    const videoCount = afterMedia.filter(m => m.type === 'video').length;
    if (videoCount >= 1) {
      Alert.alert('Video Limit', 'You can only upload 1 video. Remove the existing video first.');
      return;
    }

    await MediaPicker.pickFromCamera(
      (newMedia) => {
        const newVideoCount = newMedia.filter(m => m.type === 'video').length;
        if (videoCount + newVideoCount > 1) {
          Alert.alert('Video Limit', 'You can only upload 1 video maximum.');
          return;
        }
        setAfterMedia([...afterMedia, ...newMedia]);
      },
      afterMedia,
      5
    );
  };

  // Remove media from after evidence
  const handleRemoveAfterMedia = (index) => {
    setAfterMedia(afterMedia.filter((_, i) => i !== index));
  };

  // Start the job (change status to 'in progress')
  const handleStartJob = async () => {
    setSubmitting(true);

    await updateDoc(doc(db, 'reports', id), {
      status: 'in progress',
      startedAt: new Date(),
    });

    setJob({ ...job, status: 'in progress' });
    setSubmitting(false);
    Alert.alert('Success', 'Job started successfully!');
  };

  // Handle saving progress or marking as resolved
  const handleResolve = async () => {
    // Validation for resolved status
    if (newStatus === 'resolved') {
      if (!resolutionNotes.trim()) {
        Alert.alert('Missing Information', 'Please add resolution notes');
        return;
      }
      if (afterMedia.length === 0) {
        Alert.alert('Missing Evidence', 'Please add after media (photos or videos)');
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
            setUploadProgress('Preparing upload...');

            const totalItems = afterMedia.length;
            let currentItem = 0;
            const uploadedAfterPhotoUrls = [];
            const uploadedAfterVideoUrls = [];

            // Upload each media item
            for (let i = 0; i < afterMedia.length; i++) {
              const item = afterMedia[i];
              if (item.type !== 'photo' && item.type !== 'video') continue;

              currentItem++;
              setUploadProgress(`Uploading ${currentItem}/${totalItems} (0%)...`);

              const isVideo = item.type === 'video';
              const uri = item.uri;
              const fileName = isVideo
                ? `after_video_${Date.now()}_${i}.mp4`
                : `after_photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
              const folder = isVideo ? 'videos' : 'images';
              const storageRef = ref(storage, `${folder}/${auth.currentUser.uid}/${fileName}`);

              const response = await fetch(uri);
              const blob = await response.blob();

              // Check video size (max 15MB)
              if (isVideo) {
                const sizeInMB = (blob.size / 1024 / 1024).toFixed(2);
                if (blob.size > 15 * 1024 * 1024) {
                  setSubmitting(false);
                  setUploadProgress('');
                  Alert.alert('Video Too Large', `Video is ${sizeInMB}MB. Maximum 15MB (10-15 seconds).`);
                  return;
                }
              }

              const metadata = isVideo
                ? { contentType: 'video/mp4' }
                : { contentType: 'image/jpeg' };

              const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

              // Wait for upload to complete
              const snapshot = await new Promise((resolve, reject) => {
                uploadTask.on(
                  'state_changed',
                  (snap) => {
                    const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                    setUploadProgress(`Uploading ${currentItem}/${totalItems} (${progress}%)...`);
                  },
                  reject,
                  () => resolve(uploadTask.snapshot)
                );
              });

              const url = await getDownloadURL(snapshot.ref);

              if (isVideo) {
                uploadedAfterVideoUrls.push(url);
              } else {
                uploadedAfterPhotoUrls.push(url);
              }
            }

            setUploadProgress('Saving...');

            const updateData = {
              status: newStatus,
              resolutionNotes: resolutionNotes.trim(),
              afterPhotos: uploadedAfterPhotoUrls,
              afterVideos: uploadedAfterVideoUrls,
              resolvedAt: newStatus === 'resolved' ? new Date() : null,
            };

            await updateDoc(doc(db, 'reports', id), updateData);

            // Sync to merged reports if any
            if (job.duplicateCount > 0) {
              await syncStatusToMergedReports(id, updateData);
            }

            setSubmitting(false);
            setUploadProgress('');

            Alert.alert(
              'Success',
              newStatus === 'resolved' ? 'Job marked as resolved!' : 'Progress saved!',
              [{ text: 'OK', onPress: () => router.back() }]
            );
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

  const beforePhotos = job.photoUrls || job.photos || [];
  const beforeVideos = job.videoUrls || [];
  const afterPhotos = afterMedia.filter(m => m.type === 'photo').map(m => m.uri);
  const afterVideos = afterMedia.filter(m => m.type === 'video').map(m => m.uri);

  return (
    <View style={styles.wrapper}>
      <ReportHeader title="Job Details" />
      <StatusTracker status={job.status} />
      <ScrollView style={styles.container}>
        <Text style={styles.sectionTitle}>Before Evidence</Text>
        <MediaGallery
          photos={beforePhotos}
          videos={beforeVideos}
        />
        <ReportInfoSection report={job} />
        <MergedReportsSection masterReport={job} role="engineer" />
        <AssignmentDetails report={job} />

        {/* Reopened state */}
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
                    <MediaGallery
                      photos={job.afterPhotos || []}
                      videos={job.afterVideos || (job.afterVideo ? [job.afterVideo] : [])}
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

        {/* In progress state */}
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
            <Text style={styles.helperText}>Max 1 video + 4 photos (5 items total)</Text>
            <View style={styles.photoButtons}>
              <CustomButton title="Gallery" onPress={handleAfterGalleryPick} variant="secondary" disabled={submitting} />
              <CustomButton title="Camera" onPress={handleAfterCameraPick} variant="secondary" disabled={submitting} />
            </View>
            {afterMedia.length > 0 && (
              <>
                <Text style={styles.afterMediaTitle}>Tap to view fullscreen ({afterMedia.length}/5)</Text>
                <MediaGallery
                  photos={afterPhotos}
                  videos={afterVideos}
                  showRemove={true}
                  onRemove={handleRemoveAfterMedia}
                />
              </>
            )}
            {submitting ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.uploadingText}>{uploadProgress}</Text>
              </View>
            ) : (
              <CustomButton
                title={newStatus === 'resolved' ? 'Mark Resolved' : 'Save Progress'}
                onPress={handleResolve}
                variant="secondary"
              />
            )}
          </View>
        )}

        {/* Assigned state – just start job button */}
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

        {/* Resolved or verified state – show details */}
        {(job.status === 'resolved' || job.status === 'verified') && (
          <View style={styles.resolvedSection}>
            <Text style={styles.sectionTitle}>Resolution Details</Text>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Resolution Notes:</Text>
              <Text style={styles.notesText}>{job.resolutionNotes}</Text>
              <View style={{ marginTop: 16 }}>
                <MediaGallery
                  photos={job.afterPhotos || []}
                  videos={job.afterVideos || (job.afterVideo ? [job.afterVideo] : [])}
                />
              </View>
              {job.status === 'verified' && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>VERIFIED BY QA</Text>
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
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12, paddingHorizontal: 24, marginTop: 16 },
  infoBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12 },
  label: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  notesText: { fontSize: 15, color: '#475569', marginTop: 8, lineHeight: 22 },
  startJobContainer: { marginBottom: 24, paddingHorizontal: 24 },
  instructionText: { fontSize: 15, color: '#64748b', marginBottom: 16, textAlign: 'center' },
  inputLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 12 },
  helperText: { fontSize: 13, color: '#f59e0b', marginBottom: 12, fontWeight: '600' },
  statusButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  afterMediaTitle: { fontSize: 13, fontWeight: '600', color: '#64748b', marginTop: 8, marginBottom: 12, fontStyle: 'italic', textAlign: 'center' },
  uploadingContainer: { alignItems: 'center', marginVertical: 20 },
  uploadingText: { marginTop: 12, fontSize: 15, color: '#4F46E5', fontWeight: '600' },
  verifiedBadge: { marginTop: 20, padding: 16, backgroundColor: '#d1fae5', borderRadius: 12, alignItems: 'center' },
  verifiedText: { fontSize: 18, fontWeight: '800', color: '#065f46', marginBottom: 8 },
  qaFeedbackSuccess: { fontSize: 15, color: '#047857', textAlign: 'center' },
  error: { fontSize: 18, color: '#dc2626' },
});