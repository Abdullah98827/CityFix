// app/(admin)/home.js — Updated with proper cleanup
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../backend/firebase';
import CustomButton from '../../components/CustomButton';
import SignOutButton from '../../components/SignOutButton';

export default function AdminHome() {
  const router = useRouter(); // Add router for navigation
  
  // State for storing user data from Firestore
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // useRef stores the unsubscribe function so we can call it later
  // This persists across re-renders without causing re-renders
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Set up real-time listener to Firestore
    const unsubscribe = onSnapshot(collection(db, 'UserMD'), (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setUsers(list);
      setLoading(false);
    });
    
    // Store the unsubscribe function in the ref
    // We'll use this to clean up before signing out
    unsubscribeRef.current = unsubscribe;
    
    // Cleanup function - runs when component unmounts
    return () => unsubscribe();
  }, []);

  const openModal = (user) => {
    // Prevent changing admin roles
    if (user.role === 'admin') {
      Alert.alert("Blocked", "Admins cannot be changed");
      return;
    }
    setSelectedUser(user);
    setModalVisible(true);
  };

  const changeRole = async (role) => {
    // Update the user's role in Firestore
    await updateDoc(doc(db, 'UserMD', selectedUser.id), { role });
    setModalVisible(false);
    Alert.alert("Success", "Role updated!");
  };

  // This function cleans up the Firestore listener AND navigates to login
  // It gets called by SignOutButton BEFORE signing out
  const handleCleanupBeforeSignOut = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current(); // Stop listening to Firestore
      unsubscribeRef.current = null; // Clear the reference
    }
    // Navigate to login page after cleanup
    router.replace('/(auth)/login');
  };

  const UserRow = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name || 'No name'}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleText}>{item.role || 'citizen'}</Text>
        </View>
      </View>

      {item.role !== 'admin' && (
        <CustomButton
          title="Change Role"
          onPress={() => openModal(item)}
          variant="secondary"
        />
      )}
    </View>
  );

  // Show loading spinner while fetching data
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
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>{users.length} users</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={UserRow}
        contentContainerStyle={styles.list}
      />

      <View style={styles.footer}>
        {/* Pass the cleanup function to SignOutButton */}
        <SignOutButton onBeforeSignOut={handleCleanupBeforeSignOut} />
      </View>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Change Role</Text>
            <Text style={styles.modalUser}>{selectedUser?.name || selectedUser?.email}</Text>

            {['citizen', 'dispatcher', 'engineer', 'qa'].map((role) => (
              <TouchableOpacity
                key={role}
                style={styles.roleOption}
                onPress={() => changeRole(role)}
              >
                <Text style={styles.roleOptionText}>{role.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#4F46E5',
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  title: { fontSize: 34, fontWeight: '900', color: '#fff' },
  subtitle: { fontSize: 16, color: '#e0e7ff', marginTop: 8 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e7ff',
    marginRight: 20,
  },
  info: { flex: 1 },
  name: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  email: { fontSize: 15, color: '#64748b', marginTop: 4 },
  roleTag: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 14 },
  footer: { padding: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  modalUser: { fontSize: 20, color: '#4F46E5', marginBottom: 32 },
  roleOption: {
    backgroundColor: '#f8fafc',
    paddingVertical: 18,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  roleOptionText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#4F46E5',
  },
  cancelBtn: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#ef4444',
    borderRadius: 16,
  },
  cancelText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});