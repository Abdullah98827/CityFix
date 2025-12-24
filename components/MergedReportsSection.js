import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../backend/firebase';

export default function MergedReportsSection({ masterReport, role = 'dispatcher' }) {
  const router = useRouter();
  const [mergedReports, setMergedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Fetches merged duplicate reports when the component loads
  useEffect(() => {
    const fetchMergedReports = async () => {
      // If the report has no duplicates, doesn't bother querying
      if (!masterReport.duplicateCount || masterReport.duplicateCount === 0) {
        setLoading(false);
        return;
      }

      // Query all reports that point to this one as their master
      const q = query(
        collection(db, 'reports'),
        where('isDuplicateOf', '==', masterReport.id)
      );

      const snapshot = await getDocs(q);
      const reports = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });

      setMergedReports(reports);
      setLoading(false);
    };

    fetchMergedReports();
  }, [masterReport.id, masterReport.duplicateCount]);

  // If no duplicates, don't show the whole section
  if (!masterReport.duplicateCount || masterReport.duplicateCount === 0) {
    return null;
  }

  // Navigate to the right detail screen based on user's role
  const handleReportPress = (reportId) => {
    if (role === 'dispatcher') {
      router.push(`/(dispatcher)/report-detail/${reportId}`);
    } else if (role === 'engineer') {
      router.push(`/(engineer)/job-detail/${reportId}`);
    } else if (role === 'qa') {
      router.push(`/(qa)/verify/${reportId}`);
    } else if (role === 'citizen') {
      router.push(`/(citizen)/report-detail/${reportId}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with icon and count */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Text style={styles.iconText}>🔗</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Merged Reports</Text>
            <Text style={styles.headerSubtitle}>
              This issue was reported by {masterReport.duplicateCount + 1} citizen{masterReport.duplicateCount > 0 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Info box explaining how merging works */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Master Report:</Text> This is the main report.
          When you update this, all {masterReport.duplicateCount} merged report{masterReport.duplicateCount > 1 ? 's' : ''} will be updated too.
        </Text>
      </View>

      {/* Toggle to show/hide the list */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.toggleText}>
          {expanded ? '▼ Hide' : '▶ View'} {masterReport.duplicateCount} Merged Report{masterReport.duplicateCount > 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>

      {/* List of merged reports (only when expanded) */}
      {expanded && (
        <View style={styles.reportsList}>
          {loading ? (
            <ActivityIndicator size="large" color="#4F46E5" style={styles.loader} />
          ) : mergedReports.length === 0 ? (
            <Text style={styles.noReports}>No merged reports found</Text>
          ) : (
            mergedReports.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.reportCard}
                onPress={() => handleReportPress(report.id)}
              >
                {/* Thumbnail */}
                <View style={styles.reportThumbnail}>
                  {report.photoUrls && report.photoUrls[0] ? (
                    <Image
                      source={{ uri: report.photoUrls[0] }}
                      style={styles.thumbnailImage}
                    />
                  ) : (
                    <View style={styles.noThumbnail}>
                      <Text style={styles.noThumbnailText}>📷</Text>
                    </View>
                  )}
                </View>

                {/* Report info */}
                <View style={styles.reportInfo}>
                  <Text style={styles.reportTitle} numberOfLines={2}>
                    {report.title || 'Untitled Report'}
                  </Text>
                  <Text style={styles.reportMeta}>
                    Reported by: {report.userName || 'Unknown'}
                  </Text>
                  <Text style={styles.reportMeta}>
                    {report.createdAt?.toDate?.().toLocaleDateString('en-GB')} at{' '}
                    {report.createdAt?.toDate?.().toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text style={styles.reportAddress} numberOfLines={1}>
                    {report.address || 'Location saved'}
                  </Text>
                </View>

                {/* Right arrow */}
                <View style={styles.arrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      {/* Footer note when expanded */}
      {expanded && mergedReports.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All citizens will be notified when you update this master report
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginVertical: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fbbf24',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#fef3c7',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#92400e',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#78350f',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#fffbeb',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fef3c7',
  },
  infoText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: '700',
  },
  toggleButton: {
    backgroundColor: '#fbbf24',
    padding: 16,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  reportsList: {
    padding: 16,
    backgroundColor: '#fffbeb',
  },
  loader: {
    paddingVertical: 20,
  },
  noReports: {
    fontSize: 15,
    color: '#78350f',
    textAlign: 'center',
    paddingVertical: 20,
  },
  reportCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
  },
  reportThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  noThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noThumbnailText: {
    fontSize: 32,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  reportMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  reportAddress: {
    fontSize: 13,
    color: '#78350f',
    fontWeight: '500',
    marginTop: 4,
  },
  arrow: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 20,
    color: '#fbbf24',
  },
  footer: {
    backgroundColor: '#d1fae5',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#6ee7b7',
  },
  footerText: {
    fontSize: 13,
    color: '#065f46',
    textAlign: 'center',
    fontWeight: '600',
  },
});