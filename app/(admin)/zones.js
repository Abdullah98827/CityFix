// app/(admin)/zones.js
// Admin screen to create, edit, and delete zones with professional polygon drawing
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { logAction } from '../../utils/logger'; // <-- added import

export default function ZonesAdmin() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawingZone, setDrawingZone] = useState(null);
  const [newZoneName, setNewZoneName] = useState('');

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

  const startNewZone = () => {
    setDrawingZone({ id: null, name: '', coordinates: [] });
    setNewZoneName('');
  };

  const startEditing = (zone) => {
    setDrawingZone({
      id: zone.id,
      name: zone.name,
      coordinates: [...zone.polygon],
    });
    setNewZoneName(zone.name);
  };

  const addPoint = (coordinate) => {
    if (!drawingZone) return;
    setDrawingZone({
      ...drawingZone,
      coordinates: [...drawingZone.coordinates, coordinate],
    });
  };

  const removeLastPoint = () => {
    if (!drawingZone || drawingZone.coordinates.length === 0) return;
    setDrawingZone({
      ...drawingZone,
      coordinates: drawingZone.coordinates.slice(0, -1),
    });
  };

  const saveZone = async () => {
    if (!newZoneName.trim()) {
      Alert.alert('Error', 'Please enter a zone name');
      return;
    }
    if (drawingZone.coordinates.length < 3) {
      Alert.alert('Error', 'Please add at least 3 points to form a polygon');
      return;
    }

    const zonesCollection = collection(db, 'ConfigMD', 'config', 'zones');

    if (drawingZone.id) {
      // Update existing zone
      await updateDoc(doc(zonesCollection, drawingZone.id), {
        name: newZoneName.trim(),
        polygon: drawingZone.coordinates,
      });

      // Log zone update
      logAction('zone_updated', drawingZone.id, `Name: ${newZoneName.trim()}, Points: ${drawingZone.coordinates.length}`);

      Alert.alert('Success', 'Zone updated');
    } else {
      // Create new zone
      const docRef = await addDoc(zonesCollection, {
        name: newZoneName.trim(),
        polygon: drawingZone.coordinates,
      });

      // Log zone creation
      logAction('zone_created', docRef.id, `Name: ${newZoneName.trim()}, Points: ${drawingZone.coordinates.length}`);

      Alert.alert('Success', 'Zone created');
    }

    setNewZoneName('');
    setDrawingZone(null);

    // Refresh list
    const snapshot = await getDocs(zonesCollection);
    const list = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      list.push({ id: doc.id, name: data.name || 'Unnamed Zone', polygon: data.polygon || [] });
    });
    setZones(list);
  };

  const cancelEditing = () => {
    setDrawingZone(null);
    setNewZoneName('');
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

            // Log zone deletion
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
            <Text style={styles.addTitle}>
              {drawingZone ? `Editing "${drawingZone.name || 'New Zone'}"` : 'Create New Zone'}
            </Text>
            <Text style={styles.instruction}>Tap on the map to add points. Minimum 3 points.</Text>
            <CustomInput
              label="Zone Name"
              placeholder="e.g. City Centre"
              value={newZoneName}
              onChangeText={setNewZoneName}
            />
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: 52.2405,
                  longitude: -0.9027,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                onPress={(e) => addPoint(e.nativeEvent.coordinate)}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
              >
                {/* Saved zones */}
                {zones.map((zone) => {
                  if (zone.polygon.length < 3) return null;
                  const latSum = zone.polygon.reduce((sum, coord) => sum + coord.latitude, 0);
                  const lngSum = zone.polygon.reduce((sum, coord) => sum + coord.longitude, 0);
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
                {/* Current drawing */}
                {drawingZone && drawingZone.coordinates.length >= 3 && (
                  <Polygon
                    coordinates={drawingZone.coordinates}
                    strokeColor="#EF4444"
                    fillColor="rgba(239, 68, 68, 0.2)"
                    strokeWidth={3}
                  />
                )}
                {/* Current points */}
                {drawingZone && drawingZone.coordinates.map((coord, i) => (
                  <Marker key={i} coordinate={coord} pinColor="#EF4444" />
                ))}
              </MapView>
            </View>
            {drawingZone && (
              <View style={styles.drawingActions}>
                <CustomButton title="Save Zone" onPress={saveZone} variant="secondary" />
                {drawingZone.coordinates.length > 0 && (
                  <CustomButton title="Remove Last Point" onPress={removeLastPoint} variant="danger" style={{ marginTop: 8 }} />
                )}
                <CustomButton title="Cancel" onPress={cancelEditing} variant="danger" style={{ marginTop: 8 }} />
              </View>
            )}
            {!drawingZone && (
              <CustomButton
                title="Start New Zone"
                onPress={startNewZone}
                variant="primary"
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.zoneCard}>
            <Text style={styles.zoneCardTitle}>{item.name}</Text>
            <View style={styles.zoneCardActions}>
              <TouchableOpacity onPress={() => startEditing(item)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeZone(item.id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No zones yet. Start drawing below!</Text>
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
  drawingActions: { marginBottom: 32 },
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
  zoneCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
  },
  editText: { color: '#4F46E5', fontWeight: '600', fontSize: 16 },
  removeText: { color: '#ef4444', fontWeight: '600', fontSize: 16 },
  emptyContainer: { padding: 40 },
  emptyText: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  listContent: { paddingBottom: 40 },
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