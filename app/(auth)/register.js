import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../../backend/firebase";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);

    // Basic validation using if/else and alerts
    if (!name) {
      Alert.alert("Missing Name", "Please enter your full name");
      setLoading(false);
      return;
    }

    if (!email) {
      Alert.alert("Missing Email", "Please enter your email address");
      setLoading(false);
      return;
    }

    if (!password) {
      Alert.alert("Missing Password", "Please enter a password");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    // Try to create the user
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

    if (!userCredential || !userCredential.user) {
      Alert.alert("Registration Failed", "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const user = userCredential.user;

    // Save user data to Firestore
    await setDoc(doc(db, "UserMD", user.uid), {
      name: name.trim(),
      email: user.email,
      role: "citizen",
      isDisabled: false,
      createdAt: serverTimestamp(),
    });

    // Success – go to login
    router.replace("/(auth)/login");
    setLoading(false);
  };

  // Safe wrapper to catch Firebase errors
  const safeHandleRegister = async () => {
    try {
      await handleRegister();
    } catch (error) {
      let errorMessage = "Something went wrong. Please try again.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak (minimum 6 characters)";
      }

      Alert.alert("Registration Failed", errorMessage);
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appName}>CityFix</Text>
        <Text style={styles.title}>Create your account</Text>
      </View>

      <View style={styles.form}>
        <CustomInput
          label="Full Name"
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />
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
          placeholder="Minimum 6 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
        ) : (
          <CustomButton title="Create Account" onPress={safeHandleRegister} variant="secondary" />
        )}

        <Text style={styles.footerText}>
          Already have an account?{" "}
          <Text style={styles.link} onPress={() => router.push("/(auth)/login")}>
            Sign in
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
    marginBottom: 40,
  },
  appName: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#4F46E5",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  form: {
    width: "100%",
  },
  footerText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
    color: "#666",
  },
  link: {
    color: "#4F46E5",
    fontWeight: "600",
  },
});