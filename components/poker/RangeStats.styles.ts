import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  containerBg: isDark ? '#1c1c1e' : '#FAFAFA',
  percentageValue: '#0a7ea4',
  percentageLabel: isDark ? '#AAAAAA' : '#888',
  combosValue: isDark ? '#FFFFFF' : '#333',
  combosLabel: isDark ? '#AAAAAA' : '#888',
  handsValue: isDark ? '#FFFFFF' : '#333',
  handsLabel: isDark ? '#AAAAAA' : '#888',
  borderTop: isDark ? '#333333' : '#E0E0E0',
  detailLabel: isDark ? '#AAAAAA' : '#666',
  detailValue: isDark ? '#FFFFFF' : '#333',
  // Dots
  manualDot: '#4CAF50',
  autoDot: '#81C784',
  excludedDot: '#FF5722',
});

export const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  percentageValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  percentageLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  combosValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  combosLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  handsValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  handsLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});
