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
import AppHeader from '../../components/AppHeader';

export default function CitizenHome() {
  const router = useRouter();
  const [userName, setUserName] = useState('Citizen');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'UserMD', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserName(userDoc.data().name || 'Citizen');
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [router]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="CityFix" showBack={false} showSignOut={true} />

      <View style={styles.content}>
        <Text style={styles.greeting}>Hello {userName}!</Text>
        <Text style={styles.subtitle}>What would you like to do today?</Text>

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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 32 },
  menu: { gap: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#64748b' },
});