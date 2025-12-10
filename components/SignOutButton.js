// components/SignOutButton.js
import { signOut } from 'firebase/auth';
import { Alert } from 'react-native';
import { auth } from '../backend/firebase';
import CustomButton from './CustomButton';

export default function SignOutButton({ onBeforeSignOut }) {
  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes", 
          onPress: async () => {
            // Step 1: Clean up any listeners BEFORE signing out
            // This prevents permission errors
            if (onBeforeSignOut) {
              onBeforeSignOut();
            }
            
            // Step 2: Now sign the user out
            await signOut(auth);
          }
        }
      ]
    );
  };

  return (
    <CustomButton
      title="Sign Out"
      onPress={handleSignOut}
      variant="danger"
    />
  );
}