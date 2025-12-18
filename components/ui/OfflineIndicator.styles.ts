import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  offlineBg: '#e74c3c',
  offlineText: '#fff',
  syncIcon: '#0a7ea4',
  syncedIcon: '#27ae60',
  notSyncedIcon: '#888',
  syncText: '#888',
});

export const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 12,
  },
});
