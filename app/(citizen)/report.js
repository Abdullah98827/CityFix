import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { auth, db } from '../../backend/firebase';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import FormMessage from '../../components/FormMessage';

export default function ReportIssue() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState('Getting your location...');
  const [searchText, setSearchText] = useState('');
  const [userName, setUserName] = useState('Citizen');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Fetch user name
  useEffect(() => {
    const getUserName = async () => {
      if (auth.currentUser) {
        const snap = await getDoc(doc(db, 'UserMD', auth.currentUser.uid));
        if (snap.exists()) setUserName(snap.data().name || 'Citizen');
      }
    };
    getUserName();
  }, []);

  // Get current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Location permission denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      updateAddress(loc.coords.latitude, loc.coords.longitude);
    })();
  }, []);

  const updateAddress = async (lat, lng) => {
    try {
      let [result] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      let addr = `${result.street || result.name || ''}, ${result.city || ''} ${result.postalCode || ''}`.trim();
      setAddress(addr || 'Unknown address');
    } catch {
      setAddress('Address not found');
    }
  };

  const handleSearch = async () => {
    if (!searchText) return;
    try {
      let results = await Location.geocodeAsync(searchText);
      if (results.length > 0) {
        let { latitude, longitude } = results[0];
        setLocation({ coords: { latitude, longitude } });
        updateAddress(latitude, longitude);
      } else {
        setMessage('Location not found');
        setIsError(true);
      }
    } catch {
      setMessage('Search failed');
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
    if (photos.length >= 5) { setMessage('Maximum 5 photos'); setIsError(true); return; }
    let result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setPhotos([...photos, result.assets[0].uri]);
  };

  const takePhoto = async () => {
    if (photos.length >= 5) { setMessage('Maximum 5 photos'); setIsError(true); return; }
    let perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { setMessage('Camera permission needed'); setIsError(true); return; }
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setPhotos([...photos, result.assets[0].uri]);
  };

  const removePhoto = (i) => setPhotos(photos.filter((_, index) => index !== i));

  const handleSubmit = async () => {
    setMessage(''); setIsError(false);
    if (!title || !description || !category || photos.length === 0 || !location) {
      setMessage('Please complete all fields and add at least one photo');
      setIsError(true);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        title: title.trim(),
        description: description.trim(),
        category,
        photos,
        location: { latitude: location.coords.latitude, longitude: location.coords.longitude },
        address,
        userId: auth.currentUser.uid,
        userName,
        status: 'submitted',
        createdAt: serverTimestamp(),
      });
      setMessage('Report submitted successfully!');
      setIsError(false);
      setTimeout(() => router.back(), 1500);
    } catch {
      setMessage('Failed to submit report');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report an Issue</Text>
      </View>

      <View style={styles.form}>
        <CustomInput label="Title" placeholder="e.g. Large pothole" value={title} onChangeText={setTitle} />
        <CustomInput label="Description" placeholder="Describe the issue..." value={description} onChangeText={setDescription} multiline numberOfLines={4} />

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
        <CustomInput
          placeholder="Search street or postcode (e.g. Abington Square)"
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
        />

        <View style={styles.mapWrapper}>
          <MapView
            style={styles.map}
            region={{
              latitude: location?.coords.latitude || 52.2405,
              longitude: location?.coords.longitude || -0.9027,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
            followsUserLocation={true}
            loadingEnabled={true}
          >
            {location && (
              <Marker
                draggable
                pinColor="#EF4444"
                coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
                onDragEnd={(e) => {
                  const coord = e.nativeEvent.coordinate;
                  setLocation({ coords: coord });
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

        <Text style={styles.label}>Photos (1–5 required)</Text>
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}><Text style={styles.photoBtnText}>Gallery</Text></TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}><Text style={styles.photoBtnText}>Camera</Text></TouchableOpacity>
        </View>

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
        <Text style={styles.photoCount}>{photos.length} / 5 photos</Text>

        <FormMessage message={message} isError={isError} />

        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
        ) : (
          <CustomButton title="Submit Report" onPress={handleSubmit} variant="secondary" />
        )}

        <View style={{ marginTop: 10 }}>
          <CustomButton title="Cancel" onPress={() => router.back()} variant="danger" />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  form: { padding: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#333', marginTop: 24, marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  categoryCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  categorySelected: { borderColor: '#4F46E5', backgroundColor: '#F5F3FF' },
  categoryLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  mapWrapper: { height: 380, borderRadius: 20, overflow: 'hidden', marginBottom: 12, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  map: { width: '100%', height: '100%' },
  mapOverlay: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center' },
  overlayText: { backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, fontSize: 14, fontWeight: '600' },
  addressText: { fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
  photoButtons: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  photoBtn: { flex: 1, backgroundColor: '#2563EB', padding: 14, borderRadius: 12, alignItems: 'center' },
  photoBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  photoBox: { width: '30%', aspectRatio: 1, position: 'relative' },
  photo: { width: '100%', height: '100%', borderRadius: 12 },
  remove: { position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  removeText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  photoCount: { textAlign: 'center', marginVertical: 10, color: '#666', fontSize: 15 },
});