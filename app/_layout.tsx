import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(citizen)" />
      <Stack.Screen name="(dispatcher)" />
      <Stack.Screen name="(engineer)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}
