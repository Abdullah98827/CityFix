import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { auth, db } from "../../backend/firebase";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import FormMessage from "../../components/FormMessage";

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleRegister = async () => {
    setMessage("");
    setIsError(false);

    if (!name || !email || !password) {
      setMessage("Please fill in all fields");
      setIsError(true);
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters");
      setIsError(true);
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await setDoc(doc(db, "UserMD", user.uid), {
        name: name.trim(),
        email: user.email,
        role: "citizen",
        createdAt: serverTimestamp(),
      });

      router.replace("/(auth)/login");
    } catch (error) {
      setIsError(true);
      if (error.code === "auth/email-already-in-use") {
        setMessage("This email is already registered");
      } else if (error.code === "auth/invalid-email") {
        setMessage("Please enter a valid email address");
      } else if (error.code === "auth/weak-password") {
        setMessage("Password is too weak (minimum 6 characters)");
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    } finally {
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

        <FormMessage message={message} isError={isError} />

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
        ) : (
          <CustomButton title="Create Account" onPress={handleRegister} variant="secondary" />
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
  header: { alignItems: "center", marginBottom: 40 },
  appName: { fontSize: 36, fontWeight: "bold", color: "#4F46E5", marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "600", color: "#333" },
  form: { width: "100%" },
  footerText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
    color: "#666",
  },
  link: { color: "#4F46E5", fontWeight: "600" },
});