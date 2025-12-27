import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import MediaGallery from '../../components/MediaGallery';
import { MediaPicker } from '../../components/MediaPicker';
import ReportHeader from '../../components/ReportHeader';
import { logAction } from '../../utils/logger'; // <-- added import

export default function ReportIssue() {
  const router = useRouter();
  const { draftId } = useLocalSearchParams();
  const searchTimeout = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [media, setMedia] = useState([]);
  const [location, setLocation] = useState({ latitude: 52.3555177, longitude: -1.1743197 });
  const [address, setAddress] = useState('Search for your location...');
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userName, setUserName] = useState('Citizen');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [initialLoading, setInitialLoading] = useState(!!draftId);
  const [categories, setCategories] = useState([]);

  const isEditMode = !!draftId;

  // Track active upload tasks for cancellation
  const activeUploadTasks = useRef([]);

  // Cancel all active uploads
  const cancelUpload = () => {
    activeUploadTasks.current.forEach(task => {
      if (task && typeof task.cancel === 'function') {
        task.cancel();
      }
    });
    activeUploadTasks.current = [];
    setLoading(false);
    setUploadProgress('');
    Alert.alert('Upload Cancelled', 'The upload has been cancelled.');
  };

  // Load categories from ConfigMD
  useEffect(() => {
    const fetchCategories = async () => {
      const docRef = doc(db, 'ConfigMD', 'categories');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists() && docSnap.data().list) {
        setCategories(docSnap.data().list);
      } else {
        setCategories(['Pothole', 'Streetlight', 'Missed Bin', 'Flooding', 'Graffiti', 'Other']);
      }
    };

    fetchCategories();
  }, []);

  // Get user's name for display
  useEffect(() => {
    const getUserName = async () => {
      if (!auth.currentUser) return;

      const snap = await getDoc(doc(db, 'UserMD', auth.currentUser.uid));
      if (snap.exists()) {
        setUserName(snap.data().name || 'Citizen');
      }
    };

    getUserName();
  }, []);

  // Load draft if editing
  useEffect(() => {
    if (!draftId) return;

    const loadDraft = async () => {
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
      } else {
        Alert.alert('Error', 'Failed to load draft');
      }

      setInitialLoading(false);
    };

    loadDraft();
  }, [draftId]);

  // Update address from coordinates
  const updateAddress = async (lat, lng) => {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });

    if (results && results.length > 0) {
      const result = results[0];
      const addr = `${result.street || ''}, ${result.city || ''} ${result.postalCode || ''}`.trim() || 'Unknown address';
      setAddress(addr);
      setSearchText(addr);
    } else {
      setAddress('Address not found');
    }
  };

  // Search for places using Google Places
  const searchPlaces = async (text) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      return;
    }

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&language=en`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.predictions) {
      setSuggestions(data.predictions.slice(0, 5));
      setShowSuggestions(true);
    } else {
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

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.result?.geometry?.location) {
      const { lat, lng } = data.result.geometry.location;
      setLocation({ latitude: lat, longitude: lng });
      setAddress(description);
    } else {
      Alert.alert('Location Error', 'Failed to get location details');
    }
  };

  // Media picker functions
  const handleGalleryPick = async () => {
    const videoCount = media.filter(m => m.type === 'video').length;
    if (videoCount >= 1) {
      Alert.alert('Video Limit', 'You can only upload 1 video. Remove the existing video first.');
      return;
    }

    await MediaPicker.pickFromGallery(
      (newMedia) => {
        const newVideoCount = newMedia.filter(m => m.type === 'video').length;
        if (videoCount + newVideoCount > 1) {
          Alert.alert('Video Limit', 'You can only upload 1 video maximum.');
          return;
        }
        setMedia([...media, ...newMedia]);
      },
      media,
      5
    );
  };

  const handleCameraPick = async () => {
    const videoCount = media.filter(m => m.type === 'video').length;
    if (videoCount >= 1) {
      Alert.alert('Video Limit', 'You can only upload 1 video. Remove the existing video first.');
      return;
    }

    await MediaPicker.pickFromCamera(
      (newMedia) => {
        const newVideoCount = newMedia.filter(m => m.type === 'video').length;
        if (videoCount + newVideoCount > 1) {
          Alert.alert('Video Limit', 'You can only upload 1 video maximum.');
          return;
        }
        setMedia([...media, ...newMedia]);
      },
      media,
      5
    );
  };

  const removeMedia = (index) => setMedia(media.filter((_, i) => i !== index));

  // Save as draft
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please add a title for your report');
      return;
    }

    setLoading(true);
    setUploadProgress('Saving draft...');

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
      isDeleted: false,
      updatedAt: serverTimestamp(),
    };

    let draftReportId;
    if (isEditMode) {
      await updateDoc(doc(db, 'reports', draftId), draftData);
      draftReportId = draftId;
    } else {
      draftData.createdAt = serverTimestamp();
      const docRef = await addDoc(collection(db, 'reports'), draftData);
      draftReportId = docRef.id;
    }

    // Log draft saved
    logAction('draft_saved', draftReportId, `Title: ${title.trim()}`);

    setLoading(false);
    setUploadProgress('');

    Alert.alert('Success', 'Draft saved successfully!', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  // Submit report with resilience and cancel support
  const handleSubmit = async () => {
    if (!title || !description || !category || !location || media.length === 0) {
      Alert.alert('Incomplete', 'Please complete all fields and add at least one photo or video');
      return;
    }

    setLoading(true);
    setUploadProgress('Preparing upload...');
    activeUploadTasks.current = [];

    const totalItems = media.length;
    let currentItem = 0;
    const uploadedPhotoUrls = [];
    const uploadedVideoUrls = [];

    for (let i = 0; i < media.length; i++) {
      const item = media[i];
      if (item.type !== 'photo' && item.type !== 'video') continue;

      currentItem++;
      setUploadProgress(`Uploading ${currentItem}/${totalItems}...`);

      const isVideo = item.type === 'video';
      const uri = item.uri;
      const fileName = isVideo
        ? `video_${Date.now()}_${i}.mp4`
        : `photo_${Date.now()}_${i}.jpg`;
      const folder = isVideo ? 'videos' : 'images';
      const storageRef = ref(storage, `${folder}/${auth.currentUser.uid}/${fileName}`);

      const response = await fetch(uri);
      const blob = await response.blob();

      if (isVideo) {
        const sizeInMB = (blob.size / 1024 / 1024).toFixed(2);
        if (blob.size > 15 * 1024 * 1024) {
          cancelUpload();
          Alert.alert('Video Too Large', `Video is ${sizeInMB}MB. Max 15MB (10-15 seconds).`);
          return;
        }
      }

      const uploadTask = uploadBytesResumable(storageRef, blob);

      activeUploadTasks.current.push(uploadTask);

      const snapshot = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => {
            const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setUploadProgress(`Uploading ${currentItem}/${totalItems} (${progress}%)`);
          },
          (error) => {
            // Ignore cancel error – don't reject
            if (error.code === 'storage/canceled') {
              resolve(null);
            } else {
              reject(error);
            }
          },
          () => resolve(uploadTask.snapshot)
        );
      });

      if (snapshot === null) {
        // Upload was cancelled – skip this item
        continue;
      }

      const url = await getDownloadURL(snapshot.ref);

      if (isVideo) {
        uploadedVideoUrls.push(url);
      } else {
        uploadedPhotoUrls.push(url);
      }
    }

    activeUploadTasks.current = [];

    setUploadProgress('Saving report...');

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
      isDeleted: false,
      submittedAt: serverTimestamp(),
    };

    let reportId;
    if (isEditMode) {
      await updateDoc(doc(db, 'reports', draftId), reportData);
      reportId = draftId;
    } else {
      reportData.createdAt = serverTimestamp();
      const docRef = await addDoc(collection(db, 'reports'), reportData);
      reportId = docRef.id;
    }

    // Log report submitted
    logAction('report_submitted', reportId, `Category: ${category}`);

    setLoading(false);
    setUploadProgress('');

    Alert.alert(
      'Success',
      'Your report has been submitted successfully!',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading draft...</Text>
      </View>
    );
  }

  const photosForDisplay = media.filter(m => m.type === 'photo').map(m => m.uri);
  const videosForDisplay = media.filter(m => m.type === 'video').map(m => m.uri);

  return (
    <View style={styles.wrapper}>
      <ReportHeader title={isEditMode ? 'Edit Draft' : 'Report Issue'} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.form}>
          <CustomInput
            label="Title"
            placeholder="e.g. Large pothole"
            value={title}
            onChangeText={setTitle}
          />
          <CustomInput
            label="Description"
            placeholder="Describe the issue in detail..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
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
              placeholder="Search for street, postcode or place..."
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
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              loadingEnabled
            >
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
            </MapView>
            <View style={styles.mapOverlay}>
              <Text style={styles.overlayText}>Drag pin to adjust location</Text>
            </View>
          </View>
          <Text style={styles.addressText}>{address}</Text>
          <Text style={styles.label}>Evidence (Required)</Text>
          <Text style={styles.helperText}>Max 1 video + 4 photos (5 items total)</Text>
          <Text style={styles.warningText}>Videos: 10-15 seconds max, under 15MB</Text>
          <View style={styles.photoButtons}>
            <CustomButton
              title="Gallery"
              onPress={handleGalleryPick}
              variant="secondary"
              disabled={loading}
            />
            <CustomButton
              title="Camera"
              onPress={handleCameraPick}
              variant="secondary"
              disabled={loading}
            />
          </View>
          {media.length > 0 && (
            <>
              <Text style={styles.mediaLabel}>Tap any item to view fullscreen</Text>
              <MediaGallery
                photos={photosForDisplay}
                videos={videosForDisplay}
                showRemove={true}
                onRemove={removeMedia}
              />
            </>
          )}
          {media.length > 0 && <Text style={styles.photoCount}>{media.length} / 5 media items</Text>}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.uploadProgressText}>{uploadProgress || 'Uploading...'}</Text>
              <Text style={styles.uploadHelpText}>Please do not close the app</Text>
              <CustomButton 
                title="Cancel Upload" 
                onPress={cancelUpload} 
                variant="danger" 
                style={{ marginTop: 20 }}
              />
            </View>
          ) : (
            <>
              <CustomButton
                title={isEditMode ? 'Update Draft' : 'Save as Draft'}
                onPress={handleSaveDraft}
                variant="primary"
              />
              <View style={{ marginTop: 10 }}>
                <CustomButton
                  title="Submit Report"
                  onPress={handleSubmit}
                  variant="secondary"
                />
              </View>
              <View style={{ marginTop: 10 }}>
                <CustomButton
                  title="Cancel"
                  onPress={() => router.back()}
                  variant="danger"
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  loadingContainer: { marginVertical: 30, alignItems: 'center' },
  uploadProgressText: { marginTop: 16, fontSize: 16, fontWeight: '600', color: '#4F46E5', textAlign: 'center' },
  uploadHelpText: { marginTop: 8, fontSize: 13, color: '#666', textAlign: 'center', fontStyle: 'italic' },
  form: { padding: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 24, marginBottom: 8 },
  helperText: { fontSize: 13, color: '#666', marginBottom: 4, fontStyle: 'italic' },
  warningText: { fontSize: 13, color: '#f59e0b', marginBottom: 12, fontWeight: '600' },
  searchContainer: { position: 'relative', zIndex: 10, marginBottom: 16 },
  searchInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', height: 48, paddingHorizontal: 16, fontSize: 16 },
  suggestionsBox: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', maxHeight: 200, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  suggestionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  suggestionText: { fontSize: 15, color: '#333' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  categoryCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 12 },
  categorySelected: { borderColor: '#4F46E5', backgroundColor: '#F5F3FF' },
  categoryLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  mapWrapper: { height: 380, borderRadius: 20, overflow: 'hidden', marginBottom: 12, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  map: { width: '100%', height: '100%' },
  mapOverlay: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
  overlayText: { backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, fontSize: 14, fontWeight: '600' },
  addressText: { fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
  photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  mediaLabel: { fontSize: 13, color: '#64748b', marginBottom: 8, fontStyle: 'italic', textAlign: 'center' },
  photoCount: { textAlign: 'center', marginVertical: 10, color: '#666', fontSize: 15 },
});

// import * as Location from 'expo-location';
// import { useLocalSearchParams, useRouter } from 'expo-router';
// import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
// import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
// import { useEffect, useRef, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   Keyboard,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import MapView, { Marker } from 'react-native-maps';
// import { auth, db, storage } from '../../backend/firebase';
// import CustomButton from '../../components/CustomButton';
// import CustomInput from '../../components/CustomInput';
// import MediaGallery from '../../components/MediaGallery';
// import { MediaPicker } from '../../components/MediaPicker';
// import ReportHeader from '../../components/ReportHeader';

// export default function ReportIssue() {
//   const router = useRouter();
//   const { draftId } = useLocalSearchParams();
//   const searchTimeout = useRef(null);
//   const [title, setTitle] = useState('');
//   const [description, setDescription] = useState('');
//   const [category, setCategory] = useState('');
//   const [media, setMedia] = useState([]);
//   const [location, setLocation] = useState({ latitude: 52.3555177, longitude: -1.1743197 });
//   const [address, setAddress] = useState('Search for your location...');
//   const [searchText, setSearchText] = useState('');
//   const [suggestions, setSuggestions] = useState([]);
//   const [showSuggestions, setShowSuggestions] = useState(false);
//   const [userName, setUserName] = useState('Citizen');
//   const [loading, setLoading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState('');
//   const [initialLoading, setInitialLoading] = useState(!!draftId);
//   const isEditMode = !!draftId;
//   const [categories, setCategories] = useState([]);

//   useEffect(() => {
//     const fetchCategories = async () => {
//       const docRef = doc(db, 'ConfigMD', 'categories');
//       const docSnap = await getDoc(docRef);
      
//       if (docSnap.exists() && docSnap.data().list) {
//         setCategories(docSnap.data().list);
//       } else {
//         setCategories(['Pothole', 'Streetlight', 'Missed Bin', 'Flooding', 'Graffiti', 'Other']);
//       }
//     };

//     fetchCategories();
//   }, []);

//   useEffect(() => {
//     const getUserName = async () => {
//       if (!auth.currentUser) return;
//       const snap = await getDoc(doc(db, 'UserMD', auth.currentUser.uid));
//       if (snap.exists()) setUserName(snap.data().name || 'Citizen');
//     };
//     getUserName();
//   }, []);

//   useEffect(() => {
//     if (!draftId) return;
    
//     const loadDraft = async () => {
//       const draftDoc = await getDoc(doc(db, 'reports', draftId));
      
//       if (draftDoc.exists()) {
//         const data = draftDoc.data();
//         setTitle(data.title || '');
//         setDescription(data.description || '');
//         setCategory(data.category || '');
        
//         const loadedMedia = [];
//         if (data.photos && Array.isArray(data.photos)) {
//           data.photos.forEach(uri => loadedMedia.push({ uri, type: 'photo' }));
//         }
//         if (data.videos && Array.isArray(data.videos)) {
//           data.videos.forEach(uri => loadedMedia.push({ uri, type: 'video' }));
//         } else if (data.video) {
//           loadedMedia.push({ uri: data.video, type: 'video' });
//         }
//         setMedia(loadedMedia);
//         setAddress(data.address || '');
//         setSearchText(data.address || '');
        
//         if (data.location) {
//           setLocation({ latitude: data.location.latitude, longitude: data.location.longitude });
//         }
        
//         setInitialLoading(false);
//       } else {
//         Alert.alert('Error', 'Failed to load draft');
//         setInitialLoading(false);
//       }
//     };
    
//     loadDraft();
//   }, [draftId]);

//   const updateAddress = async (lat, lng) => {
//     const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    
//     if (results && results.length > 0) {
//       const result = results[0];
//       const addr = `${result.street || ''}, ${result.city || ''} ${result.postalCode || ''}`.trim() || 'Unknown address';
//       setAddress(addr);
//       setSearchText(addr);
//     } else {
//       setAddress('Address not found');
//     }
//   };

//   const searchPlaces = async (text) => {
//     if (!text || text.length < 3) {
//       setSuggestions([]);
//       return;
//     }
    
//     const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
//     const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&language=en`;
//     const response = await fetch(url);
//     const data = await response.json();
    
