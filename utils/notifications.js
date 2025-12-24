import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../backend/firebase';

// Sets up how notifications show up when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show the alert popup
    shouldPlaySound: true, // Play a sound
    shouldSetBadge: false, // No badge on app icon
  }),
});

// Main function to register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;

  // Checks if the user is on a real phone, and not a simulator
  if (!Device.isDevice) {
    return;
  }

  // Gets the current permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If not allowed yet, asks the user
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // If still not allowed, stop here
  if (finalStatus !== 'granted') {
    return;
  }

  // Grab the project ID from app.json
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId;

  // If no project ID, something's wrong with config
  if (!projectId) {
    return;
  }

  // Gets the actual push token from Expo
  const response = await Notifications.getExpoPushTokenAsync({ projectId });
  if (response && response.data) {
    token = response.data;
  } else {
    return;
  }

  // If the user is logged in, saves the token to their Firestore doc
  if (auth.currentUser) {
    const userRef = doc(db, 'UserMD', auth.currentUser.uid);
    await setDoc(userRef, { expoPushToken: token }, { merge: true });
  }

  return token;
}