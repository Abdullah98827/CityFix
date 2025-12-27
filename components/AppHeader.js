import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../backend/firebase';
import { logAction } from '../utils/logger';

export default function AppHeader({
  title = 'CityFix',
  showSignOut = true,
  showNotifications = true,
  unreadCount = 0,
  onNotificationsPress,
}) {
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            // Log logout before signing out
            logAction('user_logged_out', auth.currentUser?.uid || 'unknown');

            await signOut(auth);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleNotificationsPress = () => {
    if (onNotificationsPress) {
      onNotificationsPress();
    } else {
      router.push('/(common)/notifications');
    }
  };

  return (
    <View style={styles.header}>
      {/* Title on the far left */}
      <Text style={styles.title}>{title}</Text>
      {/* Right icons */}
      <View style={styles.rightContainer}>
        {showNotifications && (
          <TouchableOpacity style={styles.iconBtn} onPress={handleNotificationsPress}>
            <Ionicons name="notifications-outline" size={26} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {showSignOut && (
          <TouchableOpacity style={styles.iconBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#4F46E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'left',
  },
  rightContainer: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: 4,
    top: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});