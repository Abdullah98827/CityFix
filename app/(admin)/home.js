import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../backend/firebase';
import AppHeader from '../../components/AppHeader';

export default function AdminHome() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const unsubscribeUsersRef = useRef(null);
  const unsubscribeCategoriesRef = useRef(null);

  useEffect(() => {
    // Loads all the users
    const unsubscribeUsers = onSnapshot(collection(db, 'UserMD'), (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
      setUsers(list);
    });
    unsubscribeUsersRef.current = unsubscribeUsers;

    // Loads all the categories
    const unsubscribeCategories = onSnapshot(doc(db, 'ConfigMD', 'categories'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().list) {
        setCategories(docSnap.data().list);
      } else {
        setCategories(['Pothole', 'Streetlight', 'Missed Bin', 'Flooding', 'Graffiti', 'Other']);
      }
    });
    unsubscribeCategoriesRef.current = unsubscribeCategories;

    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeCategories();
    };
  }, [router]);

  const openUserOptions = (user) => {
    if (user.role === 'admin') {
      Alert.alert("Blocked", "Admins cannot be changed");
      return;
    }

    Alert.alert(
      `${user.name || user.email}`,
      "Choose an action",
      [
        {
          text: "Change Role",
          onPress: () => changeRole(user),
        },
        {
          text: user.isDisabled ? "Enable Account" : "Disable Account",
          style: user.isDisabled ? "default" : "destructive",
          onPress: () => toggleDisable(user),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const changeRole = (user) => {
    Alert.alert(
      "Change Role",
      `Select new role for ${user.name || user.email}`,
      [
        { text: "Citizen", onPress: () => updateRole(user.id, 'citizen') },
        { text: "Dispatcher", onPress: () => updateRole(user.id, 'dispatcher') },
        { text: "Engineer", onPress: () => updateRole(user.id, 'engineer') },
        { text: "QA", onPress: () => updateRole(user.id, 'qa') },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const updateRole = async (userId, role) => {
    await updateDoc(doc(db, 'UserMD', userId), { role });
    Alert.alert("Success", "Role updated");
  };

  const toggleDisable = async (user) => {
    await updateDoc(doc(db, 'UserMD', user.id), { isDisabled: !user.isDisabled });
    Alert.alert("Success", `Account ${user.isDisabled ? "enabled" : "disabled"}`);
  };

  const addCategory = async () => {
    Alert.prompt(
      "Add Category",
      "Enter new category name",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: async (text) => {
            if (text && text.trim()) {
              const newList = [...categories, text.trim()];
              await updateDoc(doc(db, 'ConfigMD', 'categories'), { list: newList });
              Alert.alert("Success", "Category added");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const removeCategory = (index) => {
    Alert.alert(
      "Remove Category",
      "Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const newList = categories.filter((_, i) => i !== index);
            await updateDoc(doc(db, 'ConfigMD', 'categories'), { list: newList });
            Alert.alert("Success", "Category removed");
          },
        },
      ]
    );
  };

  const UserRow = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name || 'No name'}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <View style={styles.tagRow}>
          <View style={styles.roleTag}>
            <Text style={styles.roleText}>{item.role || 'citizen'}</Text>
          </View>
          {item.isDisabled && (
            <View style={styles.disabledTag}>
              <Text style={styles.disabledText}>DISABLED</Text>
            </View>
          )}
        </View>
      </View>

      {item.role !== 'admin' && (
        <TouchableOpacity onPress={() => openUserOptions(item)} style={styles.dots}>
          <Text style={styles.dotsText}>⋮</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Admin Panel" showBack={false} showSignOut={true} />

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.tabActive]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>
              Users ({users.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
            onPress={() => setActiveTab('categories')}
          >
            <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
              Categories ({categories.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {activeTab === 'users' && (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={UserRow}
          contentContainerStyle={styles.list}
        />
      )}

      {activeTab === 'categories' && (
        <ScrollView contentContainerStyle={styles.categoriesContainer}>
          <View style={styles.categoriesHeader}>
            <Text style={styles.categoriesTitle}>Manage Categories</Text>
            <TouchableOpacity style={styles.addBtn} onPress={addCategory}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {categories.length === 0 ? (
            <Text style={styles.emptyText}>No categories</Text>
          ) : (
            categories.map((cat, index) => (
              <View key={index} style={styles.categoryItem}>
                <Text style={styles.categoryText}>{cat}</Text>
                <TouchableOpacity onPress={() => removeCategory(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  tabActive: {
    backgroundColor: '#4F46E5',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#fff',
  },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e7ff',
    marginRight: 16,
  },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  email: { fontSize: 14, color: '#64748b', marginTop: 4 },
  tagRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  roleTag: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 12 },
  disabledTag: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  disabledText: { color: '#991b1b', fontWeight: 'bold', fontSize: 12 },
  dots: {
    padding: 8,
  },
  dotsText: { fontSize: 24, color: '#64748b' },
  categoriesContainer: { padding: 16 },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoriesTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  addBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryText: { fontSize: 16, color: '#1e293b' },
  removeText: { color: '#dc2626', fontWeight: '600' },
  emptyText: { fontSize: 18, color: '#64748b', textAlign: 'center', marginTop: 40 },
});