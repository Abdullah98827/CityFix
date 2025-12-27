// app/(dispatcher)/home.js
// Dispatcher home screen with auto-merge, manual review, and unread notifications badge
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NotificationsScreen from '../(common)/notifications';
import { auth, db } from '../../backend/firebase';
import AppHeader from '../../components/AppHeader';
import CustomButton from '../../components/CustomButton';
import ReportCard from '../../components/ReportCard';

// ============================================
// CONFIGURABLE SETTINGS
// ============================================
const AUTO_MERGE_RADIUS_KM = 0.03; // 30 metres
const AUTO_MERGE_TIME_HOURS = 12;
const MANUAL_REVIEW_RADIUS_KM = 0.05; // 50 metres
const MANUAL_REVIEW_TIME_HOURS = 24;

export default function DispatcherHome() {
  const router = useRouter();

  const [allReports, setAllReports] = useState([]);
  const [displayItems, setDisplayItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');
  const [unreadCount, setUnreadCount] = useState(0);

  // Load all reports once
  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchReports = async () => {
      setLoading(true);

      const q = query(
        collection(db, 'reports'),
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const reportsList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'merged') {
          reportsList.push({ id: doc.id, ...data });
        }
      });

      setAllReports(reportsList);

      // Auto-merge obvious duplicates
      const submittedReports = reportsList.filter(r => r.status === 'submitted');
      if (submittedReports.length > 0) {
        await autoMergeDuplicates(submittedReports);
      }

      updateDisplayItems(reportsList, filter);
      setLoading(false);
    };

    fetchReports();
  }, []);

  // Re-run display update when filter changes
  useEffect(() => {
    updateDisplayItems(allReports, filter);
  }, [filter, allReports]);

  // Update display based on current filter
  const updateDisplayItems = (reportsList, currentFilter) => {
    let items = reportsList;

    if (currentFilter === 'new') {
      const submittedOnly = items.filter(r => r.status === 'submitted');
      items = groupUncertainDuplicates(submittedOnly);
    } else if (currentFilter === 'assigned') {
      items = items
        .filter(r => r.status === 'assigned' || r.status === 'in progress')
        .map(r => ({ type: 'single', report: r }));
    } else {
      items = items.map(r => ({ type: 'single', report: r }));
    }

    setDisplayItems(items);
  };

  // Auto-merge obvious duplicates
  const autoMergeDuplicates = async (reports) => {
    const processed = new Set();
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      if (processed.has(report.id) || report.duplicateCount > 0) continue;

      const duplicates = [];
      for (let j = 0; j < reports.length; j++) {
        const other = reports[j];
        if (processed.has(other.id) || other.id === report.id) continue;
        if (other.category !== report.category) continue;

        const distance = calculateDistance(
          report.location.latitude,
          report.location.longitude,
          other.location.latitude,
          other.location.longitude
        );
        if (distance > AUTO_MERGE_RADIUS_KM) continue;

        const timeDiff = Math.abs(
          (report.createdAt?.toDate() || new Date()) -
          (other.createdAt?.toDate() || new Date())
        );
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        if (hoursDiff > AUTO_MERGE_TIME_HOURS) continue;

        duplicates.push(other);
        processed.add(other.id);
      }

      if (duplicates.length > 0) {
        for (const dup of duplicates) {
          await updateDoc(doc(db, 'reports', dup.id), {
            status: 'merged',
            isDuplicateOf: report.id,
            mergedAt: new Date(),
            autoMerged: true,
          });
        }
        await updateDoc(doc(db, 'reports', report.id), {
          duplicateCount: duplicates.length,
          mergedReportIds: duplicates.map(d => d.id),
          autoMerged: true,
        });
      }
      processed.add(report.id);
    }
  };

  // Group uncertain duplicates for manual review
  const groupUncertainDuplicates = (reports) => {
    const grouped = [];
    const processed = new Set();
    for (const report of reports) {
      if (processed.has(report.id)) continue;

      const group = [report];
      processed.add(report.id);

      for (const other of reports) {
        if (processed.has(other.id) || other.id === report.id) continue;
        if (other.category !== report.category) continue;

        const distance = calculateDistance(
          report.location.latitude,
          report.location.longitude,
          other.location.latitude,
          other.location.longitude
        );
        if (distance > MANUAL_REVIEW_RADIUS_KM) continue;

        const timeDiff = Math.abs(
          (report.createdAt?.toDate() || new Date()) -
          (other.createdAt?.toDate() || new Date())
        );
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        if (hoursDiff > MANUAL_REVIEW_TIME_HOURS) continue;

        group.push(other);
        processed.add(other.id);
      }

      if (group.length > 1) {
        grouped.push({
          type: 'group',
          reports: group,
          master: group[0],
        });
      } else {
        grouped.push({ type: 'single', report: group[0] });
      }
    }
    return grouped;
  };

  // Calculate distance (Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleReportPress = (reportId) => {
    router.push(`/(dispatcher)/report-detail/${reportId}`);
  };

  const handleManualMerge = async (group) => {
    const master = group.master;
    const duplicates = group.reports.slice(1);

    for (const dup of duplicates) {
      await updateDoc(doc(db, 'reports', dup.id), {
        status: 'merged',
        isDuplicateOf: master.id,
        mergedAt: new Date(),
        autoMerged: false,
      });
    }

    const currentDuplicateCount = master.duplicateCount || 0;
    await updateDoc(doc(db, 'reports', master.id), {
      duplicateCount: currentDuplicateCount + duplicates.length,
      mergedReportIds: [
        ...(master.mergedReportIds || []),
        ...duplicates.map(d => d.id)
      ],
    });

    Alert.alert(
      'Success',
      `${duplicates.length} duplicate(s) merged successfully!`
    );
  };

  const newCount = allReports.filter(r => r.status === 'submitted').length;
  const assignedCount = allReports.filter(r =>
    r.status === 'assigned' || r.status === 'in progress'
  ).length;
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
      <AppHeader
        title="Dispatcher"
        showBack={false}
        showSignOut={true}
        unreadCount={unreadCount}
      />
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
      {displayItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No reports found</Text>
          <Text style={styles.emptySub}>
            {filter === 'new' ? 'New reports will appear here' : 'No reports match this filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item, index) => {
            if (item.type === 'group') return `group-${item.master.id}`;
            return item.report?.id || `item-${index}`;
          }}
          renderItem={({ item }) => {
            if (item.type === 'group') {
              return (
                <View style={styles.duplicateGroup}>
                  <Text style={styles.groupTitle}>
                    Possible Duplicates ({item.reports.length})
                  </Text>
                  <Text style={styles.groupSubtitle}>
                    These reports are within {MANUAL_REVIEW_RADIUS_KM * 1000}m and {MANUAL_REVIEW_TIME_HOURS}h of each other.
                    Review them and merge if they`re the same issue.
                  </Text>
                  {item.reports.map((r) => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      onPress={() => handleReportPress(r.id)}
                    />
                  ))}
                  <CustomButton
                    title="Merge These Duplicates"
                    onPress={() => handleManualMerge(item)}
                    variant="secondary"
                  />
                </View>
              );
            }
            const report = item.report;
            return (
              <View>
                {report.status !== 'merged' && report.duplicateCount > 0 && (
                  <View style={styles.mergeBadgeContainer}>
                    <Text style={styles.mergeBadge}>
                      {report.autoMerged ? 'Auto Merged' : 'Manually Merged'}
                    </Text>
                    <Text style={styles.duplicateCount}>
                      ({report.duplicateCount} duplicate{report.duplicateCount > 1 ? 's' : ''})
                    </Text>
                  </View>
                )}
                <ReportCard
                  report={report}
                  onPress={() => handleReportPress(report.id)}
                />
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      <View style={styles.hiddenNotifications}>
        <NotificationsScreen onUnreadCountChange={setUnreadCount} />
      </View>
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
  duplicateGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 6,
  },
  groupSubtitle: {
    fontSize: 13,
    color: '#78716c',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  hiddenNotifications: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
  mergeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  mergeBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  duplicateCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
});