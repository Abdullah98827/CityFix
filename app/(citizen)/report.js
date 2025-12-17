// app/(citizen)/report.js — WITH EXPO-VIDEO (Modern & Recommended)
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { auth, db, storage } from '../../backend/firebase';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import FormMessage from '../../components/FormMessage';

export default function ReportIssue() {
  const router = useRouter();
  const { draftId } = useLocalSearchParams();
  const searchTimeout = useRef(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('Getting your location...');
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userName, setUserName] = useState('Citizen');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!draftId);
  const isEditMode = !!draftId;

  // Create video player for preview
  const player = useVideoPlayer(video, (player) => {
    player.loop = false;
    player.pause();
  });

  useEffect(() => {
    const getUserName = async () => {
      if (!auth.currentUser) return;
      const snap = await getDoc(doc(db, 'UserMD', auth.currentUser.uid));
      if (snap.exists()) setUserName(snap.data().name || 'Citizen');
    };
    getUserName();
  }, []);

  useEffect(() => {
    if (!draftId) return;
    const loadDraft = async () => {
      try {
        const draftDoc = await getDoc(doc(db, 'reports', draftId));
        if (draftDoc.exists()) {
          const data = draftDoc.data();
          setTitle(data.title || '');
          setDescription(data.description || '');
          setCategory(data.category || '');
          setPhotos(data.photos || []);
          setVideo(data.video || null);
          setAddress(data.address || '');
          setSearchText(data.address || '');
          if (data.location) {
            setLocation({ latitude: data.location.latitude, longitude: data.location.longitude });
          }
        }
      } catch {
        setMessage('Failed to load draft');
        setIsError(true);
      } finally {
        setInitialLoading(false);
      }
    };
    loadDraft();
  }, [draftId]);

  useEffect(() => {
    if (draftId) return;
    const getCurrentLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      updateAddress(loc.coords.latitude, loc.coords.longitude);
    };
    getCurrentLocation();
  }, [draftId]);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const updateAddress = async (lat, lng) => {
    try {
      const [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const addr = `${result.street || ''}, ${result.city || ''} ${result.postalCode || ''}`.trim() || 'Unknown address';
      setAddress(addr);
      setSearchText(addr);
    } catch {
      setAddress('Address not found');
    }
  };

  const searchPlaces = async (text) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&language=en`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.predictions) {
        setSuggestions(data.predictions.slice(0, 5));
        setShowSuggestions(true);
      }
    } catch {
      setSuggestions([]);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlaces(text), 500);
  };

  const selectPlace = async (placeId, description) => {
    setSearchText(description);
    setShowSuggestions(false);
    setSuggestions([]);
    Keyboard.dismiss();
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        setLocation({ latitude: lat, longitude: lng });
        setAddress(description);
      }
    } catch {
      setMessage('Failed to get location');
      setIsError(true);
    }
  };

  const categories = [
    { id: 'pothole', label: 'Pothole' },
    { id: 'streetlight', label: 'Streetlight' },
    { id: 'waste', label: 'Missed Bin' },
    { id: 'flooding', label: 'Flooding' },
    { id: 'graffiti', label: 'Graffiti' },
    { id: 'other', label: 'Other' },
  ];

  const pickImage = async () => {
    if (photos.length >= 5) {
      setMessage('Maximum 5 photos');
      setIsError(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setPhotos([...photos, result.assets[0].uri]);
  };

  const takePhoto = async () => {
    if (photos.length >= 5) {
      setMessage('Maximum 5 photos');
      setIsError(true);
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setMessage('Camera permission needed');
      setIsError(true);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setPhotos([...photos, result.assets[0].uri]);
  };

  const pickVideo = async () => {
    try {
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
        if (photos.length > 0) {
          Alert.alert('Switch to Video?', 'This will remove your photos. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => {
                setPhotos([]);
                setVideo(videoAsset.uri);
              },
            },
          ]);
        } else {
          setVideo(videoAsset.uri);
        }
      }
    } catch {
      setMessage('Failed to pick video');
      setIsError(true);
    }
  };

  const recordVideo = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setMessage('Camera permission needed');
        setIsError(true);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 20,
      });
      if (!result.canceled) {
        const videoAsset = result.assets[0];
        if (photos.length > 0) {
          Alert.alert('Switch to Video?', 'This will remove your photos. Continue?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => {
                setPhotos([]);
                setVideo(videoAsset.uri);
              },
            },
          ]);
        } else {
          setVideo(videoAsset.uri);
        }
      }
    } catch {
      setMessage('Failed to record video');
      setIsError(true);
    }
  };

  const removePhoto = (i) => setPhotos(photos.filter((_, index) => index !== i));
  const removeVideo = () => setVideo(null);

  const handleSaveDraft = async () => {
    setMessage('');
    setIsError(false);
    if (!title.trim()) {
      setMessage('Please add a title');
      setIsError(true);
      return;
    }
    setLoading(true);
    try {
      const draftData = {
        title: title.trim(),
        description: description.trim(),
        category,
        photos,
        video,
        location,
        address,
        userId: auth.currentUser.uid,
        userName,
        status: 'draft',
        isDraft: true,
        updatedAt: serverTimestamp(),
      };
      if (isEditMode) {
        await updateDoc(doc(db, 'reports', draftId), draftData);
        setMessage('Draft updated!');
      } else {
        draftData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'reports'), draftData);
        setMessage('Draft saved!');
      }
      setIsError(false);
      setTimeout(() => router.back(), 1500);
    } catch {
      setMessage('Failed to save draft');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setMessage('');
    setIsError(false);
    if (!title || !description || !category || !location || (photos.length === 0 && !video)) {
      setMessage('Please complete all fields and add media');
      setIsError(true);
      return;
    }

    setLoading(true);

    try {
      // Upload photos
      const uploadedPhotoUrls = [];
      for (let uri of photos) {
        const fileName = `photo_${Date.now()}.jpg`;
        const storageRef = ref(storage, `images/${auth.currentUser.uid}/${fileName}`);
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        uploadedPhotoUrls.push(url);
      }

      // Upload video (if present)
      let uploadedVideoUrl = null;
      if (video) {
        const fileName = `video_${Date.now()}.mp4`;
        const storageRef = ref(storage, `videos/${auth.currentUser.uid}/${fileName}`);
        const response = await fetch(video);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        uploadedVideoUrl = await getDownloadURL(storageRef);
      }

      const reportData = {
        title: title.trim(),
        description: description.trim(),
        category,
        photoUrls: uploadedPhotoUrls,
        videoUrl: uploadedVideoUrl,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        address,
        userId: auth.currentUser.uid,
        userName,
        status: 'submitted',
        isDraft: false,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (isEditMode) {
        await updateDoc(doc(db, 'reports', draftId), reportData);
        setMessage('Report submitted!');
      } else {
        reportData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'reports'), reportData);
        setMessage('Report submitted!');
      }

      setIsError(false);
      setTimeout(() => router.back(), 1500);
    } catch (error) {
      console.error('Submit error:', error);
      setMessage('Failed to submit report');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading draft...</Text>
      </View>
    );
  }

  const renderContent = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{isEditMode ? 'Edit Draft' : 'Report an Issue'}</Text>
        {isEditMode && <Text style={styles.subtitle}>You`re editing a draft</Text>}
      </View>
      <View style={styles.form}>
        <CustomInput label="Title" placeholder="e.g. Large pothole" value={title} onChangeText={setTitle} />
        <CustomInput label="Description" placeholder="Describe..." value={description} onChangeText={setDescription} multiline numberOfLines={4} />
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, category === cat.id && styles.categorySelected]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Location</Text>
        <View style={styles.searchContainer}>
          <CustomInput
            style={styles.searchInput}
            placeholder="Search street, postcode or place..."
            value={searchText}
            onChangeText={handleSearchChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.suggestionItem}
                  onPress={() => selectPlace(item.place_id, item.description)}
                >
                  <Text style={styles.suggestionText}>{item.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={styles.mapWrapper}>
          <MapView
            style={styles.map}
            region={{
              latitude: location?.latitude || 52.2405,
              longitude: location?.longitude || -0.9027,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }}
            showsUserLocation
            showsMyLocationButton
            followsUserLocation
            loadingEnabled
          >
            {location && (
              <Marker
                draggable
                pinColor="#EF4444"
                coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                onDragEnd={(e) => {
                  const coord = e.nativeEvent.coordinate;
                  setLocation(coord);
                  updateAddress(coord.latitude, coord.longitude);
                }}
              />
            )}
          </MapView>
          <View style={styles.mapOverlay}>
            <Text style={styles.overlayText}>Drag pin to adjust</Text>
          </View>
        </View>
        <Text style={styles.addressText}>{address}</Text>
        <Text style={styles.label}>Evidence (Required)</Text>
        <Text style={styles.helperText}>Upload photos (1-5) OR one video (max 20 sec)</Text>
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <Text style={styles.photoBtnText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            <Text style={styles.photoBtnText}>Camera</Text>
          </TouchableOpacity>
        </View>
        {photos.length === 0 && !video && (
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.videoBtn} onPress={pickVideo}>
              <Text style={styles.videoBtnText}>Video Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.videoBtn} onPress={recordVideo}>
              <Text style={styles.videoBtnText}>Record Video</Text>
            </TouchableOpacity>
          </View>
        )}
        {photos.length > 0 && (
          <View style={styles.photoGrid}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoBox}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity style={styles.remove} onPress={() => removePhoto(i)}>
                  <Text style={styles.removeText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* VIDEO GRID - USING EXPO-VIDEO (MODERN) */}
        {video && (
          <View style={styles.photoGrid}>
            <View style={styles.photoBox}>
              <VideoView
                player={player}
                style={styles.photo}
                fullscreenOptions
                allowsPictureInPicture
                contentFit="cover"
              />
              <TouchableOpacity style={styles.remove} onPress={removeVideo}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {photos.length > 0 && <Text style={styles.photoCount}>{photos.length} / 5 photos</Text>}
        {video && <Text style={styles.photoCount}>1 video (max 20 sec)</Text>}
        <FormMessage message={message} isError={isError} />
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
        ) : (
          <>
            <CustomButton title={isEditMode ? 'Update Draft' : 'Save as Draft'} onPress={handleSaveDraft} variant="primary" />
            <View style={{ marginTop: 10 }}>
              <CustomButton title="Submit Report" onPress={handleSubmit} variant="secondary" />
            </View>
            <View style={{ marginTop: 10 }}>
              <CustomButton title="Cancel" onPress={() => router.back()} variant="danger" />
            </View>
          </>
        )}
      </View>
    </>
  );

  return (
    <FlatList
      data={[{ key: 'content' }]}
      renderItem={renderContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#4F46E5', marginTop: 4, fontWeight: '600' },
  form: { padding: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 24, marginBottom: 8 },
  helperText: { fontSize: 13, color: '#666', marginBottom: 12, fontStyle: 'italic' },
  searchContainer: { position: 'relative', zIndex: 10, marginBottom: 16 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  suggestionsBox: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  suggestionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  suggestionText: { fontSize: 15, color: '#333' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  categoryCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ddd',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  categorySelected: { borderColor: '#4F46E5', backgroundColor: '#F5F3FF' },
  categoryLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  mapWrapper: {
    height: 380,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  map: { width: '100%', height: '100%' },
  mapOverlay: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
  overlayText: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '600',
  },
  addressText: { fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
  photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  photoBtn: { flex: 1, backgroundColor: '#2563EB', padding: 14, borderRadius: 12, alignItems: 'center' },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  videoBtn: { flex: 1, backgroundColor: '#8B5CF6', padding: 14, borderRadius: 12, alignItems: 'center' },
  videoBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  photoBox: { width: '30%', aspectRatio: 1, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: 12 },
  remove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  photoCount: { textAlign: 'center', marginVertical: 10, color: '#666', fontSize: 15 },
});