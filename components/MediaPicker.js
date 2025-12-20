import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export const MediaPicker = {
  // Gallery picker supports mixed media
  async pickFromGallery(onMediaPicked, currentMedia = [], maxTotal = 5) {
    if (currentMedia.length >= maxTotal) {
      Alert.alert('Limit Reached', `Maximum ${maxTotal} media items allowed`);
      return;
    }

    Alert.alert(
      'Select Media Type',
      'Choose what you want to upload',
      [
        {
          text: 'Photos',
          onPress: async () => {
            const remaining = maxTotal - currentMedia.length;
            
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
              allowsMultipleSelection: remaining > 1, 
              selectionLimit: remaining > 1 ? remaining : undefined,
              allowsEditing: remaining === 1,
            });
            
            if (!result.canceled) {
              const newMedia = result.assets.map(asset => ({ 
                uri: asset.uri, 
                type: 'photo' 
              }));
              onMediaPicked(newMedia);
            }
          },
        },
        {
          text: 'Video',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['videos'],
              allowsEditing: true,
              quality: 0.8,
              videoMaxDuration: 20,
            });
            
            if (!result.canceled) {
              const videoAsset = result.assets[0];
              if (videoAsset.duration && videoAsset.duration > 20000) {
                Alert.alert('Video Too Long', 'Please select a video under 20 seconds');
                return;
              }
              
              onMediaPicked([{ uri: videoAsset.uri, type: 'video' }]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  },

  // Camera picker supports mixed media
  async pickFromCamera(onMediaPicked, currentMedia = [], maxTotal = 5) {
    if (currentMedia.length >= maxTotal) {
      Alert.alert('Limit Reached', `Maximum ${maxTotal} media items allowed`);
      return;
    }

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Needed', 'Camera permission is required');
      return;
    }

    Alert.alert(
      'Camera Options',
      'Choose what you want to capture',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            
            if (!result.canceled) {
              onMediaPicked([{ uri: result.assets[0].uri, type: 'photo' }]);
            }
          },
        },
        {
          text: 'Record Video',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['videos'],
              allowsEditing: true,
              quality: 0.8,
              videoMaxDuration: 20,
            });
            
            if (!result.canceled) {
              onMediaPicked([{ uri: result.assets[0].uri, type: 'video' }]);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  },
};