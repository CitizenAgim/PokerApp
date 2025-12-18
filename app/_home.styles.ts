import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  disabledButton: isDark ? '#333' : '#ccc',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 40,
  },
  menuContainer: {
    gap: 16,
  },
  menuButton: {
    backgroundColor: '#0a7ea4',
    padding: 20,
    borderRadius: 12,
  },
  menuButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  menuDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  signOutButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
