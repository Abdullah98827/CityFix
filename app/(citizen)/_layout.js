import { Stack } from 'expo-router';

export default function CitizenLayout() {
  return (
    <Stack>
      <Stack.Screen name="home" options={{ title: 'CityFix Home' }} />
      <Stack.Screen name="report" options={{ title: 'Report Issue' }} />
    </Stack>
  );
}