import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  skeletonBg: isDark ? '#333' : '#e0e0e0',
  cardBg: isDark ? '#1c1c1e' : '#fff',
});

export const styles = StyleSheet.create({
  skeleton: {
    // Background color is handled dynamically
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  playerCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  sessionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionCardDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  friendCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  rangeGrid: {
    alignItems: 'center',
    padding: 8,
  },
  rangeRow: {
    flexDirection: 'row',
  },
});
