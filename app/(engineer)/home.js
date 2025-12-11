// app/(engineer)/home.js - Engineer Dashboard
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
import { auth, db } from '../../backend/firebase';
import JobCard from '../../components/JobCard';
import SignOutButton from '../../components/SignOutButton';

export default function EngineerHome() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'active', 'completed', 'all'
  const [userLocation, setUserLocation] = useState(null);
  
  // Store unsubscribe function for cleanup before sign out
  const unsubscribeRef = useRef(null);

  // Get user's current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    })();
  }, []);

  // Fetch jobs assigned to this engineer
  useEffect(() => {
    if (!auth.currentUser) {
      router.replace('/(auth)/login');
      return;
    }

    // Query reports assigned to this engineer
    const q = query(
      collection(db, 'reports'),
      where('assignedTo', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    // Listen to real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allJobs = [];
      snapshot.forEach((doc) => {
        allJobs.push({ id: doc.id, ...doc.data() });
      });
      
      // Filter based on selected filter
      let filteredJobs = allJobs;
      
      if (filter === 'active') {
        // Show assigned and in progress jobs
        filteredJobs = allJobs.filter(
          (j) => j.status === 'assigned' || j.status === 'in progress'
        );
      } else if (filter === 'completed') {
        // Show resolved jobs
        filteredJobs = allJobs.filter((j) => j.status === 'resolved');
      }
      // 'all' filter shows everything
      
      setJobs(filteredJobs);
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

  // Navigate to job detail
  const handleJobPress = (jobId) => {
    router.push(`/(engineer)/job-detail/${jobId}`);
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
        <Text style={styles.title}>My Jobs</Text>
        <Text style={styles.subtitle}>
          {filter === 'active' ? 'Active Jobs' : filter === 'completed' ? 'Completed Jobs' : 'All Jobs'}
        </Text>
        <Text style={styles.count}>{jobs.length} jobs</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed
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

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No jobs found</Text>
          <Text style={styles.emptySub}>
            {filter === 'active'
              ? 'Your assigned jobs will appear here'
              : 'No completed jobs yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleJobPress(item.id)}>
              <JobCard 
                job={item} 
                showDistance={true} 
                userLocation={userLocation}
              />
            </TouchableOpacity>
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