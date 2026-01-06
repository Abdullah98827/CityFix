// app/(common)/settings.js
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db, storage } from '../../backend/firebase';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import ReportHeader from '../../components/ReportHeader';
import { logAction } from '../../utils/logger'; // <-- added import

export default function SettingsScreen() {
  const router = useRouter();

  const [userData, setUserData] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [photoURL, setPhotoURL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      if (!auth.currentUser) {
        router.replace('/(auth)/login');
        return;
      }

      const uid = auth.currentUser.uid;
      const userDoc = await getDoc(doc(db, 'UserMD', uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        setName(data.name || '');
        setEmail(auth.currentUser.email || '');
        setRole(data.role || 'citizen');
        setPhotoURL(data.photoURL || auth.currentUser.photoURL || null);
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  // Upload profile picture - ONLY PHOTOS
  const handlePhotoPick = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos');
      return;
    }

    // Pick image directly
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // ONLY IMAGES
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const photoUri = result.assets[0].uri;
    setUploadingPhoto(true);

    // Upload to Firebase Storage
    const fileName = `profile_${auth.currentUser.uid}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `profiles/${auth.currentUser.uid}/${fileName}`);

    const response = await fetch(photoUri);
    const blob = await response.blob();

    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg'
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Optional: track upload progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        console.error('Upload error:', error);
        Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
        setUploadingPhoto(false);
      },
      async () => {
        // Upload completed successfully
        const url = await getDownloadURL(uploadTask.snapshot.ref);

        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, { photoURL: url });

        // Update Firestore user document
        await updateDoc(doc(db, 'UserMD', auth.currentUser.uid), {
          photoURL: url
        });

        // Log profile picture update
        logAction('profile_picture_updated', null, 'User updated profile picture');

        setPhotoURL(url);
        setUploadingPhoto(false);
        Alert.alert('Success', 'Profile picture updated!');
      }
    );
  };

  // Save name
  const handleSaveName = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    const oldName = userData?.name || 'unknown';

    await updateDoc(doc(db, 'UserMD', auth.currentUser.uid), {
      name: name.trim()
    });

    // Log name change
    logAction('profile_name_changed', null, `Changed from "${oldName}" to "${name.trim()}"`);

    Alert.alert('Success', 'Name updated successfully!');
  };

  // Change password
  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword) {
      Alert.alert('Error', 'Current password is required');
      return;
    }
    if (!newPassword) {
      Alert.alert('Error', 'New password is required');
      return;
    }
    if (!confirmPassword) {
      Alert.alert('Error', 'Please confirm new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(
      auth.currentUser.email,
      currentPassword
    );
    const reauthResult = await reauthenticateWithCredential(auth.currentUser, credential);

    if (reauthResult.user) {
      // Update password
      const updateResult = await updatePassword(auth.currentUser, newPassword);
      if (updateResult === undefined) {
        Alert.alert('Success', 'Password changed successfully!');
        // Clear fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', 'Failed to change password. Please try again.');
      }
    } else {
      Alert.alert('Error', 'Current password is incorrect');
    }

    setChangingPassword(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <ReportHeader title="Settings" />
      <View style={styles.content}>
        {/* Profile Picture */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            onPress={handlePhotoPick}
            disabled={uploadingPhoto}
            activeOpacity={0.7}
          >
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoSubtext}>Tap to add</Text>
              </View>
            )}
          </TouchableOpacity>
          {uploadingPhoto && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#4F46E5" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
          <CustomButton
            title={photoURL ? "Change Photo" : "Add Photo"}
            onPress={handlePhotoPick}
            variant="secondary"
            disabled={uploadingPhoto}
            style={{ marginTop: 12 }}
          />
        </View>

        {/* User Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <CustomInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
          />
          <CustomButton
            title="Save Name"
            onPress={handleSaveName}
            variant="secondary"
          />
          <Text style={styles.infoLabel}>Email</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{email}</Text>
          </View>
          <Text style={styles.infoLabel}>Role</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </View>
        </View>

        {/* Change Password */}
        <View style={styles.passwordSection}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <CustomInput
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Enter current password"
          />
          <CustomInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Enter new password (min 6 characters)"
          />
          <CustomInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirm new password"
          />
          <CustomButton
            title={changingPassword ? "Updating..." : "Update Password"}
            onPress={handleChangePassword}
            variant="secondary"
            disabled={changingPassword}
          />
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <CustomButton
            title="Sign Out"
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                      await signOut(auth);
                      router.replace('/(auth)/login');
                    },
                  },
                ]
              );
            }}
            variant="danger"
          />
        </View>
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    padding: 24
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e7ff',
    borderWidth: 3,
    borderColor: '#4F46E5',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#a5b4fc',
  },
  photoSubtext: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 13,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  uploadingText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: 32,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  passwordSection: {
    marginBottom: 32,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutSection: {
    marginTop: 20,
    marginBottom: 20,
  },
});