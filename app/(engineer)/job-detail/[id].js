// app/(engineer)/job-detail/[id].js — FINAL WITH expo-video + STORAGE + REMOVE BUTTONS
import * as ImagePicker from 'expo-image-picker';
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
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';

export default function EngineerJobDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [resolutionNotes, setResolutionNotes] = useState('');
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [afterVideo, setAfterVideo] = useState(null);
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
          if (jobData.afterPhotos) setAfterPhotos(jobData.afterPhotos);
          if (jobData.afterVideo) setAfterVideo(jobData.afterVideo);
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

  const pickAfterPhoto = async () => {
    if (afterPhotos.length >= 5) {
      setMessage('Maximum 5 after photos');
      setIsError(true);
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAfterPhotos([...afterPhotos, result.assets[0].uri]);
      setAfterVideo(null);
    }
  };

  const takeAfterPhoto = async () => {
    if (afterPhotos.length >= 5) {
      setMessage('Maximum 5 after photos');
      setIsError(true);
      return;
    }

    let perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setMessage('Camera permission needed');
      setIsError(true);
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setAfterPhotos([...afterPhotos, result.assets[0].uri]);
      setAfterVideo(null);
    }
  };

  const pickAfterVideo = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 20,
      });

      if (!result.canceled) {
        const videoAsset = result.assets[0];
        if (videoAsset.duration && videoAsset.duration > 20000) {
          Alert.alert('Video Too Long', 'Please select a video under 20 seconds');
          return;
        }

        Alert.alert('Switch to Video?', 'This will remove after photos. Continue?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              setAfterPhotos([]);
              setAfterVideo(videoAsset.uri);
            },
          },
        ]);
      }
    } catch {
      setMessage('Failed to pick video');
      setIsError(true);
    }
  };

  const recordAfterVideo = async () => {
    try {
      let perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setMessage('Camera permission needed');
        setIsError(true);
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 20,
      });

      if (!result.canceled) {
        const videoAsset = result.assets[0];

        Alert.alert('Switch to Video?', 'This will remove after photos. Continue?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              setAfterPhotos([]);
              setAfterVideo(videoAsset.uri);
            },
          },
        ]);
      }
    } catch {
      setMessage('Failed to record video');
      setIsError(true);
    }
  };

  // Remove function for AfterMediaGallery
  const handleRemoveAfterMedia = (index) => {
    if (afterVideo && index === 0) {
      setAfterVideo(null);
    } else {
      setAfterPhotos(afterPhotos.filter((_, i) => i !== index));
    }
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

      if (afterPhotos.length === 0 && !afterVideo) {
        setMessage('Please add after photos or video');
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
              // Upload after photos
              const uploadedAfterPhotoUrls = [];
              for (let uri of afterPhotos) {
                const fileName = `after_photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                const storageRef = ref(storage, `images/${auth.currentUser.uid}/${fileName}`);
                const response = await fetch(uri);
                const blob = await response.blob();
                await uploadBytes(storageRef, blob);
                const url = await getDownloadURL(storageRef);
                uploadedAfterPhotoUrls.push(url);
              }

              // Upload after video
              let uploadedAfterVideoUrl = null;
              if (afterVideo) {
                const fileName = `after_video_${Date.now()}.mp4`;
                const storageRef = ref(storage, `videos/${auth.currentUser.uid}/${fileName}`);
                const response = await fetch(afterVideo);
                const blob = await response.blob();
                await uploadBytes(storageRef, blob);
                uploadedAfterVideoUrl = await getDownloadURL(storageRef);
              }

              const updateData = {
                status: newStatus,
                resolutionNotes: resolutionNotes.trim(),
                afterPhotos: uploadedAfterPhotoUrls,
                afterVideo: uploadedAfterVideoUrl,
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

  return (
    <View style={styles.wrapper}>
      <ReportHeader title="Job Details" />

      <ScrollView style={styles.container}>
        <MediaGallery photos={job.photos} video={job.video} />
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
                    <AfterMediaGallery photos={job.afterPhotos} video={job.afterVideo} title="" />
                  </View>
                </View>
              </View>
            )}

            {submitting ? (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : (
              <CustomButton
                title="Start Fixing"
                onPress={handleStartJob}
                variant="secondary"
              />
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
            <Text style={styles.helperText}>Add photos (1-5) OR one video (max 20 sec)</Text>

            <View style={styles.photoButtons}>
              <CustomButton title="Gallery" onPress={pickAfterPhoto} variant="secondary" />
              <CustomButton title="Camera" onPress={takeAfterPhoto} variant="secondary" />
            </View>

            {afterPhotos.length === 0 && !afterVideo && (
              <View style={styles.photoButtons}>
                <CustomButton title="Video Gallery" onPress={pickAfterVideo} variant="secondary" />
                <CustomButton title="Record Video" onPress={recordAfterVideo} variant="secondary" />
              </View>
            )}

            <AfterMediaGallery 
              photos={afterPhotos} 
              video={afterVideo} 
              showRemove={true}
              onRemove={handleRemoveAfterMedia}
              title={`${afterPhotos.length || (afterVideo ? 1 : 0)} / 5`} 
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
                <AfterMediaGallery photos={job.afterPhotos} video={job.afterVideo} title="After Evidence" />
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
  feedbackItem: { marginBottom: 16 },
  feedbackLabel: { fontSize: 15, fontWeight: '700', color: '#7f1d1d', marginBottom: 6 },
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
  statusButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  verifiedBadge: { marginTop: 20, padding: 16, backgroundColor: '#d1fae5', borderRadius: 12, alignItems: 'center' },
  verifiedText: { fontSize: 18, fontWeight: '800', color: '#065f46', marginBottom: 8 },
  qaFeedbackSuccess: { fontSize: 15, color: '#047857', textAlign: 'center' },
  error: { fontSize: 18, color: '#dc2626' },
});