import { StyleSheet, Text } from 'react-native';

export default function FormMessage({ message, isError = false }) {
  if (!message) return null;

  return (
    <Text style={[styles.message, isError ? styles.error : styles.success]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  message: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 10,
  },
  error: {
    color: '#DC2626', // red-600
  },
  success: {
    color: '#16A34A', // green-600
  },
});