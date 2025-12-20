import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  ScrollView,
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
import { MediaPicker } from '../../components/MediaPicker';
import ReportHeader from '../../components/ReportHeader';

export default function ReportIssue() {
  const router = useRouter();
  const { draftId } = useLocalSearchParams();
  const searchTimeout = useRef(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [media, setMedia] = useState([]);
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

  // Loads categories from ConfigMD
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const docRef = doc(db, 'ConfigMD', 'categories');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().list) {
          setCategories(docSnap.data().list);
        } else {
          setCategories(['Pothole', 'Streetlight', 'Missed Bin', 'Flooding', 'Graffiti', 'Other']);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories(['Pothole', 'Streetlight', 'Missed Bin', 'Flooding', 'Graffiti', 'Other']);
      }
    };

    fetchCategories();
  }, []);

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
          const loadedMedia = [];
          if (data.photos && Array.isArray(data.photos)) {
            data.photos.forEach(uri => loadedMedia.push({ uri, type: 'photo' }));
          }
          if (data.videos && Array.isArray(data.videos)) {
            data.videos.forEach(uri => loadedMedia.push({ uri, type: 'video' }));
          } else if (data.video) {
            loadedMedia.push({ uri: data.video, type: 'video' });
          }
          setMedia(loadedMedia);
          setAddress(data.address || '');
          setSearchText(data.address || '');
          if (data.location) {
            setLocation({ latitude: data.location.latitude, longitude: data.location.longitude });
          }
        }
      } catch (error) {
        console.error('Load draft error:', error);
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
      if (status !== 'granted') {
        setAddress('Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      updateAddress(loc.coords.latitude, loc.coords.longitude);
    };
    getCurrentLocation();
  }, [draftId]);

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

  const handleGalleryPick = async () => {
    await MediaPicker.pickFromGallery(
      (newMedia) => setMedia([...media, ...newMedia]),
      media,
      5
    );
  };

  const handleCameraPick = async () => {
    await MediaPicker.pickFromCamera(
      (newMedia) => setMedia([...media, ...newMedia]),
      media,
      5
    );
  };

  const removeMedia = (index) => setMedia(media.filter((_, i) => i !== index));

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
      const photos = media.filter(m => m.type === 'photo').map(m => m.uri);
      const videos = media.filter(m => m.type === 'video').map(m => m.uri);
      const draftData = {
        title: title.trim(),
        description: description.trim(),
        category,
        photos,
        videos,
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
    } catch (error) {
      console.error('Save draft error:', error);
      setMessage('Failed to save draft');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setMessage('');
    setIsError(false);
    if (!title || !description || !category || !location || media.length === 0) {
      setMessage('Please complete all fields and add media');
      setIsError(true);
      return;
    }
    setLoading(true);
    try {
      const photoUris = media.filter(m => m.type === 'photo').map(m => m.uri);
      const videoUris = media.filter(m => m.type === 'video').map(m => m.uri);

      const uploadedPhotoUrls = [];
      for (let uri of photoUris) {
        const fileName = `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = ref(storage, `images/${auth.currentUser.uid}/${fileName}`);
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        uploadedPhotoUrls.push(url);
      }

      const uploadedVideoUrls = [];
      for (let uri of videoUris) {
        const fileName = `video_${Date.now()}.mp4`;
        const storageRef = ref(storage, `videos/${auth.currentUser.uid}/${fileName}`);
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        uploadedVideoUrls.push(url);
      }

      const reportData = {
        title: title.trim(),
        description: description.trim(),
        category,
        photoUrls: uploadedPhotoUrls,
        videoUrls: uploadedVideoUrls,
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

  return (
    <View style={styles.wrapper}>
      <ReportHeader title={isEditMode ? 'Edit Draft' : 'Report Issue'} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.form}>
          <CustomInput label="Title" placeholder="e.g. Large pothole" value={title} onChangeText={setTitle} />
          <CustomInput label="Description" placeholder="Describe..." value={description} onChangeText={setDescription} multiline numberOfLines={4} />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryCard, category === cat && styles.categorySelected]}
                onPress={() => setCategory(cat)}
              >
                <Text style={styles.categoryLabel}>{cat}</Text>
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
          <Text style={styles.helperText}>Add any mix of photos & videos (5 items max)</Text>

          <View style={styles.photoButtons}>
            <CustomButton title="Gallery" onPress={handleGalleryPick} variant="secondary" />
            <CustomButton title="Camera" onPress={handleCameraPick} variant="secondary" />
          </View>

          {media.length > 0 && (
            <View style={styles.photoGrid}>
              {media.map((item, i) => (
                <MediaItem
                  key={i}
                  item={item}
                  index={i}
                  onRemove={removeMedia}
                />
              ))}
            </View>
          )}
          {media.length > 0 && <Text style={styles.photoCount}>{media.length} / 5 media items</Text>}

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
      </ScrollView>
    </View>
  );
}

// Media item preview
function MediaItem({ item, index, onRemove }) {
  return (
    <View style={styles.photoBox}>
      {item.type === 'photo' ? (
        <Image source={{ uri: item.uri }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
          <Text style={{ color: '#fff', fontSize: 32 }}>▶</Text>
          <Text style={{ color: '#fff', fontSize: 12 }}>VIDEO</Text>
        </View>
      )}
      <TouchableOpacity style={styles.remove} onPress={() => onRemove(index)}>
        <Text style={styles.removeText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
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
  mediaBtn: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mediaBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
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