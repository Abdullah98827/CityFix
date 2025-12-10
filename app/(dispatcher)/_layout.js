import { Stack } from 'expo-router';

export default function DispatcherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="report-detail/[id]" />
    </Stack>
  );
}