//     if (data.predictions) {
//       setSuggestions(data.predictions.slice(0, 5));
//       setShowSuggestions(true);
//     } else {
//       setSuggestions([]);
//     }
//   };

//   const handleSearchChange = (text) => {
//     setSearchText(text);
//     if (searchTimeout.current) clearTimeout(searchTimeout.current);
//     searchTimeout.current = setTimeout(() => searchPlaces(text), 500);
//   };

//   const selectPlace = async (placeId, description) => {
//     setSearchText(description);
//     setShowSuggestions(false);
//     setSuggestions([]);
//     Keyboard.dismiss();
    
//     const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
//     const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}`;
//     const response = await fetch(url);
//     const data = await response.json();
    
//     if (data.result?.geometry?.location) {
//       const { lat, lng } = data.result.geometry.location;
//       setLocation({ latitude: lat, longitude: lng });
//       setAddress(description);
//     } else {
//       Alert.alert('Location Error', 'Failed to get location details');
//     }
//   };

//   const handleGalleryPick = async () => {
//     const videoCount = media.filter(m => m.type === 'video').length;
    
//     if (videoCount >= 1) {
//       Alert.alert('Video Limit', 'You can only upload 1 video. Remove the existing video first.');
//       return;
//     }
    
//     await MediaPicker.pickFromGallery(
//       (newMedia) => {
//         const newVideoCount = newMedia.filter(m => m.type === 'video').length;
//         if (videoCount + newVideoCount > 1) {
//           Alert.alert('Video Limit', 'You can only upload 1 video maximum.');
//           return;
//         }
//         setMedia([...media, ...newMedia]);
//       },
//       media,
//       5
//     );
//   };

