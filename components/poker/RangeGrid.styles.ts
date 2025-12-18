import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  // Base colors by hand type
  pair: '#4A90D9',        // Blue for pairs
  suited: '#7CB342',      // Green for suited
  offsuit: '#FFB74D',     // Orange/tan for offsuit
  
  // Selection states
  unselected: {
    pair: isDark ? '#102030' : '#E3F2FD',      // Darker blue / Light blue
    suited: isDark ? '#152515' : '#F1F8E9',    // Darker green / Light green  
    offsuit: isDark ? '#252010' : '#FFF8E1',   // Darker orange / Light orange
  },
  selected: {
    pair: '#1E88E5',      // Strong blue
    suited: '#43A047',    // Strong green
    offsuit: '#FB8C00',   // Strong orange
  },
  manualUnselected: {
    pair: isDark ? '#1a3a5a' : '#BBDEFB',      // Faded blue with indicator
    suited: isDark ? '#2a4a2a' : '#C8E6C9',    // Faded green with indicator
    offsuit: isDark ? '#4a3a1a' : '#FFE0B2',   // Faded orange with indicator
  },
  
  // Text colors
  textLight: '#FFFFFF',
  textDark: isDark ? '#FFFFFF' : '#333333',
  textMuted: isDark ? '#AAAAAA' : '#666666',
  
  // Grid
  border: isDark ? '#333333' : '#E0E0E0',
  headerBg: isDark ? '#1c1c1e' : '#F5F5F5',
});

export const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cornerCell: {
    // Dynamic background
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    // Dynamic background and border
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    // Dynamic color
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    position: 'relative',
    // Dynamic background and border
  },
  cellSelected: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  cellText: {
    fontSize: 10,
    fontWeight: '500',
    // Dynamic color
  },
  cellTextSmall: {
    fontSize: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 12,
    // Dynamic color
  },
});
