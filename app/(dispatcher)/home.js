import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../backend/firebase';
import AppHeader from '../../components/AppHeader';
import ReportCard from '../../components/ReportCard';

export default function DispatcherHome() {
  const router = useRouter();
  const [allReports, setAllReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsList = [];
      snapshot.forEach((doc) => reportsList.push({ id: doc.id, ...doc.data() }));

      setAllReports(reportsList);

      let filtered = reportsList;
      if (filter === 'new') {
        filtered = reportsList.filter(r => r.status === 'submitted');
      } else if (filter === 'assigned') {
        filtered = reportsList.filter(r => r.status === 'assigned' || r.status === 'in progress');
      }

      setFilteredReports(filtered);
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [filter]);

  const handleReportPress = (reportId) => {
    router.push(`/(dispatcher)/report-detail/${reportId}`);
  };

  // Correct counts from allReports
  const newCount = allReports.filter(r => r.status === 'submitted').length;
  const assignedCount = allReports.filter(r => r.status === 'assigned' || r.status === 'in progress').length;
  const allCount = allReports.length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Dispatcher Console" showBack={false} showSignOut={true} />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'new' && styles.filterTabActive]}
            onPress={() => setFilter('new')}
          >
            <Text style={[styles.filterText, filter === 'new' && styles.filterTextActive]}>
              New ({newCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'assigned' && styles.filterTabActive]}
            onPress={() => setFilter('assigned')}
          >
            <Text style={[styles.filterText, filter === 'assigned' && styles.filterTextActive]}>
              Assigned ({assignedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({allCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {filteredReports.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySub}>
            {filter === 'new' ? 'New reports will appear here' : 'No reports match this filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReportCard report={item} onPress={() => handleReportPress(item.id)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  filterTab: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  filterTabActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: { padding: 16 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
  },
});