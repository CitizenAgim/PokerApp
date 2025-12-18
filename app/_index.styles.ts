import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  tagline: isDark ? '#aaa' : '#888',
  secondaryButtonText: isDark ? '#4fc3f7' : '#0a7ea4',
  secondaryButtonBorder: isDark ? '#4fc3f7' : '#0a7ea4',
  guestButtonText: isDark ? '#aaa' : '#888',
  guestNote: isDark ? '#888' : '#666',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  centered: {
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 42,
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 55,
  },
  tagline: {
    fontSize: 16,
    color: '#888',
    marginBottom: 60,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0a7ea4',
  },
  secondaryButtonText: {
    color: '#0a7ea4',
    fontSize: 18,
    fontWeight: '600',
  },
  guestButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  guestButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  guestNote: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
