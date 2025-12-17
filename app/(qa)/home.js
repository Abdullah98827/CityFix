// app/(qa)/home.js - QA Verification Queue
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
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

export default function QAHome() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'verified', 'reopened', 'all'
  
  // Store unsubscribe function for cleanup before sign out
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Build query based on selected filter
    let q;
    
    if (filter === 'pending') {
      // Show only resolved reports waiting for verification
      q = query(
        collection(db, 'reports'),
        where('status', '==', 'resolved'),
        orderBy('resolvedAt', 'desc')
      );
    } else if (filter === 'verified') {
      // Show verified reports
      q = query(
        collection(db, 'reports'),
        where('status', '==', 'verified'),
        orderBy('verifiedAt', 'desc')
      );
    } else if (filter === 'reopened') {
      // Show reopened reports
      q = query(
        collection(db, 'reports'),
        where('status', '==', 'reopened'),
        orderBy('reopenedAt', 'desc')
      );
    } else {
      // Show all reports that have been resolved at some point
      q = query(
        collection(db, 'reports'),
        orderBy('createdAt', 'desc')
      );
    }

    // Listen to real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsList = [];
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        // For 'all' filter, only include reports that have been resolved
        if (filter === 'all') {
          if (data.status === 'resolved' || data.status === 'verified' || data.status === 'reopened') {
            reportsList.push(data);
          }
        } else {
          reportsList.push(data);
        }
      });
      setReports(reportsList);
      setLoading(false);
    });

    // Save unsubscribe function for cleanup
    unsubscribeRef.current = unsubscribe;

    return () => unsubscribe();
  }, [filter]);

  // Cleanup before sign out
  const handleCleanupBeforeSignOut = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    router.replace('/(auth)/login');
  };

  // Navigate to verification screen
  const handleReportPress = (reportId) => {
    router.push(`/(qa)/verify/${reportId}`);
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
        <Text style={styles.title}>QA Console</Text>
        <Text style={styles.subtitle}>
          {filter === 'pending' ? 'Pending Verification' : 
           filter === 'verified' ? 'Verified Reports' :
           filter === 'reopened' ? 'Reopened Reports' : 'All Reports'}
        </Text>
        <Text style={styles.count}>{reports.length} reports</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'verified' && styles.filterTabActive]}
          onPress={() => setFilter('verified')}
        >
          <Text style={[styles.filterText, filter === 'verified' && styles.filterTextActive]}>
            Verified
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'reopened' && styles.filterTabActive]}
          onPress={() => setFilter('reopened')}
        >
          <Text style={[styles.filterText, filter === 'reopened' && styles.filterTextActive]}>
            Reopened
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
            {filter === 'pending'
              ? 'Resolved reports will appear here for verification'
              : 'No reports in this category'}
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
    backgroundColor: '#f8fafc',
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
    fontSize: 13,
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