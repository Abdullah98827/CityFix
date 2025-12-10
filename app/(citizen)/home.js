// app/(citizen)/home.js - Refactored to use SignOutButton component
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../backend/firebase';
import SignOutButton from '../../components/SignOutButton';

export default function CitizenHome() {
  const router = useRouter();
  const [userName, setUserName] = useState('Citizen');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'UserMD', auth.currentUser.uid));
          if (userDoc.exists()) {
            setUserName(userDoc.data().name || 'Citizen');
          }
        } catch (error) {
          console.log('Could not fetch name');
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  // This function runs BEFORE signing out
  // It navigates to login page
  const handleCleanupBeforeSignOut = () => {
    router.replace('/(auth)/login');
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
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {userName}!</Text>
        <Text style={styles.subtitle}>What would you like to do today?</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/(citizen)/report')}
        >
          <Text style={styles.cardTitle}>Report Issue</Text>
          <Text style={styles.cardDesc}>Report a new city issue</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => router.push('/(citizen)/my-reports')}
        >
          <Text style={styles.cardTitle}>My Reports</Text>
          <Text style={styles.cardDesc}>View your submitted reports</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => router.push('/(citizen)/map')}
        >
          <Text style={styles.cardTitle}>Map View</Text>
          <Text style={styles.cardDesc}>See all issues on the map</Text>
        </TouchableOpacity>
      </View>

      {/* Use the reusable SignOutButton component */}
      <SignOutButton onBeforeSignOut={handleCleanupBeforeSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { marginTop: 20, marginBottom: 32 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666' },
  menu: { flex: 1, gap: 15 },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#666' },
});