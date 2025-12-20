import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../backend/firebase';
import CustomButton from '../../components/CustomButton';
import ReportHeader from '../../components/ReportHeader';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'ConfigMD', 'categories'));
        if (docSnap.exists()) {
          setCategories(docSnap.data().list || []);
        }
      } catch {
        Alert.alert('Error', 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const addCategory = async () => {
    if (!newCategory.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    const updated = [...categories, newCategory.trim()];
    try {
      await updateDoc(doc(db, 'ConfigMD', 'categories'), { list: updated });
      setCategories(updated);
      setNewCategory('');
      Alert.alert('Success', 'Category added');
    } catch {
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const removeCategory = async (index) => {
    Alert.alert(
      'Remove Category',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updated = categories.filter((_, i) => i !== index);
            try {
              await updateDoc(doc(db, 'ConfigMD', 'categories'), { list: updated });
              setCategories(updated);
              Alert.alert('Success', 'Category removed');
            } catch {
              Alert.alert('Error', 'Failed to remove');
            }
          },
        },
      ]
    );
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
      <ReportHeader title="Manage Categories" />

      <View style={styles.content}>
        <Text style={styles.title}>Current Categories ({categories.length})</Text>
        <FlatList
          data={categories}
          keyExtractor={(_, i) => i.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.item}>
              <Text style={styles.itemText}>{item}</Text>
              <TouchableOpacity onPress={() => removeCategory(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        />

        <Text style={styles.addTitle}>Add New Category</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. No Road Marking"
          value={newCategory}
          onChangeText={setNewCategory}
        />
        <CustomButton title="Add Category" onPress={addCategory} variant="secondary" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
  },
  itemText: { fontSize: 16, color: '#334155' },
  removeText: { color: '#ef4444', fontWeight: '600' },
  addTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginTop: 32, marginBottom: 12 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
});