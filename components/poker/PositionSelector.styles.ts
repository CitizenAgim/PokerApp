import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  early: '#e74c3c',
  middle: '#f39c12',
  late: '#27ae60',
  blinds: '#3498db',
  inactive: isDark ? '#333333' : '#E0E0E0',
  actionActive: '#0a7ea4',
  actionInactive: isDark ? '#333333' : '#F5F5F5',
  textDark: isDark ? '#FFFFFF' : '#333333',
  textLight: '#FFFFFF',
  textMuted: isDark ? '#AAAAAA' : '#888888',
  containerBg: isDark ? '#1c1c1e' : '#FAFAFA',
  sectionLabel: isDark ? '#AAAAAA' : '#666',
  actionBorder: isDark ? '#444444' : '#DDD',
});

export const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    gap: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  positionTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionsScroll: {
    gap: 8,
    paddingRight: 16,
  },
  actionTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
