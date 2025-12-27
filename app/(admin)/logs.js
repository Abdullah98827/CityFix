// app/(admin)/logs.js
import { collection, getDocs, limit, orderBy, query, startAfter } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { db } from '../../backend/firebase';
import ReportHeader from '../../components/ReportHeader';

const PAGE_SIZE = 30;

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (isRefresh = false, isLoadMore = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    let q = query(
      collection(db, 'logs'),
      orderBy('timestamp', 'desc'),
      limit(PAGE_SIZE)
    );

    if (isLoadMore && lastVisible) {
      q = query(
        collection(db, 'logs'),
        orderBy('timestamp', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
    }

    const snapshot = await getDocs(q);
    const logList = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      logList.push({
        id: doc.id,
        ...data,
        formattedTime: data.timestamp
          ? data.timestamp.toDate().toLocaleString('en-GB')
          : 'Unknown time',
      });
    });

    if (isRefresh) {
      setLogs(logList);
    } else if (isLoadMore) {
      setLogs((prev) => [...prev, ...logList]);
    } else {
      setLogs(logList);
    }

    const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
    setLastVisible(newLastVisible || null);
    setHasMore(snapshot.docs.length === PAGE_SIZE);

    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [lastVisible]);

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = useCallback(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      fetchLogs(false, true);
    }
  }, [hasMore, loadingMore, fetchLogs]);

  const renderLog = ({ item }) => (
    <View style={styles.logItem}>
      <Text style={styles.time}>{item.formattedTime}</Text>
      <Text style={styles.user}>
        {item.userEmail} ({item.userRole || 'unknown'})
      </Text>
      <Text style={styles.action}>{item.action}</Text>
      {item.details && <Text style={styles.details}>{item.details}</Text>}
      {item.reportId && <Text style={styles.reportId}>Report ID: {item.reportId}</Text>}
    </View>
  );

  if (loading && logs.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ReportHeader title="Activity Logs" />
      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No logs yet</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLog}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore && <ActivityIndicator style={{ marginVertical: 20 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  logItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  time: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  user: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  action: { fontSize: 15, color: '#4f46e5', fontWeight: '600', marginTop: 4 },
  details: { fontSize: 14, color: '#475569', marginTop: 4 },
  reportId: { fontSize: 13, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#94a3b8' },
});