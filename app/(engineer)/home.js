// app/(engineer)/home.js
// Engineer home screen showing assigned jobs with filters and unread badge
import * as Location from 'expo-location';
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
      // Apply status filter first
      if (filter === 'active') {
        filtered = jobsList.filter(
          (j) => j.status === 'assigned' || j.status === 'in progress' || j.status === 'reopened'
        );
      } else if (filter === 'completed') {
        filtered = jobsList.filter(
          (j) => j.status === 'resolved' || j.status === 'verified'
        );
      }

      // Sort by proximity if we have user location
      if (userLocation) {
        filtered = [...filtered].map(job => {
          if (!job.location) return { ...job, _distance: Infinity };
          const R = 3959;
          const dLat = (job.location.latitude - userLocation.latitude) * Math.PI / 180;
          const dLon = (job.location.longitude - userLocation.longitude) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLocation.latitude * Math.PI / 180) *
            Math.cos(job.location.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;
          return { ...job, _distance: distance };
        }).sort((a, b) => a._distance - b._distance)
          .map(({ _distance, ...job }) => job);
      }

      setFilteredJobs(filtered);
      setLoading(false);
    }, (error) => {
      // Handle permission errors (e.g., sign out)
      console.warn('Snapshot error (likely logout):', error.message);
      setLoading(false);
    });

    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount or auth change
    return () => {
      unsubscribe();
    };
  }, [filter, userLocation, router]);

  const handleJobPress = (jobId) => {
    router.push(`/(engineer)/job-detail/${jobId}`);
  };

  // Suggested Route – nearest neighbour order
  const handleSuggestedRoute = () => {
    if (!userLocation) {
      Alert.alert('Location Needed', 'Please enable location to get a suggested route');
      return;
    }
    if (filteredJobs.length === 0) {
      Alert.alert('No Jobs', 'You have no jobs to route');
      return;
    }
    let remainingJobs = [...filteredJobs];
    let route = [];
    let currentPos = { latitude: userLocation.latitude, longitude: userLocation.longitude };
    while (remainingJobs.length > 0) {
      let closestJob = null;
      let closestDist = Infinity;
      remainingJobs.forEach(job => {
        if (!job.location) return;
        const dist = calculateDistance(
          currentPos.latitude,
          currentPos.longitude,
          job.location.latitude,
          job.location.longitude
        );
        if (dist < closestDist) {
          closestDist = dist;
          closestJob = job;
        }
      });
      if (closestJob) {
        route.push(closestJob);
        remainingJobs = remainingJobs.filter(j => j.id !== closestJob.id);
        currentPos = { latitude: closestJob.location.latitude, longitude: closestJob.location.longitude };
      } else {
        // If no location, just add remaining
        route.push(...remainingJobs);
        break;
      }
    }
    setFilteredJobs(route);
    Alert.alert('Route Updated', 'Jobs reordered for suggested route (nearest neighbour)');
  };

  const handleResetOrder = () => {
    // Force reload from Firestore to get original creation order
    const q = query(
      collection(db, 'reports'),
      where('assignedTo', '==', auth.currentUser.uid),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsList = [];
      snapshot.forEach((doc) => jobsList.push({ id: doc.id, ...doc.data() }));
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
      Alert.alert('Order Reset', 'Jobs restored to original assignment order');
    });
    // Cleanup
    return () => unsubscribe();
  };

  // Calculate distance in miles (same as JobCard)
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
      {/* Route Controls */}
      <View style={styles.routeControls}>
        <CustomButton
          title="Suggested Route"
          onPress={handleSuggestedRoute}
          variant="secondary"
          style={styles.routeButton}
        />
        <CustomButton
          title="Reset"
          onPress={handleResetOrder}
          variant="danger"
          style={styles.routeButton}
        />
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
    fontSize: 14,
  },
});