//   const handleCameraPick = async () => {
//     const videoCount = media.filter(m => m.type === 'video').length;
    
//     if (videoCount >= 1) {
//       Alert.alert('Video Limit', 'You can only upload 1 video. Remove the existing video first.');
//       return;
//     }
    
//     await MediaPicker.pickFromCamera(
//       (newMedia) => {
//         const newVideoCount = newMedia.filter(m => m.type === 'video').length;
//         if (videoCount + newVideoCount > 1) {
//           Alert.alert('Video Limit', 'You can only upload 1 video maximum.');
//           return;
//         }
//         setMedia([...media, ...newMedia]);
//       },
//       media,
//       5
//     );
//   };

//   const removeMedia = (index) => setMedia(media.filter((_, i) => i !== index));

//   const handleSaveDraft = async () => {
//     if (!title.trim()) {
//       Alert.alert('Missing Information', 'Please add a title for your report');
//       return;
//     }
    
//     setLoading(true);
//     setUploadProgress('Saving draft...');
    
//     const photos = media.filter(m => m.type === 'photo').map(m => m.uri);
//     const videos = media.filter(m => m.type === 'video').map(m => m.uri);
//     const draftData = {
//       title: title.trim(),
//       description: description.trim(),
//       category,
//       photos,
//       videos,
//       location,
//       address,
//       userId: auth.currentUser.uid,
//       userName,
//       status: 'draft',
//       isDraft: true,
//       updatedAt: serverTimestamp(),
//     };
    
