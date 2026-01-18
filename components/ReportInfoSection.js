import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function ReportInfoSection({ report }) {
  // Gets status badge colour based on status
  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':
        return '#F59E0B';
      case 'assigned':
        return '#3B82F6';
      case 'in progress':
        return '#8B5CF6';
      case 'resolved':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  // Safe function to get a displayable address string
  const getDisplayAddress = () => {
    const addr = report.address;

    // If no address at all
    if (!addr) return 'Address not available';

    // If address is old-style plain string (for backward compatibility)
    if (typeof addr === 'string') return addr;

    // New object style, prefer .full if it exists
    if (addr.full && typeof addr.full === 'string') {
      return addr.full;
    }

    // Build from parts as fallback
    const parts = [];
    if (addr.placeName) parts.push(addr.placeName);
    if (addr.street) parts.push(addr.street);
    if (addr.city) parts.push(addr.city);
    if (addr.postcode) parts.push(addr.postcode);

    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  };

  return (
    <View style={styles.container}>
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
        <Text style={styles.statusText}>{report.status?.toUpperCase() || 'UNKNOWN'}</Text>
      </View>

      {/* Report Title and Category */}
      <Text style={styles.title}>{report.title}</Text>
      <Text style={styles.category}>{report.category}</Text>

      {/* Description */}
      <Text style={styles.description}>{report.description}</Text>

      {/* Report Metadata */}
      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Reported by:</Text>
          <Text style={styles.value}>{report.userName || 'Unknown'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>
            {report.createdAt?.toDate?.().toLocaleDateString('en-GB') || 'Recently'}
          </Text>
        </View>
      </View>

      {/* Location Section */}
      <Text style={styles.sectionTitle}>Location</Text>
      <Text style={styles.address}>{getDisplayAddress()}</Text>

      {/* Map */}
      {report.location && report.location.latitude && report.location.longitude ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={{
              latitude: report.location.latitude,
              longitude: report.location.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
          >
            <Marker
              coordinate={{
                latitude: report.location.latitude,
                longitude: report.location.longitude,
              }}
              pinColor="#EF4444"
            />
          </MapView>
        </View>
      ) : (
        <Text style={styles.noMapText}>Map not available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  category: {
    fontSize: 17,
    color: '#4F46E5',
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 17,
    color: '#475569',
    lineHeight: 26,
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 16,
  },
  address: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 16,
    fontWeight: '500',
  },
  mapContainer: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  noMapText: {
    fontSize: 16,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 32,
  },
});