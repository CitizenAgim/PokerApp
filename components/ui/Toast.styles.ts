import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  successBg: isDark ? '#1b3320' : '#e8f5e9',
  successBorder: '#27ae60',
  successIcon: '#27ae60',
  
  errorBg: isDark ? '#3a1c1c' : '#ffebee',
  errorBorder: '#e74c3c',
  errorIcon: '#e74c3c',
  
  warningBg: isDark ? '#332b1e' : '#fff8e1',
  warningBorder: '#f39c12',
  warningIcon: '#f39c12',
  
  infoBg: isDark ? '#1a2733' : '#e3f2fd',
  infoBorder: '#0a7ea4',
  infoIcon: '#0a7ea4',
  
  message: isDark ? '#FFFFFF' : '#333',
  closeIcon: isDark ? '#AAAAAA' : '#999',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  action: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
});