//     if (isEditMode) {
//       await updateDoc(doc(db, 'reports', draftId), draftData);
//       setLoading(false);
//       setUploadProgress('');
//       Alert.alert('Success', 'Draft updated successfully!', [
//         { text: 'OK', onPress: () => router.back() }
//       ]);
//     } else {
//       draftData.createdAt = serverTimestamp();
//       await addDoc(collection(db, 'reports'), draftData);
//       setLoading(false);
//       setUploadProgress('');
//       Alert.alert('Success', 'Draft saved successfully!', [
//         { text: 'OK', onPress: () => router.back() }
//       ]);
//     }
//   };

//   const handleSubmit = async () => {
//   if (!title || !description || !category || !location || media.length === 0) {
//     Alert.alert('Incomplete', 'Please complete all fields and add at least one photo or video');
//     return;
//   }

//   setLoading(true);
//   setUploadProgress('Preparing upload...');

//   const totalItems = media.length;
//   let currentItem = 0;

//   const uploadedPhotoUrls = [];
//   const uploadedVideoUrls = [];

//   for (let i = 0; i < media.length; i++) {
//     const item = media[i];

//     if (item.type !== 'photo' && item.type !== 'video') {
//       continue;
//     }

//     currentItem++;
//     setUploadProgress(`Uploading ${currentItem}/${totalItems} (0%)...`);

