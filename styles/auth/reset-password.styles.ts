import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  inputBg: isDark ? '#2A2A2A' : '#f5f5f5',
  inputText: isDark ? '#fff' : '#333',
  inputBorder: isDark ? '#333' : '#e0e0e0',
  placeholder: isDark ? '#888' : '#aaa',
  backButtonText: isDark ? '#ccc' : '#666',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 28,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 16,
    paddingHorizontal: 10,
    opacity: 0.8,
  },
  input: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
  },
});
