// app/(dispatcher)/home.js - Dispatcher Console Inbox
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../backend/firebase';
import ReportCard from '../../components/ReportCard';
import SignOutButton from '../../components/SignOutButton';

export default function DispatcherHome() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new'); // 'new', 'assigned', 'all'
  
  // Store unsubscribe function for cleanup before sign out
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Get ALL reports and filter in memory (no index needed)
    const q = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc')
    );

    // Listen to real-time updates from Firestore
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allReports = [];
      snapshot.forEach((doc) => {
        allReports.push({ id: doc.id, ...doc.data() });
      });
      
      // Filter in JavaScript based on selected filter
      let filteredReports = allReports;
      
      if (filter === 'new') {
        // Show only new reports
        filteredReports = allReports.filter(r => r.status === 'submitted');
      } else if (filter === 'assigned') {
        // Show assigned reports
        filteredReports = allReports.filter(r => 
          r.status === 'assigned' || r.status === 'in progress'
        );
      }
      // 'all' filter shows everything (no filtering needed)
      
      setReports(filteredReports);
      setLoading(false);
    });

    // Save unsubscribe function for cleanup
    unsubscribeRef.current = unsubscribe;

    // Cleanup when component unmounts or filter changes
    return () => unsubscribe();
  }, [filter]);

  // This runs BEFORE signing out to prevent permission errors
  const handleCleanupBeforeSignOut = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current(); // Stop Firestore listener
      unsubscribeRef.current = null;
    }
    router.replace('/(auth)/login'); // Navigate to login
  };

  // Navigate to report detail to create work order
  const handleReportPress = (reportId) => {
    router.push(`/(dispatcher)/report-detail/${reportId}`);
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dispatcher Console</Text>
        <Text style={styles.subtitle}>
          {filter === 'new' ? 'New Reports' : filter === 'assigned' ? 'Assigned Reports' : 'All Reports'}
        </Text>
        <Text style={styles.count}>{reports.length} reports</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'new' && styles.filterTabActive]}
          onPress={() => setFilter('new')}
        >
          <Text style={[styles.filterText, filter === 'new' && styles.filterTextActive]}>
            New
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'assigned' && styles.filterTabActive]}
          onPress={() => setFilter('assigned')}
        >
          <Text style={[styles.filterText, filter === 'assigned' && styles.filterTextActive]}>
            Assigned
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reports List */}
      {reports.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySub}>
            {filter === 'new' 
              ? 'New citizen reports will appear here'
              : 'No reports match this filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReportCard 
              report={item} 
              onPress={handleReportPress}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sign Out Button */}
      <View style={styles.footer}>
        <SignOutButton onBeforeSignOut={handleCleanupBeforeSignOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f8fafc' 
  },
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: { 
    fontSize: 32, 
    fontWeight: '900', 
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: { 
    fontSize: 18, 
    color: '#e0e7ff', 
    fontWeight: '600',
  },
  count: { 
    fontSize: 15, 
    color: '#c7d2fe', 
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
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
  list: { 
    padding: 16,
    paddingBottom: 100, // Space for sign out button
  },
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
  footer: { 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
});