//     const isVideo = item.type === 'video';
//     const uri = item.uri;

//     const fileName = isVideo
//       ? `video_${Date.now()}_${i}.mp4`
//       : `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

//     const folder = isVideo ? 'videos' : 'images';
//     const storageRef = ref(storage, `${folder}/${auth.currentUser.uid}/${fileName}`);

//     const response = await fetch(uri);
//     const blob = await response.blob();

//     if (isVideo) {
//       const sizeInMB = (blob.size / 1024 / 1024).toFixed(2);
//       if (blob.size > 15 * 1024 * 1024) {
//         setLoading(false);
//         setUploadProgress('');
//         Alert.alert('Video Too Large', `Video is ${sizeInMB}MB. Please use a video under 15MB (10-15 seconds max).`);
//         return;
//       }
//     }

//     const metadata = isVideo
//       ? { contentType: 'video/mp4' }
//       : { contentType: 'image/jpeg' };

//     const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

//     const uploadPromise = new Promise((resolve, reject) => {
//       uploadTask.on(
//         'state_changed',
//         (snapshot) => {
//           const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
//           setUploadProgress(`Uploading ${currentItem}/${totalItems} (${progress}%)...`);
//         },
//         (error) => {
//           reject(error);
//         },
//         () => {
//           resolve(uploadTask.snapshot);
//         }
//       );
//     });

