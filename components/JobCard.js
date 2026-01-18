import { StyleSheet, Text, View } from 'react-native';

export default function JobCard({ job, councilLocation }) {
  const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return null;

    let deadlineDate;
    if (deadline.toDate) {
      deadlineDate = deadline.toDate();
    } else if (deadline instanceof Date) {
      deadlineDate = deadline;
    } else if (typeof deadline === 'string' || typeof deadline === 'number') {
      deadlineDate = new Date(deadline);
    } else {
      return null;
    }
    
    // Checks if the date is valid
    if (isNaN(deadlineDate.getTime())) {
      return null;
    }
    
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineColor = (daysLeft) => {
    if (daysLeft < 0) return '#EF4444';
    if (daysLeft === 0) return '#F59E0B';
    if (daysLeft <= 2) return '#F59E0B';
    return '#10B981';
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return '#DC2626';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  // Hardcoded Northampton Council centre
  const council = councilLocation || { latitude: 52.2405, longitude: -0.9027 };

  // Haversine distance in miles
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const distance = job.location
    ? calculateDistance(
        council.latitude,
        council.longitude,
        job.location.latitude,
        job.location.longitude
      ).toFixed(1)
    : null;

  const daysLeft = getDaysUntilDeadline(job.deadline);
  const deadlineColor = daysLeft !== null ? getDeadlineColor(daysLeft) : '#6B7280';
  const priorityColor = getPriorityColor(job.priority);

  const getDisplayAddress = () => {
    const addr = job.address;
    if (!addr) return 'Address not available';
    if (typeof addr === 'string') return addr;
    if (addr.full) return addr.full;
    const parts = [];
    if (addr.placeName) parts.push(addr.placeName);
    if (addr.street) parts.push(addr.street);
    if (addr.city) parts.push(addr.city);
    if (addr.postcode) parts.push(addr.postcode);
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
          <Text style={styles.priorityText}>
            {job.priority?.toUpperCase() || 'NORMAL'}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{job.status?.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {job.title}
      </Text>
      <Text style={styles.category}>{job.category}</Text>

      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.infoRow}>
        {daysLeft !== null && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Deadline:</Text>
            <View style={[styles.deadlineBadge, { backgroundColor: deadlineColor }]}>
              <Text style={styles.deadlineText}>
                {daysLeft < 0
                  ? `${Math.abs(daysLeft)} days overdue`
                  : daysLeft === 0
                  ? 'Due today!'
                  : daysLeft === 1
                  ? '1 day left'
                  : `${daysLeft} days left`}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.address} numberOfLines={2}>
          {getDisplayAddress()}
        </Text>
        {distance && (
          <Text style={styles.distanceText}>{distance} miles from Council</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  category: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  deadlineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deadlineText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  address: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  distanceText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
});