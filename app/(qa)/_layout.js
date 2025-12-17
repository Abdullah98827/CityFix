// app/(qa)/_layout.js
import { Stack } from 'expo-router';

export default function QALayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="verify/[id]" />
    </Stack>
  );
}