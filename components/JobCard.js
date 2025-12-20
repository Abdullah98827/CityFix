import { StyleSheet, Text, View } from 'react-native';

export default function JobCard({ job, showDistance = false, userLocation = null }) {
  // Calculates days until deadline
  const getDaysUntilDeadline = (deadline) => {
    if (!deadline) return null;
    
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Changes colour based on days remaining
  const getDeadlineColor = (daysLeft) => {
    if (daysLeft < 0) return '#EF4444'; // Red meansOverdue
    if (daysLeft === 0) return '#F59E0B'; // Orange means its due today
    if (daysLeft <= 2) return '#F59E0B'; // Orange also means its due soon
    return '#10B981'; // Green means on track
  };

  // Priority badge colour
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

  // Calculates distance between two coordinates (Haversine formula)
  // Returns distance in MILES (for UK usage)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in MILES 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance.toFixed(1); // Returns distance in miles with 1 decimal
  };

  const daysLeft = getDaysUntilDeadline(job.deadline);
  const deadlineColor = daysLeft !== null ? getDeadlineColor(daysLeft) : '#6B7280';
  const priorityColor = getPriorityColor(job.priority);

  // Calculates the  distance if user's location is available
  let distance = null;
  if (showDistance && userLocation && job.location) {
    distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      job.location.latitude,
      job.location.longitude
    );
  }

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

      {/* Title and Category */}
      <Text style={styles.title} numberOfLines={2}>
        {job.title}
      </Text>
      <Text style={styles.category}>{job.category}</Text>

      {/* Description Preview */}
      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      {/* Bottom Info Row */}
      <View style={styles.infoRow}>
        {/* Deadline Countdown */}
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

        {/* Distance */}
        {showDistance && distance && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Distance:</Text>
            <Text style={styles.distanceText}>{distance} miles away</Text>
          </View>
        )}
      </View>

      {/* Address */}
      <Text style={styles.address} numberOfLines={1}>
        {job.address || 'Address not available'}
      </Text>
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
  distanceText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  address: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
});