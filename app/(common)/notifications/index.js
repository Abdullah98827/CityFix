import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../../backend/firebase';
import ReportHeader from '../../../components/ReportHeader';

export default function NotificationsScreen({ onUnreadCountChange }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('citizen');

  // Fetch user role once
  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchRole = async () => {
      const userDoc = await getDoc(doc(db, 'UserMD', auth.currentUser.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role || 'citizen');
      }
    };

    fetchRole();
  }, []);

  // Fetch notifications + count unread
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'UserMD', auth.currentUser.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = [];
      let unread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({ id: doc.id, ...data });
        if (!data.read) unread++;
      });
      setNotifications(notifs);
      setLoading(false);
      if (onUnreadCountChange) onUnreadCountChange(unread);
    });

    return unsubscribe;
  }, [onUnreadCountChange]);

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    await updateDoc(doc(db, 'UserMD', auth.currentUser.uid, 'notifications', notificationId), {
      read: true,
    });
  };

  const handleNotificationPress = async (item) => {
    if (item.reportId) {
      // Mark as read only if it wasn't already
      if (!item.read) {
        await markAsRead(item.id);
      }

      // Navigate based on role
      if (userRole === 'citizen') {
        router.push(`/(citizen)/report-detail/${item.reportId}`);
      } else if (userRole === 'dispatcher') {
        router.push(`/(dispatcher)/report-detail/${item.reportId}`);
      } else if (userRole === 'engineer') {
        router.push(`/(engineer)/job-detail/${item.reportId}`);
      } else if (userRole === 'qa') {
        router.push(`/(qa)/verify/${item.reportId}`);
      } else {
        router.push(`/(citizen)/report-detail/${item.reportId}`);
      }
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.item, item.read && styles.readItem]}
      onPress={() => handleNotificationPress(item)}
    >
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.timestamp}>
        {item.createdAt?.toDate?.().toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) || 'Just now'}
      </Text>
    </TouchableOpacity>
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
      <ReportHeader title="Notifications" showBack={true} />

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            You`ll see updates here when reports are assigned, resolved, or verified.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  item: {
    backgroundColor: '#f8fafc',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  readItem: {
    backgroundColor: '#ffffff',
    opacity: 0.8,
  },
  message: {
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 6,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});