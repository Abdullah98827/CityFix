import { useRouter } from 'expo-router';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../backend/firebase';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import { logAction } from '../../utils/logger';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please fill in both email and password');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Logs successful login
      logAction('user_logged_in', user.uid, `Email: ${user.email}`);

      // Gets user document
      const userDocRef = doc(db, 'UserMD', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        Alert.alert('Login Error', 'User data not found. Please register again.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();

      // Checks if account is disabled
      if (userData.isDisabled) {
        await signOut(auth);
        Alert.alert(
          'Account Disabled',
          'Your account has been disabled by an administrator. Please contact support.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const userRole = userData.role || 'citizen';

      // Navigates based on role
      if (userRole === 'citizen') {
        router.replace('/(citizen)/home');
      } else if (userRole === 'dispatcher') {
        router.replace('/(dispatcher)/home');
      } else if (userRole === 'engineer') {
        router.replace('/(engineer)/home');
      } else if (userRole === 'qa') {
        router.replace('/(qa)/home');
      } else if (userRole === 'admin') {
        router.replace('/(admin)/home');
      } else {
        Alert.alert('Login Error', 'Role not recognised — please contact admin');
      }

      setLoading(false);
    } catch (error) {
      let message = 'Invalid email or password';

      if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password';
      } else if (error.code === 'auth/user-not-found') {
        message = 'No user found with this email';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address';
      }

      Alert.alert('Login Failed', message);
      setLoading(false);
    }
  };

  // Handles forgot password
  const handleForgotPassword = () => {
    Alert.prompt(
      'Forgot Password',
      'Enter your email address',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async (inputEmail) => {
            if (!inputEmail || !inputEmail.includes('@')) {
              Alert.alert('Error', 'Please enter a valid email');
              return;
            }

            try {
              await sendPasswordResetEmail(auth, inputEmail.trim());
              Alert.alert('Success', 'Password reset email sent! Check your inbox.');
            } catch (error) {
              Alert.alert('Error', 'Could not send reset email. Check the email is correct.');
            }
          },
        },
      ],
      'plain-text',
      '',
      'email-address'
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>CityFix</Text>
        <Text style={styles.title}>Sign in to your account</Text>
      </View>
      <View style={styles.form}>
        <CustomInput
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <CustomInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
        ) : (
          <CustomButton title="Sign In" onPress={handleLogin} variant="secondary" />
        )}
        <Text style={styles.footerText}>
          Don’t have an account?{' '}
          <Text style={styles.link} onPress={() => router.push('/(auth)/register')}>
            Sign up
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  form: {
    width: '100%',
  },
  forgotLink: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 24,
  },
  forgotText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    color: '#666',
  },
  link: {
    color: '#4F46E5',
    fontWeight: '600',
  },
});