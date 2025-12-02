import { useRouter } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CityFix</Text>
      <Text style={styles.subtitle}>Report city issues</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="Login"
          onPress={() => router.push('/(auth)/login')}
        />
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Register"
          onPress={() => router.push('/(auth)/register')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 15,
  },
});