import { Stack } from 'expo-router';

export default function EngineerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="job-detail/[id]" />
    </Stack>
  );
}