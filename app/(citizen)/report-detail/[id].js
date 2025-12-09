// app/(citizen)/report-detail/[id].js
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { db } from '../../../backend/firebase';

const { width } = Dimensions.get('window');

export default function ReportDetail() {
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
    <ScrollView style={styles.container}>
      {/* Swipeable Photo Gallery */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {report.photos?.length > 0 ? (
          report.photos.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.fullPhoto} />
          ))
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoText}>No photos</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.content}>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.category}>{report.category}</Text>

        <Text style={styles.description}>{report.description}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Status</Text>
          <Text style={[styles.status, { 
            backgroundColor: 
              report.status === 'submitted' ? '#F59E0B' :
              report.status === 'in progress' ? '#3B82F6' : '#10B981'
          }]}>
            {report.status || 'submitted'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>
            {report.createdAt?.toDate?.().toLocaleDateString('en-GB') || 'Recently'}
          </Text>
        </View>

        <Text style={styles.addressTitle}>Location</Text>
        <Text style={styles.address}>{report.address || 'Address not available'}</Text>

        {/* Interactive Map */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{
              latitude: report.location.latitude,
              longitude: report.location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            showsUserLocation={false}
          >
            <Marker
              coordinate={{
                latitude: report.location.latitude,
                longitude: report.location.longitude,
              }}
              pinColor="#EF4444"
            />
          </MapView>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullPhoto: { width, height: 380 },
  noPhoto: { width, height: 380, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  noPhotoText: { color: '#94a3b8', fontSize: 18 },
  content: { padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  category: { fontSize: 17, color: '#4F46E5', fontWeight: '700', marginBottom: 16, textTransform: 'capitalize' },
  description: { fontSize: 17, color: '#475569', lineHeight: 26, marginBottom: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 16, color: '#64748b', fontWeight: '600' },
  value: { fontSize: 16, color: '#334155' },
  status: { color: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, fontWeight: '700' },
  addressTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 8, marginBottom: 8 },
  address: { fontSize: 17, color: '#475569', marginBottom: 24, fontWeight: '500' },
  mapContainer: { height: 340, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  map: { width: '100%', height: '100%' },
  error: { fontSize: 18, color: '#dc2626' },
});