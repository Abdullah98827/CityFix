import { Stack } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "../backend/firebase";
import { registerForPushNotificationsAsync } from "../utils/notifications";

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        //If the user is signed in it will register for push notifications
        registerForPushNotificationsAsync();
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(citizen)" />
      <Stack.Screen name="(dispatcher)" />
      <Stack.Screen name="(engineer)" />
      <Stack.Screen name="(qa)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}
