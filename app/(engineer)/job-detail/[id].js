// app/(engineer)/job-detail/[id].js - Job Detail & Resolution Form
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../../backend/firebase';
import CustomButton from '../../../components/CustomButton';
import CustomInput from '../../../components/CustomInput';
import FormMessage from '../../../components/FormMessage';
import PhotoGallery from '../../../components/PhotosGallery';
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';

export default function EngineerJobDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Resolution form fields
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [afterPhotos, setAfterPhotos] = useState([]);
  const [newStatus, setNewStatus] = useState('in progress'); // 'in progress' or 'resolved'

  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Fetch job details
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const jobDoc = await getDoc(doc(db, 'reports', id));
        if (jobDoc.exists()) {
          const jobData = { id: jobDoc.id, ...jobDoc.data() };
          setJob(jobData);
          
          // Pre-fill form if already has resolution data
          if (jobData.resolutionNotes) {
            setResolutionNotes(jobData.resolutionNotes);
          }
          if (jobData.afterPhotos) {
            setAfterPhotos(jobData.afterPhotos);
          }
          if (jobData.status === 'in progress') {
            setNewStatus('in progress');
          }
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

  // Pick image from gallery
  const pickImage = async () => {
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
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
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
    }
  };

  // Remove photo
  const removePhoto = (index) => {
    setAfterPhotos(afterPhotos.filter((_, i) => i !== index));
  };

  // Start working on job (change status to "in progress")
  const handleStartJob = async () => {
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'reports', id), {
        status: 'in progress',
        startedAt: new Date(),
      });

      setJob({ ...job, status: 'in progress' });
      setMessage('Job status updated to In Progress');
      setIsError(false);
    } catch (error) {
      console.error('Error starting job:', error);
      setMessage('Failed to update status');
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit resolution
  const handleResolve = async () => {
    setMessage('');
    setIsError(false);

    // Validation
    if (newStatus === 'resolved') {
      if (!resolutionNotes.trim()) {
        setMessage('Please add resolution notes');
        setIsError(true);
        return;
      }

      if (afterPhotos.length === 0) {
        setMessage('Please add at least one after photo');
        setIsError(true);
        return;
      }
    }

    // Confirm resolution
    Alert.alert(
      'Confirm Resolution',
      newStatus === 'resolved'
        ? 'Mark this job as resolved? It will be sent to QA for verification.'
        : 'Save your progress? You can continue working on this later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'resolved' ? 'Mark Resolved' : 'Save Progress',
          onPress: async () => {
            setSubmitting(true);
            try {
              const updateData = {
                status: newStatus,
                resolutionNotes: resolutionNotes.trim(),
                afterPhotos,
                resolvedAt: newStatus === 'resolved' ? new Date() : null,
              };

              await updateDoc(doc(db, 'reports', id), updateData);

              setMessage(
                newStatus === 'resolved'
                  ? 'Job marked as resolved! Sent to QA for verification.'
                  : 'Progress saved successfully!'
              );
              setIsError(false);

              // Navigate back after 2 seconds
              setTimeout(() => {
                router.back();
              }, 2000);
            } catch (error) {
              console.error('Error updating job:', error);
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

  // Calculate deadline info
  const getDeadlineInfo = () => {
    if (!job.deadline) return null;
    
    const deadlineDate = new Date(job.deadline);
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let color = '#10B981'; // Green
    let text = `${diffDays} days left`;
    
    if (diffDays < 0) {
      color = '#EF4444'; // Red
      text = `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      color = '#F59E0B'; // Orange
      text = 'Due today!';
    } else if (diffDays <= 2) {
      color = '#F59E0B'; // Orange
      text = diffDays === 1 ? '1 day left' : `${diffDays} days left`;
    }
    
    return { color, text };
  };

  const deadlineInfo = getDeadlineInfo();

  return (
    <View style={styles.wrapper}>
      {/* Reusable Header */}
      <ReportHeader title="Job Details" />

      <ScrollView style={styles.container}>
        {/* Before Photos */}
        <PhotoGallery photos={job.photos} />

        {/* Job Info */}
        <ReportInfoSection report={job} />

        {/* Assignment Details */}
        <View style={styles.assignmentSection}>
          <Text style={styles.sectionTitle}>Assignment Details</Text>
          
          <View style={styles.infoBox}>
            {/* Priority */}
            <View style={styles.infoRow}>
              <Text style={styles.label}>Priority:</Text>
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor:
                      job.priority === 'urgent'
                        ? '#DC2626'
                        : job.priority === 'high'
                        ? '#F59E0B'
                        : job.priority === 'medium'
                        ? '#3B82F6'
                        : '#10B981',
                  },
                ]}
              >
                <Text style={styles.badgeText}>{job.priority?.toUpperCase()}</Text>
              </View>
            </View>

            {/* Deadline with Countdown */}
            {deadlineInfo && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Deadline:</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.value}>{job.deadline}</Text>
                  <View
                    style={[styles.deadlineBadge, { backgroundColor: deadlineInfo.color }]}
                  >
                    <Text style={styles.badgeText}>{deadlineInfo.text}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Dispatcher Notes */}
            {job.dispatcherNotes && (
              <View style={styles.notesBox}>
                <Text style={styles.label}>Dispatcher Notes:</Text>
                <Text style={styles.notesText}>{job.dispatcherNotes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Resolution Form (only if not resolved) */}
        {job.status !== 'resolved' && (
          <View style={styles.resolutionSection}>
            <Text style={styles.sectionTitle}>Resolution</Text>

            {/* Status Toggle */}
            {job.status === 'assigned' && (
              <View style={styles.startJobContainer}>
                <Text style={styles.instructionText}>
                  Start working on this job to update your progress
                </Text>
                {submitting ? (
                  <ActivityIndicator size="large" color="#4F46E5" />
                ) : (
                  <CustomButton
                    title="Start Job"
                    onPress={handleStartJob}
                    variant="secondary"
                  />
                )}
              </View>
            )}

            {job.status === 'in progress' && (
              <>
                {/* Status Selector */}
                <Text style={styles.inputLabel}>Job Status</Text>
                <View style={styles.statusButtons}>
                  <TouchableOpacity
                    style={[
                      styles.statusBtn,
                      newStatus === 'in progress' && styles.statusBtnSelected,
                    ]}
                    onPress={() => setNewStatus('in progress')}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        newStatus === 'in progress' && styles.statusBtnTextSelected,
                      ]}
                    >
                      In Progress
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.statusBtn,
                      newStatus === 'resolved' && styles.statusBtnSelected,
                    ]}
                    onPress={() => setNewStatus('resolved')}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        newStatus === 'resolved' && styles.statusBtnTextSelected,
                      ]}
                    >
                      Resolved
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Resolution Notes */}
                <CustomInput
                  label="Resolution Notes"
                  placeholder="Describe what you did to fix the issue..."
                  value={resolutionNotes}
                  onChangeText={setResolutionNotes}
                  multiline
                  numberOfLines={4}
                />

                {/* After Photos */}
                <Text style={styles.inputLabel}>After Photos (1-5 required)</Text>
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                    <Text style={styles.photoBtnText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                    <Text style={styles.photoBtnText}>Camera</Text>
                  </TouchableOpacity>
                </View>

                {afterPhotos.length > 0 && (
                  <View style={styles.photoGrid}>
                    {afterPhotos.map((uri, i) => (
                      <View key={i} style={styles.photoBox}>
                        <Image source={{ uri }} style={styles.photo} />
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => removePhoto(i)}
                        >
                          <Text style={styles.removeText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.photoCount}>
                  {afterPhotos.length} / 5 photos
                </Text>

                {/* Message */}
                <FormMessage message={message} isError={isError} />

                {/* Submit Button */}
                {submitting ? (
                  <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
                ) : (
                  <CustomButton
                    title={
                      newStatus === 'resolved' ? 'Mark as Resolved' : 'Save Progress'
                    }
                    onPress={handleResolve}
                    variant="secondary"
                  />
                )}
              </>
            )}
          </View>
        )}

        {/* If already resolved, show resolution details */}
        {job.status === 'resolved' && (
          <View style={styles.resolvedSection}>
            <Text style={styles.sectionTitle}>Resolution Details</Text>
            <View style={styles.infoBox}>
              <Text style={styles.label}>Resolution Notes:</Text>
              <Text style={styles.notesText}>{job.resolutionNotes}</Text>
              
              {job.afterPhotos && job.afterPhotos.length > 0 && (
                <View style={styles.afterPhotosSection}>
                  <Text style={styles.label}>After Photos:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {job.afterPhotos.map((uri, i) => (
                      <Image key={i} source={{ uri }} style={styles.afterPhotoThumb} />
                    ))}
                  </ScrollView>
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
  assignmentSection: { paddingHorizontal: 24, paddingBottom: 16 },
  resolutionSection: { paddingHorizontal: 24, paddingBottom: 24 },
  resolvedSection: { paddingHorizontal: 24, paddingBottom: 24 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  value: { fontSize: 15, color: '#334155', fontWeight: '500' },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deadlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  notesBox: { marginTop: 12 },
  notesText: {
    fontSize: 15,
    color: '#475569',
    marginTop: 8,
    lineHeight: 22,
  },
  startJobContainer: { marginBottom: 24 },
  instructionText: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  statusButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statusBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  statusBtnSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  statusBtnText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  statusBtnTextSelected: { color: '#fff' },
  photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  photoBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  photoBox: { width: '30%', aspectRatio: 1, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: 12 },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  photoCount: {
    textAlign: 'center',
    marginVertical: 10,
    color: '#666',
    fontSize: 14,
  },
  afterPhotosSection: { marginTop: 16 },
  afterPhotoThumb: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
  },
  error: { fontSize: 18, color: '#dc2626' },
});