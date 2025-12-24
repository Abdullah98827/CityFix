// components/ReportCard.js — FIXED: Hooks called at top, no conditional errors
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReportCard({ report, onPress }) {
  // ============================================
  // IMPORTANT: Call hooks at the TOP, before any returns
  // This is a React rule - hooks must always run in the same order
  // ============================================
  const router = useRouter();

  // ============================================
  // NOW we can do safety checks AFTER hooks are called
  // ============================================
  if (!report || !report.id) {
    return null; // Safety: if no report or missing id, skip rendering
  }

  // ============================================
  // STATUS COLOR HELPER
  // ============================================
  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return '#F59E0B';
      case 'assigned': return '#3B82F6';
      case 'in progress': return '#8B5CF6';
      case 'resolved': return '#10B981';
      case 'verified': return '#059669';
      case 'reopened': return '#DC2626';
      case 'merged': return '#6B7280';
      default: return '#6B7280';
    }
  };

  // ============================================
  // HANDLE PRESS
  // ============================================
  const handlePress = () => {
    if (onPress) {
      onPress(report.id);
    } else {
      router.push(`/report-detail/${report.id}`);
    }
  };

  // ============================================
  // SAFE FALLBACK FOR MEDIA
  // ============================================
  const photoUrls = report.photoUrls || report.photos || [];
  const videoUrls = report.videoUrls || (report.video ? [report.video] : (report.videos || []));
  const firstPhoto = photoUrls[0];
  const hasVideo = videoUrls.length > 0;

  // ============================================
  // RENDER CARD
  // ============================================
  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      {/* Media Section */}
      {firstPhoto ? (
        <Image source={{ uri: firstPhoto }} style={styles.photo} />
      ) : hasVideo ? (
        <View style={styles.videoThumbnail}>
          <View style={styles.playIcon}>
            <Text style={styles.playText}>▶</Text>
          </View>
          <Text style={styles.videoLabel}>VIDEO</Text>
        </View>
      ) : (
        <View style={styles.noPhoto}>
          <Text style={styles.noPhotoText}>No media</Text>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {report.title || 'Untitled Report'}
        </Text>
        <Text style={styles.category}>
          {report.category || 'Uncategorized'}
        </Text>

        {/* Merged Badge - Shows if duplicates were merged */}
        {report.duplicateCount > 0 && (
          <View style={styles.mergedBadge}>
            <Text style={styles.mergedText}>
              Merged ({report.duplicateCount} duplicate{report.duplicateCount > 1 ? 's' : ''})
            </Text>
          </View>
        )}

        <View style={styles.bottomRow}>
          <Text style={styles.address} numberOfLines={1}>
            {report.address || 'Location saved'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
            <Text style={styles.statusText}>
              {report.status?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>

        <Text style={styles.date}>
          {report.createdAt?.toDate?.()?.toLocaleDateString('en-GB') || 'Just now'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// STYLES
// ============================================
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
  videoThumbnail: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playText: {
    fontSize: 24,
    color: '#4F46E5',
    marginLeft: 4,
  },
  videoLabel: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  noPhoto: {
    width: '100%',
    height: 220,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  noPhotoText: { color: '#94a3b8', fontSize: 16 },
  info: { padding: 18 },
  title: { fontSize: 19, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
  category: {
    fontSize: 15,
    color: '#4F46E5',
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'capitalize'
  },
  mergedBadge: {
    backgroundColor: '#fbbf24',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  mergedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  address: { fontSize: 14.5, color: '#475569', flex: 1, fontWeight: '500' },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    minWidth: 90,
    alignItems: 'center'
  },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  date: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
});