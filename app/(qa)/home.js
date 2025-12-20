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

export default function QAHome() {
  const router = useRouter();
  const [allReports, setAllReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'resolved' || data.status === 'verified' || data.status === 'reopened') {
          reportsList.push({ id: doc.id, ...data });
        }
      });

      setAllReports(reportsList);

      let filtered = reportsList;
      if (filter === 'pending') {
        filtered = reportsList.filter(r => r.status === 'resolved');
      } else if (filter === 'verified') {
        filtered = reportsList.filter(r => r.status === 'verified');
      } else if (filter === 'reopened') {
        filtered = reportsList.filter(r => r.status === 'reopened');
      }

      setFilteredReports(filtered);
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [filter]);

  const handleReportPress = (reportId) => {
    router.push(`/(qa)/verify/${reportId}`);
  };

  const pendingCount = allReports.filter(r => r.status === 'resolved').length;
  const verifiedCount = allReports.filter(r => r.status === 'verified').length;
  const reopenedCount = allReports.filter(r => r.status === 'reopened').length;
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
      <AppHeader title="QA Console" showBack={false} showSignOut={true} />

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
              Pending ({pendingCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'verified' && styles.filterTabActive]}
            onPress={() => setFilter('verified')}
          >
            <Text style={[styles.filterText, filter === 'verified' && styles.filterTextActive]}>
              Verified ({verifiedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'reopened' && styles.filterTabActive]}
            onPress={() => setFilter('reopened')}
          >
            <Text style={[styles.filterText, filter === 'reopened' && styles.filterTextActive]}>
              Reopened ({reopenedCount})
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
            {filter === 'pending' ? 'Resolved reports will appear here for verification' : 'No reports in this category'}
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
    paddingVertical: 14,
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