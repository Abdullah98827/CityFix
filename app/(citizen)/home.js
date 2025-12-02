import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomButton from '../../components/CustomButton';

export default function CitizenHome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Citizen!</Text>
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

        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>My Reports</Text>
          <Text style={styles.cardDesc}>View your submitted reports</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>Map View</Text>
          <Text style={styles.cardDesc}>See issues on the map</Text>
        </TouchableOpacity> */}
      </View>

      <CustomButton 
        title="Sign Out" 
        onPress={() => router.replace('/(auth)/login')}
        variant="danger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  menu: {
    flex: 1,
    gap: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
  },
});