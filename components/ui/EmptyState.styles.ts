import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  title: isDark ? '#FFFFFF' : '#333',
  message: isDark ? '#AAAAAA' : '#888',
  actionButton: '#0a7ea4',
  actionText: '#fff',
  defaultIcon: isDark ? '#555555' : '#ccc',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