//     let snapshot;
//     await uploadPromise.then((result) => {
//       snapshot = result;
//     }).catch((error) => {
//       setLoading(false);
//       setUploadProgress('');
//       Alert.alert('Upload Failed', 'Network problem or timeout. Check your internet and try again.');
//       return;
//     });

//     if (!snapshot) {
//       return; // stop if upload failed
//     }

//     const url = await getDownloadURL(snapshot.ref);

//     if (isVideo) {
//       uploadedVideoUrls.push(url);
//     } else {
//       uploadedPhotoUrls.push(url);
//     }
//   }

//   setUploadProgress('Saving report...');

//   const reportData = {
//     title: title.trim(),
//     description: description.trim(),
//     category,
//     photoUrls: uploadedPhotoUrls,
//     videoUrls: uploadedVideoUrls,
//     location: {
//       latitude: location.latitude,
//       longitude: location.longitude,
//     },
//     address,
//     userId: auth.currentUser.uid,
//     userName,
//     status: 'submitted',
//     isDraft: false,
//     submittedAt: serverTimestamp(),
//   };

//   if (isEditMode) {
//     await updateDoc(doc(db, 'reports', draftId), reportData);
//   } else {
//     reportData.createdAt = serverTimestamp();
//     await addDoc(collection(db, 'reports'), reportData);
//   }

//   setLoading(false);
//   setUploadProgress('');

//   Alert.alert(
//     'Success',
//     'Your report has been submitted successfully!',
//     [{ text: 'OK', onPress: () => router.back() }]
//   );
// };

//   if (initialLoading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color="#4F46E5" />
//         <Text style={styles.loadingText}>Loading draft...</Text>
//       </View>
//     );
//   }

//   const photosForDisplay = media.filter(m => m.type === 'photo').map(m => m.uri);
//   const videosForDisplay = media.filter(m => m.type === 'video').map(m => m.uri);

//   return (
//     <View style={styles.wrapper}>
//       <ReportHeader title={isEditMode ? 'Edit Draft' : 'Report Issue'} />

//       <ScrollView contentContainerStyle={styles.container}>
//         <View style={styles.form}>
//           <CustomInput 
//             label="Title" 
//             placeholder="e.g. Large pothole" 
//             value={title} 
//             onChangeText={setTitle} 
//           />
          
//           <CustomInput 
//             label="Description" 
//             placeholder="Describe the issue in detail..." 
//             value={description} 
//             onChangeText={setDescription} 
//             multiline 
//             numberOfLines={4} 
//           />

//           <Text style={styles.label}>Category</Text>
//           <View style={styles.categoryGrid}>
//             {categories.map((cat) => (
//               <TouchableOpacity
//                 key={cat}
//                 style={[styles.categoryCard, category === cat && styles.categorySelected]}
//                 onPress={() => setCategory(cat)}
//               >
//                 <Text style={styles.categoryLabel}>{cat}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>

//           <Text style={styles.label}>Location</Text>
//           <View style={styles.searchContainer}>
//             <CustomInput
//               style={styles.searchInput}
//               placeholder="Search for street, postcode or place..."
//               value={searchText}
//               onChangeText={handleSearchChange}
//               onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
//             />
//             {showSuggestions && suggestions.length > 0 && (
//               <View style={styles.suggestionsBox}>
//                 {suggestions.map((item) => (
//                   <TouchableOpacity
//                     key={item.place_id}
//                     style={styles.suggestionItem}
//                     onPress={() => selectPlace(item.place_id, item.description)}
//                   >
//                     <Text style={styles.suggestionText}>{item.description}</Text>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             )}
//           </View>

