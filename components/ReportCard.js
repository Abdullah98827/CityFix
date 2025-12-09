import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReportCard({ report }) {
  const router = useRouter();

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted':   return '#F59E0B';
      case 'in progress': return '#3B82F6';
      case 'resolved':    return '#10B981';
      default:            return '#6B7280';
    }
  };

  const firstPhoto = report.photos?.[0];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/report-detail/${report.id}`)}
    >
      {firstPhoto ? (
        <Image source={{ uri: firstPhoto }} style={styles.photo} />
      ) : (
        <View style={styles.noPhoto}>
          <Text style={styles.noPhotoText}>No photo</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{report.title}</Text>
        <Text style={styles.category}>{report.category}</Text>
        
        <View style={styles.bottomRow}>
          <Text style={styles.address} numberOfLines={1}>
            {report.address || 'Location saved'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
            <Text style={styles.statusText}>{report.status || 'submitted'}</Text>
          </View>
        </View>

        <Text style={styles.date}>
          {report.createdAt?.toDate?.().toLocaleDateString('en-GB') || 'Just now'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    marginBottom: 18, 
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  photo: { width: '100%', height: 220 },
  noPhoto: { width: '100%', height: 220, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  noPhotoText: { color: '#94a3b8', fontSize: 16 },
  info: { padding: 18 },
  title: { fontSize: 19, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  category: { fontSize: 15, color: '#4F46E5', fontWeight: '700', marginBottom: 10, textTransform: 'capitalize' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  address: { fontSize: 14.5, color: '#475569', flex: 1, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 25, minWidth: 90, alignItems: 'center' },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  date: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
});