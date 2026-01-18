import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import { db } from '../../backend/firebase';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import ReportHeader from '../../components/ReportHeader';
import { logAction } from '../../utils/logger';

export default function ZonesAdmin() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newZoneName, setNewZoneName] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [currentCentre, setCurrentCentre] = useState(null);
  const searchTimeout = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const fetchZones = async () => {
      const zonesCollection = collection(db, 'ConfigMD', 'config', 'zones');
      const snapshot = await getDocs(zonesCollection);
      const list = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || 'Unnamed Zone',
          polygon: data.polygon || []
        });
      });
      setZones(list);
      setLoading(false);
    };
    fetchZones();
  }, []);

  const searchPlaces = async (text) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      return;
    }

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${apiKey}&language=en&components=country:gb`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.predictions) {
        setSuggestions(data.predictions.slice(0, 5));
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSearchChange = (text) => {
    setNewZoneName(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchPlaces(text), 500);
  };

  const selectPlace = async (placeId, description) => {
    setNewZoneName(description);
    setShowSuggestions(false);
    setSuggestions([]);
    Keyboard.dismiss();

    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${apiKey}&fields=geometry,bounds,name`;

    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        setCurrentCentre({ latitude: lat, longitude: lng });

        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }

        let polygon = [];
        if (data.result.geometry.bounds) {
          const ne = data.result.geometry.bounds.northeast;
          const sw = data.result.geometry.bounds.southwest;
          polygon = [
            { latitude: ne.lat, longitude: ne.lng },
            { latitude: ne.lat, longitude: sw.lng },
            { latitude: sw.lat, longitude: sw.lng },
            { latitude: sw.lat, longitude: ne.lng },
            { latitude: ne.lat, longitude: ne.lng }
          ];
        } else {
          const delta = 0.05;
          polygon = [
            { latitude: lat + delta, longitude: lng + delta },
            { latitude: lat + delta, longitude: lng - delta },
            { latitude: lat - delta, longitude: lng - delta },
            { latitude: lat - delta, longitude: lng + delta },
            { latitude: lat + delta, longitude: lng + delta }
          ];
        }
        setCurrentPolygon(polygon);
      } else {
        setCurrentPolygon([]);
        setCurrentCentre(null);
      }
    } else {
      Alert.alert('Error', 'Could not load place boundary');
      setCurrentPolygon([]);
      setCurrentCentre(null);
    }
  };

  const saveZone = async () => {
    if (!newZoneName.trim()) {
      Alert.alert('Error', 'Please enter a zone name');
      return;
    }

    if (currentPolygon.length < 3) {
      Alert.alert('Error', 'No boundary found. Please select a place from suggestions.');
      return;
    }

    const zonesCollection = collection(db, 'ConfigMD', 'config', 'zones');
    const docRef = await addDoc(zonesCollection, {
      name: newZoneName.trim(),
      polygon: currentPolygon,
    });

    logAction('zone_created', docRef.id, `Name: ${newZoneName.trim()}, Points: ${currentPolygon.length}`);
    Alert.alert('Success', 'Zone created');

    setNewZoneName('');
    setCurrentPolygon([]);

    const snapshot = await getDocs(zonesCollection);
    const list = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      list.push({ id: doc.id, name: data.name || 'Unnamed Zone', polygon: data.polygon || [] });
    });
    setZones(list);
  };

  const removeZone = (zoneId) => {
    Alert.alert(
      'Delete Zone',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDoc(doc(db, 'ConfigMD', 'config', 'zones', zoneId));
            logAction('zone_deleted', zoneId, 'Deleted by admin');
            setZones(zones.filter(z => z.id !== zoneId));
            Alert.alert('Success', 'Zone deleted');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ReportHeader title="Manage Zones" />

      <FlatList
        data={zones}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Text style={styles.title}>Current Zones ({zones.length})</Text>
            <Text style={styles.addTitle}>Create New Zone</Text>
            <Text style={styles.instruction}>Type any UK city or town name to auto-create boundary.</Text>

            <CustomInput
              label="Zone Name / Place"
              placeholder="e.g. Manchester, London, Birmingham, Leeds"
              value={newZoneName}
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

            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: 52.2405,
                  longitude: -0.9027,
                  latitudeDelta: 0.1,
                  longitudeDelta: 0.1,
                }}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
              >
                {zones.map((zone) => {
                  if (zone.polygon.length < 3) return null;
                  const latSum = zone.polygon.reduce((sum, c) => sum + c.latitude, 0);
                  const lngSum = zone.polygon.reduce((sum, c) => sum + c.longitude, 0);
                  const center = {
                    latitude: latSum / zone.polygon.length,
                    longitude: lngSum / zone.polygon.length,
                  };
                  return (
                    <View key={zone.id}>
                      <Polygon
                        coordinates={zone.polygon}
                        strokeColor="#4F46E5"
                        fillColor="rgba(79, 70, 229, 0.2)"
                        strokeWidth={3}
                      />
                      <Marker coordinate={center}>
                        <View style={styles.zoneLabelContainer}>
                          <Text style={styles.zoneLabelText}>{zone.name}</Text>
                        </View>
                      </Marker>
                    </View>
                  );
                })}

                {currentPolygon.length >= 3 && (
                  <Polygon
                    coordinates={currentPolygon}
                    strokeColor="#EF4444"
                    fillColor="rgba(239, 68, 68, 0.3)"
                    strokeWidth={3}
                  />
                )}
              </MapView>
            </View>

            <CustomButton
              title="Save Zone"
              onPress={saveZone}
              variant="secondary"
              style={{ marginTop: 16 }}
              disabled={!newZoneName.trim() || currentPolygon.length < 3}
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.zoneCard}>
            <Text style={styles.zoneCardTitle}>{item.name}</Text>
            <TouchableOpacity onPress={() => removeZone(item.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No zones yet. Type any UK city/town name above!</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContent: { padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 24 },
  addTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 24, marginBottom: 12 },
  instruction: { fontSize: 14, color: '#64748b', marginBottom: 16, fontStyle: 'italic' },
  mapContainer: {
    height: 500,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  map: { width: '100%', height: '100%' },
  zoneCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  zoneCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  removeText: { color: '#ef4444', fontWeight: '600', fontSize: 16, textAlign: 'right' },
  emptyContainer: { padding: 40 },
  emptyText: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  listContent: { paddingBottom: 40 },
  suggestionsBox: {
    position: 'absolute',
    top: 110,
    left: 24,
    right: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  zoneLabelContainer: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  zoneLabelText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});