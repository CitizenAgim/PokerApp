import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  overlay: 'rgba(0, 0, 0, 0.5)',
  dialogBg: isDark ? '#1c1c1e' : '#fff',
  title: isDark ? '#FFFFFF' : '#333',
  message: isDark ? '#AAAAAA' : '#666',
  cancelButton: isDark ? '#333333' : '#f0f0f0',
  cancelText: isDark ? '#FFFFFF' : '#666',
  confirmButton: '#0a7ea4',
  destructiveButton: '#e74c3c',
  confirmText: '#fff',
});

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
