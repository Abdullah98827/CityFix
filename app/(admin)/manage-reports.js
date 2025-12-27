// app/(admin)/manage-reports.js
// Admin screen to list all reports and tap to view/delete
import { useRouter } from 'expo-router';
import { collection, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../backend/firebase';
import ReportHeader from '../../components/ReportHeader';

const PAGE_SIZE = 30;

export default function AdminManageReports() {
  const router = useRouter();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchReports = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!isRefresh && reports.length > 0) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    let q = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    if (!isRefresh && lastVisible) {
      q = query(
        collection(db, 'reports'),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
    }

    const snapshot = await getDocs(q);
    const reportList = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isDeleted !== true) {
        reportList.push({ id: doc.id, ...data });
      }
    });

    if (isRefresh) {
      setReports(reportList);
    } else {
      setReports(prev => [...prev, ...reportList]);
    }

    setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    setHasMore(snapshot.docs.length === PAGE_SIZE);

    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    fetchReports();
  }, []);

  const onRefresh = () => {
    fetchReports(true);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchReports();
    }
  };

  const handleReportPress = (reportId) => {
    router.push(`/(admin)/manage-reports/${reportId}`);
  };

  const renderReport = ({ item }) => (
    <TouchableOpacity onPress={() => handleReportPress(item.id)} style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>{item.title || 'Untitled Report'}</Text>
        <Text style={styles.reportDate}>
          {item.createdAt?.toDate?.().toLocaleDateString('en-GB') || 'Unknown date'}
        </Text>
      </View>
      <View style={styles.reportMeta}>
        <Text style={styles.reportCategory}>{item.category || 'No category'}</Text>
        <Text style={[styles.reportStatus, { backgroundColor: getStatusColor(item.status) }]}>
          {item.status?.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && reports.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
     <ReportHeader title="Manage Reports" showBack={false} />
      <Text style={styles.totalText}>Total Reports: {reports.length}</Text>
      {reports.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No reports found</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore && <ActivityIndicator style={{ marginVertical: 20 }} />
          }
        />
      )}
    </View>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'submitted': return '#F59E0B';
    case 'assigned': return '#3B82F6';
    case 'in progress': return '#8B5CF6';
    case 'resolved': return '#10B981';
    case 'verified': return '#059669';
    case 'reopened': return '#EF4444';
    default: return '#6B7280';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  reportItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  reportDate: {
    fontSize: 13,
    color: '#64748b',
  },
  reportMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportCategory: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  reportStatus: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
  },
  header: {
  paddingHorizontal: 24,
  paddingVertical: 16,
  backgroundColor: '#fff',
  borderBottomWidth: 1,
  borderBottomColor: '#e2e8f0',
},
totalText: {
  fontSize: 16,
  color: '#64748b',
  textAlign: 'center',
  marginTop: 8,
},
});