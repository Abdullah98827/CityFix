import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function CustomInput({ label, multiline, numberOfLines, ...props }) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput 
        style={[
          styles.input,
          multiline && styles.multilineInput
        ]}
        placeholderTextColor="#999"
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    height: 120,
    paddingTop: 16,
  },
});