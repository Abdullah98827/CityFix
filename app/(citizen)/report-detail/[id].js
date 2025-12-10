// app/(citizen)/report-detail/[id].js - Refactored with Reusable Components
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { db } from '../../../backend/firebase';
import PhotosGallery from '../../../components/PhotosGallery';
import ReportHeader from '../../../components/ReportHeader';
import ReportInfoSection from '../../../components/ReportInfoSection';

export default function CitizenReportDetail() {
  const { id } = useLocalSearchParams();
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
      {/* Reusable Header Component */}
      <ReportHeader title="Report Details" />

      <ScrollView style={styles.container}>
        {/* Reusable Photo Gallery Component with Counter */}
        <PhotosGallery photos={report.photos} />

        {/* Reusable Report Info Component */}
        <ReportInfoSection report={report} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 18, color: '#dc2626' },
});