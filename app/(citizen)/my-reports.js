// app/(citizen)/my-reports.js
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { auth, db } from '../../backend/firebase';
import ReportCard from '../../components/ReportCard';

export default function MyReports() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }

    const q = query(
      collection(db, 'reports'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userReports = [];
      snapshot.forEach((doc) => {
        userReports.push({ id: doc.id, ...doc.data() });
      });
      setReports(userReports);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Reports</Text>

      {reports.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No reports yet</Text>
          <Text style={styles.emptySub}>
            Your submitted reports will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReportCard report={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  header: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    paddingVertical: 24,
    backgroundColor: '#fff',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  list: { padding: 16 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 20, color: '#64748b', marginBottom: 8, fontWeight: '600' },
  emptySub: { fontSize: 15, color: '#94a1a1aa', textAlign: 'center' },
});