import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NotificationsScreen from '../(common)/notifications';
import { auth, db } from '../../backend/firebase';
import AppHeader from '../../components/AppHeader';
import CustomButton from '../../components/CustomButton';
import JobCard from '../../components/JobCard';

export default function EngineerHome() {
  const router = useRouter();
  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const unsubscribeRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const councilLocation = {
    latitude: 52.2405,
    longitude: -0.9027,
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }

    const q = query(
      collection(db, 'reports'),
      where('assignedTo', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList = [];
      snapshot.forEach((doc) => jobsList.push({ id: doc.id, ...doc.data() }));
      setAllJobs(jobsList);

      let filtered = jobsList;

      if (filter === 'active') {
        filtered = jobsList.filter(
          (j) => j.status === 'assigned' || j.status === 'in progress' || j.status === 'reopened'
        );
      } else if (filter === 'completed') {
        filtered = jobsList.filter(
          (j) => j.status === 'resolved' || j.status === 'verified'
        );
      }

      setFilteredJobs(filtered);
      setLoading(false);
    }, (error) => {
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    return () => unsubscribe();
  }, [filter, router]);

  const handleJobPress = (jobId) => {
    router.push(`/(engineer)/job-detail/${jobId}`);
  };

  const handleSuggestedRoute = () => {
    if (filteredJobs.length === 0) {
      Alert.alert('No Jobs', 'You have no jobs to route');
      return;
    }

    const sorted = [...filteredJobs].sort((a, b) => {
      const distA = a.location ? calculateDistance(
        councilLocation.latitude,
        councilLocation.longitude,
        a.location.latitude,
        a.location.longitude
      ) : Infinity;
      const distB = b.location ? calculateDistance(
        councilLocation.latitude,
        councilLocation.longitude,
        b.location.latitude,
        b.location.longitude
      ) : Infinity;
      return distA - distB;
    });

    setFilteredJobs(sorted);
    Alert.alert('Route Updated', 'Jobs reordered nearest to Northampton Council first');
  };

  const handleResetOrder = () => {
    setFilteredJobs([...allJobs].filter(job => {
      if (filter === 'active') {
        return ['assigned', 'in progress', 'reopened'].includes(job.status);
      }
      if (filter === 'completed') {
        return ['resolved', 'verified'].includes(job.status);
      }
      return true;
    }));
    Alert.alert('Order Reset', 'Jobs restored to default order (newest first)');
  };

  const activeCount = allJobs.filter(
    (j) => j.status === 'assigned' || j.status === 'in progress' || j.status === 'reopened'
  ).length;
  const completedCount = allJobs.filter(
    (j) => j.status === 'resolved' || j.status === 'verified'
  ).length;
  const allCount = allJobs.length;

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
        title="My Jobs"
        showBack={false}
        showSignOut={true}
        unreadCount={unreadCount}
      />

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active ({activeCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed ({completedCount})
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
      </View>

      <View style={styles.routeControls}>
        <CustomButton
          title="Suggested Route"
          onPress={handleSuggestedRoute}
          variant="secondary"
          style={styles.routeButton}
        />
        <CustomButton
          title="Reset Order"
          onPress={handleResetOrder}
          variant="danger"
          style={styles.routeButton}
        />
      </View>

      {filteredJobs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No jobs found</Text>
          <Text style={styles.emptySub}>
            {filter === 'active' ? 'No active jobs' : 'No completed jobs'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/(engineer)/job-detail/${item.id}`)}>
              <JobCard job={item} councilLocation={councilLocation} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 8,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  routeControls: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  routeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
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
  hiddenNotifications: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 1,
    height: 1,
    opacity: 0,
  },
});