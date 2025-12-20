import { Stack, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { auth, db } from '../../backend/firebase';

export default function AdminLayout() {
  const router = useRouter();

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    const checkRole = async () => {
      const userDoc = await getDoc(doc(db, 'UserMD', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role !== 'admin') {
          router.replace('/(citizen)/home');
        }
      } else {
        router.replace('/(auth)/login');
      }
    };

    checkRole();
  }, [router]);

  return (
    <Stack>
      <Stack.Screen name="home" options={{ headerShown: false }} />
      <Stack.Screen name="categories" options={{ headerShown: false }}/>
    </Stack>
  );
}