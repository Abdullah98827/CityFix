// app/(citizen)/map.js   ← FINAL WORKING VERSION
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { db } from '../../backend/firebase';
import ReportCard from '../../components/ReportCard';

const { width } = Dimensions.get('window');

export default function MapViewScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All Reports' },
    { id: 'pothole', label: 'Pothole' },
    { id: 'streetlight', label: 'Streetlight' },
    { id: 'waste', label: 'Missed Bin' },
    { id: 'flooding', label: 'Flooding' },
    { id: 'graffiti', label: 'Graffiti' },
    { id: 'other', label: 'Other' },
  ];

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allReports = [];
      snapshot.forEach((doc) => {
        allReports.push({ id: doc.id, ...doc.data() });
      });
      setReports(allReports);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredReports = selectedCategory === 'all'
    ? reports
    : reports.filter(r => r.category === selectedCategory);

  const getPinColor = (category) => {
    switch (category) {
      case 'pothole':     return '#EF4444';
      case 'streetlight': return '#F59E0B';
      case 'waste':       return '#10B981';
      case 'flooding':    return '#3B82F6';
      case 'graffiti':    return '#8B5CF6';
      default:            return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header + Filter */}
      <View style={styles.header}>
        <Text style={styles.title}>City Issues Map</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.filterBtn,
                selectedCategory === cat.id && styles.filterBtnActive
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[
                styles.filterText,
                selectedCategory === cat.id && styles.filterTextActive
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 52.2405,      // Northampton area
          longitude: -0.9,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {filteredReports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{
              latitude: report.location.latitude,
              longitude: report.location.longitude,
            }}
            pinColor={getPinColor(report.category)}
          >
            <Callout style={styles.callout}>
              <View style={{ width: width * 0.85 }}>
                <ReportCard report={report} />
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: { padding: 16, backgroundColor: '#fff', elevation: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#1e293b', textAlign: 'center', marginBottom: 12 },
  filterScroll: { marginBottom: 8 },
  filterBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 30, backgroundColor: '#f1f5f9', marginRight: 10 },
  filterBtnActive: { backgroundColor: '#4F46E5' },
  filterText: { fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#fff' },
  map: { flex: 1 },
  callout: { borderRadius: 16, overflow: 'hidden' },
});