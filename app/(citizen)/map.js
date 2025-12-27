import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
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
import { auth, db } from '../../backend/firebase';
import ReportCard from '../../components/ReportCard';
import ReportHeader from '../../components/ReportHeader';

const { width } = Dimensions.get('window');

export default function MapViewScreen() {
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState(['All Reports']);
  const [selectedCategory, setSelectedCategory] = useState('All Reports');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Loads categories from Firestore
    const fetchCategories = async () => {
      const docSnap = await getDoc(doc(db, 'ConfigMD', 'categories'));
      if (docSnap.exists() && docSnap.data().list) {
        setCategories(['All Reports', ...docSnap.data().list]);
      } else {
        setCategories(['All Reports', 'Pothole', 'Streetlight', 'Missed Bin', 'Flooding', 'Graffiti', 'Other']);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'reports'), 
      orderBy('createdAt', 'desc'));

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

  const filteredReports = selectedCategory === 'All Reports'
    ? reports
    : reports.filter(r => r.category === selectedCategory);

  const getPinColor = (category) => {
    const colours = [
      '#EF4444',
      '#F59E0B',
      '#10B981',
      '#3B82F6',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316',
      '#6366F1',
      '#84CC16',
    ];

    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colours.length;
    return colours[index];
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ReportHeader title="Map View" />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterBtn,
                selectedCategory === cat && styles.filterBtnActive
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                styles.filterText,
                selectedCategory === cat && styles.filterTextActive
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 52.2405,
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
  wrapper: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    marginRight: 10,
  },
  filterBtnActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  map: { flex: 1 },
  callout: { borderRadius: 16, overflow: 'hidden' },
});