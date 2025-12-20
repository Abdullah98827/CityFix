import { StyleSheet, Text, View } from 'react-native';

export default function AssignmentDetails({ report }) {
  // Get deadline info with countdown
  const getDeadlineInfo = () => {
    if (!report.deadline) return null;
    
    const deadlineDate = new Date(report.deadline);
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let color = '#10B981'; // Green
    let text = `${diffDays} days left`;
    
    if (diffDays < 0) {
      color = '#EF4444'; // Red
      text = `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      color = '#F59E0B'; // Orange
      text = 'Due today!';
    } else if (diffDays <= 2) {
      color = '#F59E0B'; // Orange
      text = diffDays === 1 ? '1 day left' : `${diffDays} days left`;
    }
    
    return { color, text };
  };

  // Get priority color
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

  const deadlineInfo = getDeadlineInfo();
  const priorityColor = getPriorityColor(report.priority);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Assignment Details</Text>
      
      <View style={styles.infoBox}>
        {/* Priority */}
        <View style={styles.infoRow}>
          <Text style={styles.label}>Priority:</Text>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            <Text style={styles.badgeText}>{report.priority?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Deadline with Countdown */}
        {deadlineInfo && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Deadline:</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.value}>{report.deadline}</Text>
              <View style={[styles.deadlineBadge, { backgroundColor: deadlineInfo.color }]}>
                <Text style={styles.badgeText}>{deadlineInfo.text}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Assigned To (if available) */}
        {report.assignedToName && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Assigned to:</Text>
            <Text style={styles.value}>{report.assignedToName}</Text>
          </View>
        )}

        {/* Dispatcher Notes */}
        {report.dispatcherNotes && (
          <View style={styles.notesBox}>
            <Text style={styles.label}>Dispatcher Notes:</Text>
            <Text style={styles.notesText}>{report.dispatcherNotes}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  deadlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  notesBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  notesText: {
    fontSize: 15,
    color: '#475569',
    marginTop: 8,
    lineHeight: 22,
  },
});