// app/(engineer)/home.js
// Engineer home screen showing assigned jobs with filters and unread badge
import * as Location from 'expo-location';
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
import NotificationsScreen from '../(common)/notifications';
import { auth, db } from '../../backend/firebase';
import AppHeader from '../../components/AppHeader';
import JobCard from '../../components/JobCard';

export default function EngineerHome() {
  const router = useRouter();

  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [userLocation, setUserLocation] = useState(null);
  const unsubscribeRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get user location for distance calculation
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        // Default to Northampton if permission denied
        setUserLocation({ latitude: 52.2405, longitude: -0.9027 });
      }
    })();
  }, []);

  // Fetch assigned jobs for this engineer
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
    });

    unsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [filter, router]);

  const handleJobPress = (jobId) => {
    router.push(`/(engineer)/job-detail/${jobId}`);
  };

  // Calculate tab counts
  const activeCount = allJobs.filter(
    (j) => j.status === 'assigned' || j.status === 'in progress' || j.status === 'reopened'
  ).length;

  const completedCount = allJobs.filter(
    (j) => j.status === 'resolved' || j.status === 'verified'
  ).length;

  const allCount = allJobs.length;

  // Loading state
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

      {/* Filter tabs */}
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

      {/* Jobs list */}
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
            <TouchableOpacity onPress={() => handleJobPress(item.id)}>
              <JobCard job={item} showDistance={true} userLocation={userLocation} />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Hidden screen to get unread count for badge */}
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