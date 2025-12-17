// app/(citizen)/report-detail/[id].js - WITH VIDEO SUPPORT
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../../backend/firebase';
import AfterMediaGallery from '../../../components/AfterMediaGallery';
import MediaGallery from '../../../components/MediaGallery';
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';

export default function CitizenReportDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      const docSnap = await getDoc(doc(db, 'reports', id));
      if (docSnap.exists()) {
        setReport({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };
    fetchReport();
  }, [id]);

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
      <ReportHeader title="Report Details" />

      <ScrollView style={styles.container}>
        {/* Draft Banner */}
        {report.isDraft && (
          <View style={styles.draftBanner}>
            <View style={styles.draftInfo}>
              <Text style={styles.draftText}>DRAFT</Text>
              <Text style={styles.draftSubtext}>This report hasn`t been submitted yet</Text>
            </View>
            <TouchableOpacity
              style={styles.editDraftBtn}
              onPress={() => router.push(`/(citizen)/report?draftId=${report.id}`)}
            >
              <Text style={styles.editDraftBtnText}>Edit Draft</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BEFORE Media (Photos OR Video) */}
        <View style={styles.photoSection}>
          <Text style={styles.photoSectionTitle}>BEFORE Evidence</Text>
          <MediaGallery photos={report.photos} video={report.video} />
        </View>

        {/* Report Info */}
        <ReportInfoSection report={report} />

        {/* AFTER Media - Only show if verified */}
        {report.status === 'verified' && (report.afterPhotos?.length > 0 || report.afterVideo) && (
          <View style={styles.afterSection}>
            <View style={styles.verifiedBanner}>
              <Text style={styles.verifiedBannerText}> ISSUE FIXED & VERIFIED</Text>
            </View>

            <View style={styles.photoSection}>
              <Text style={styles.photoSectionTitle}>AFTER Evidence</Text>
              <Text style={styles.photoSectionSubtitle}>Media taken after the issue was fixed</Text>

              <View style={styles.galleryWrapper}>
                <AfterMediaGallery 
                  photos={report.afterPhotos} 
                  video={report.afterVideo}
                  title="" 
                />
              </View>
            </View>

            {report.resolutionNotes && (
              <View style={styles.resolutionNotesSection}>
                <Text style={styles.sectionTitle}>Resolution Details</Text>
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{report.resolutionNotes}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* If resolved but not verified yet */}
        {report.status === 'resolved' && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingText}>
              This issue has been fixed and is awaiting quality verification.
            </Text>
          </View>
        )}

        {/* If reopened */}
        {report.status === 'reopened' && (
          <View style={styles.reopenedSection}>
            <Text style={styles.reopenedText}>
              This issue is being reviewed and may need additional work.
            </Text>
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
  error: { fontSize: 18, color: '#dc2626', fontWeight: '600' },

  draftBanner: {
    backgroundColor: '#fef3c7',
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#fbbf24',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  draftInfo: { flex: 1 },
  draftText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 4,
  },
  draftSubtext: {
    fontSize: 13,
    color: '#78350f',
    fontWeight: '500',
  },
  editDraftBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  editDraftBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  photoSection: { marginBottom: 24 },
  photoSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
  },
  photoSectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: '#f8fafc',
  },
  galleryWrapper: { paddingHorizontal: 24 },
  afterSection: { marginTop: 24 },
  verifiedBanner: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    alignItems: 'center',
  },
  verifiedBannerText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  resolutionNotesSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  notesBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  pendingSection: {
    marginHorizontal: 24,
    marginTop: 24,
    padding: 20,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  pendingText: {
    fontSize: 15,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '600',
  },
  reopenedSection: {
    marginHorizontal: 24,
    marginTop: 24,
    padding: 20,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  reopenedText: {
    fontSize: 15,
    color: '#991b1b',
    textAlign: 'center',
    fontWeight: '600',
  },
});