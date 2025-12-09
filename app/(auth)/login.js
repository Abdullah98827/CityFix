import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../../backend/firebase';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import FormMessage from '../../components/FormMessage';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleLogin = async () => {
    setMessage('');
    setIsError(false);

    if (!email || !password) {
      setMessage('Please fill in all fields');
      setIsError(true);
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Fetch user data from Firestore
      const userDocRef = doc(db, 'UserMD', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userName = userData.name || 'User';
        const userRole = userData.role || 'citizen';

        setMessage(`Welcome ${userName}! Logging in...`);
        setIsError(false);

        // Route based on role
        setTimeout(() => {
  if (userRole === 'citizen') {
    router.replace('/(citizen)/home');
  } else if (userRole === 'dispatcher') {
    router.replace('/(dispatcher)/home');
  } else if (userRole === 'engineer') {
    router.replace('/(engineer)/home');
  } else if (userRole === 'qa') {
    router.replace('/(qa)/home');
  }  else if (userRole === 'admin') {
    router.replace('/(admin)/home');
  } else {
    setMessage('Role not recognised — contact admin');
    setIsError(true);
  }
}, 1500);
      } else {
        setMessage('User data not found. Please register again.');
        setIsError(true);
      }
    } catch (error) {
      setIsError(true);
      if (error.code === 'auth/invalid-email') {
        setMessage('Please enter a valid email address');
      } else if (error.code === 'auth/user-not-found') {
        setMessage('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setMessage('Incorrect password');
      } else if (error.code === 'auth/invalid-credential') {
        setMessage('Invalid email or password');
      } else {
        setMessage('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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

        <FormMessage message={message} isError={isError} />

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
        ) : (
          <CustomButton title="Sign In" onPress={handleLogin} variant="secondary" />
        )}

        <Text style={styles.footerText}>
          Don’t have an account?{" "}
          <Text style={styles.link} onPress={() => router.push("/(auth)/register")}>
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
    backgroundColor: "#f5f5f5",
    padding: 24,
    justifyContent: "center",
  },
  header: { 
    alignItems: "center", 
    marginBottom: 40 
  },
  appName: { 
    fontSize: 36, 
    fontWeight: "bold", 
    color: "#4F46E5", 
    marginBottom: 12 
  },
  title: { 
    fontSize: 20, 
    fontWeight: "600", 
    color: "#333" 
  },
  form: {
    width: "100%" 
  },
  footerText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
    color: "#666",
  },
  link: {
    color: "#4F46E5", 
    fontWeight: "600" 
  },
});







// import { useRouter } from 'expo-router';
// import { signInWithEmailAndPassword } from 'firebase/auth';
// import { useState } from 'react';
// import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { auth } from '../../backend/firebase';
// import CustomButton from '../../components/CustomButton';
// import CustomInput from '../../components/CustomInput';

// export default function LoginScreen() {
//   const router = useRouter();
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleLogin = async () => {
//     if (email === '' || password === '') {
//       Alert.alert('Error', 'Please fill all fields');
//       return;
//     }

//     setLoading(true);

//     try {
//       await signInWithEmailAndPassword(auth, email, password);
//       setLoading(false);
//       router.replace('/(citizen)/home');
//     } catch (error) {
//       setLoading(false);
      
//       let errorMessage = 'Something went wrong. Please try again.';
      
//       if (error.code === 'auth/invalid-email') {
//         errorMessage = 'Please enter a valid email address';
//       } else if (error.code === 'auth/user-not-found') {
//         errorMessage = 'No account found with this email';
//       } else if (error.code === 'auth/wrong-password') {
//         errorMessage = 'Incorrect password';
//       } else if (error.code === 'auth/invalid-credential') {
//         errorMessage = 'Invalid email or password';
//       } else if (error.code === 'auth/too-many-requests') {
//         errorMessage = 'Too many failed attempts. Please try again later';
//       }
      
//       Alert.alert('Login Failed', errorMessage);
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.appName}>CityFix</Text>
//         <Text style={styles.title}>Sign in to your account</Text>
//       </View>
      
//       <View style={styles.form}>
//         <CustomInput
//           label="Email"
//           placeholder="Enter your email"
//           value={email}
//           onChangeText={setEmail}
//           keyboardType="email-address"
//           autoCapitalize="none"
//         />
        
//         <CustomInput
//           label="Password"
//           placeholder="Enter your password"
//           secureTextEntry
//           value={password}
//           onChangeText={setPassword}
//         />
        
//         {loading ? (
//           <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
//         ) : (
//           <CustomButton title="Sign In" onPress={handleLogin} variant='secondary' />
//         )}

//         <View style={styles.footer}>
//           <Text style={styles.footerText}>Don`t have an account? </Text>
//           <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
//             <Text style={styles.link}>Sign up</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { 
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//     padding: 24,
//     justifyContent: 'center',
//   },
//   header: {
//     alignItems: 'center',
//     marginBottom: 40,
//   },
//   appName: {
//     fontSize: 36,
//     fontWeight: 'bold',
//     color: '#4F46E5',
//     marginBottom: 12,
//   },
//   title: { 
//     fontSize: 20, 
//     fontWeight: '600',
//     color: '#333',
//   },
//   form: {
//     width: '100%',
//   },
//   loader: {
//     marginVertical: 20,
//   },
//   footer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 24,
//   },
//   footerText: {
//     fontSize: 14,
//     color: '#666',
//   },
//   link: {
//     fontSize: 14,
//     color: '#4F46E5',
//     fontWeight: '600',
//   },
// });