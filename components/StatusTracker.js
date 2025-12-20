import { StyleSheet, Text, View } from 'react-native';

export default function StatusTracker({ status }) {
  const statuses = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'in progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'verified', label: 'Verified' },
  ];

  const currentIndex = statuses.findIndex(s => s.key === status);
  const isReopened = status === 'reopened';

  if (isReopened) {
    return (
      <View style={styles.container}>
        <View style={styles.reopenedBanner}>
          <Text style={styles.reopenedText}>REOPENED</Text>
          <Text style={styles.reopenedSubtext}>Needs further attention</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Report Progress</Text>
      <View style={styles.timeline}>
        {statuses.map((item, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;

          return (
            <View key={item.key} style={styles.step}>
              <View style={styles.stepContent}>
                <View style={[
                  styles.circle,
                  {
                    backgroundColor: isCompleted || isActive ? '#4F46E5' : '#E5E7EB',
                    borderColor: isActive ? '#4F46E5' : '#E5E7EB',
                  }
                ]}>
                  {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                  {isActive && <View style={styles.activeDot} />}
                </View>
                <Text style={[
                  styles.label,
                  { color: isCompleted || isActive ? '#1e293b' : '#9ca3af' },
                  isActive && styles.activeLabel
                ]}>
                  {item.label}
                </Text>
              </View>

              {index < statuses.length - 1 && (
                <View style={[
                  styles.connector,
                  { backgroundColor: isCompleted ? '#4F46E5' : '#E5E7EB' }
                ]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepContent: {
    alignItems: 'center',
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  checkmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  activeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  activeLabel: {
    fontWeight: '700',
  },
  connector: {
    flex: 1,
    height: 3,
    marginHorizontal: 4,
  },
  reopenedBanner: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  reopenedText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
  },
  reopenedSubtext: {
    fontSize: 14,
    color: '#DC2626',
    marginTop: 4,
  },
});