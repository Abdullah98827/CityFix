import { Stack } from 'expo-router';

export default function CitizenLayout() {
  return (
    <Stack>
      <Stack.Screen name="home" options={{headerShown: false} } />
      <Stack.Screen name="report" options={{headerShown: false }} />
      <Stack.Screen name="my-reports" options={{ headerShown: false }}/>
      <Stack.Screen name="map" options={{ headerShown: false }}/>
      <Stack.Screen name="report-detail/[id]" options={{ headerShown: false }}/>
    </Stack>
  );
}