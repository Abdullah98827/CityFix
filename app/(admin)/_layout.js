import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { auth } from '../../backend/firebase';

export default function AdminLayout() {
  const router = useRouter();

  // Redirect non-admins away from admin tab
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
    } else {
      router.replace('/(auth)/login');
    }
  }, []);

  return (
    <Stack>
      <Stack.Screen
        name="home"
        options={{
          title: 'Admin Panel',
          headerShown: true,
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}