//           <View style={styles.mapWrapper}>
//             <MapView
//               style={styles.map}
//               region={{
//                 latitude: location.latitude,
//                 longitude: location.longitude,
//                 latitudeDelta: 0.008,
//                 longitudeDelta: 0.008,
//               }}
//               loadingEnabled
//             >
//               <Marker
//                 draggable
//                 pinColor="#EF4444"
//                 coordinate={{ latitude: location.latitude, longitude: location.longitude }}
//                 onDragEnd={(e) => {
//                   const coord = e.nativeEvent.coordinate;
//                   setLocation(coord);
//                   updateAddress(coord.latitude, coord.longitude);
//                 }}
//               />
//             </MapView>
//             <View style={styles.mapOverlay}>
//               <Text style={styles.overlayText}>Drag pin to adjust location</Text>
//             </View>
//           </View>
//           <Text style={styles.addressText}>{address}</Text>

//           <Text style={styles.label}>Evidence (Required)</Text>
//           <Text style={styles.helperText}>Max 1 video + 4 photos (5 items total)</Text>
//           <Text style={styles.warningText}>Videos: 10-15 seconds max, under 15MB</Text>

//           <View style={styles.photoButtons}>
//             <CustomButton 
//               title="Gallery" 
//               onPress={handleGalleryPick} 
//               variant="secondary" 
//               disabled={loading} 
//             />
//             <CustomButton 
//               title="Camera" 
//               onPress={handleCameraPick} 
//               variant="secondary" 
//               disabled={loading} 
//             />
//           </View>

//           {media.length > 0 && (
//             <>
//               <Text style={styles.mediaLabel}>Tap any item to view fullscreen</Text>
//               <MediaGallery
//                 photos={photosForDisplay}
//                 videos={videosForDisplay}
//                 showRemove={true}
//                 onRemove={removeMedia}
//               />
//             </>
//           )}
//           {media.length > 0 && <Text style={styles.photoCount}>{media.length} / 5 media items</Text>}

//           {loading ? (
//             <View style={styles.loadingContainer}>
//               <ActivityIndicator size="large" color="#4F46E5" />
//               <Text style={styles.uploadProgressText}>{uploadProgress}</Text>
//               <Text style={styles.uploadHelpText}>Please wait...</Text>
//             </View>
//           ) : (
//             <>
//               <CustomButton 
//                 title={isEditMode ? 'Update Draft' : 'Save as Draft'} 
//                 onPress={handleSaveDraft} 
//                 variant="primary" 
//               />
//               <View style={{ marginTop: 10 }}>
//                 <CustomButton 
//                   title="Submit Report" 
//                   onPress={handleSubmit} 
//                   variant="secondary" 
//                 />
//               </View>
//               <View style={{ marginTop: 10 }}>
//                 <CustomButton 
//                   title="Cancel" 
//                   onPress={() => router.back()} 
//                   variant="danger" 
//                 />
//               </View>
//             </>
//           )}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: { flex: 1, backgroundColor: '#fff' },
//   container: { flexGrow: 1 },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
//   loadingContainer: { marginVertical: 30, alignItems: 'center' },
//   uploadProgressText: { marginTop: 16, fontSize: 16, fontWeight: '600', color: '#4F46E5', textAlign: 'center' },
//   uploadHelpText: { marginTop: 8, fontSize: 13, color: '#666', textAlign: 'center', fontStyle: 'italic' },
//   form: { padding: 20 },
//   label: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 24, marginBottom: 8 },
//   helperText: { fontSize: 13, color: '#666', marginBottom: 4, fontStyle: 'italic' },
//   warningText: { fontSize: 13, color: '#f59e0b', marginBottom: 12, fontWeight: '600' },
//   searchContainer: { position: 'relative', zIndex: 10, marginBottom: 16 },
//   searchInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', height: 48, paddingHorizontal: 16, fontSize: 16 },
//   suggestionsBox: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ddd', maxHeight: 200, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
//   suggestionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
//   suggestionText: { fontSize: 15, color: '#333' },
//   categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
//   categoryCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 12 },
//   categorySelected: { borderColor: '#4F46E5', backgroundColor: '#F5F3FF' },
//   categoryLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
//   mapWrapper: { height: 380, borderRadius: 20, overflow: 'hidden', marginBottom: 12, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
//   map: { width: '100%', height: '100%' },
//   mapOverlay: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
//   overlayText: { backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, fontSize: 14, fontWeight: '600' },
//   addressText: { fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
//   photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 15 },
//   mediaLabel: { fontSize: 13, color: '#64748b', marginBottom: 8, fontStyle: 'italic', textAlign: 'center' },
//   photoCount: { textAlign: 'center', marginVertical: 10, color: '#666', fontSize: 15 },
// });