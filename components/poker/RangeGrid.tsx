import { GRID_HEADERS, HAND_MATRIX } from '@/constants/hands';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Range, SelectionState } from '@/types/poker';
import { getHandState, toggleHandInRange } from '@/utils/handRanking';
import { haptics } from '@/utils/haptics';
import React, { useCallback } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================
// TYPES
// ============================================

interface RangeGridProps {
  range: Range;
  onRangeChange: (newRange: Range) => void;
  readonly?: boolean;
  showPercentage?: boolean;
}

interface HandCellProps {
  handId: string;
  label: string;
  type: 'pair' | 'suited' | 'offsuit';
  state: SelectionState;
  onPress: () => void;
  readonly?: boolean;
  cellSize: number;
  colors: any;
}

// ============================================
// COLORS
// ============================================

const getThemeColors = (isDark: boolean) => ({
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

// ============================================
// HAND CELL COMPONENT
// ============================================

const HandCell: React.FC<HandCellProps> = React.memo(({
  handId,
  label,
  type,
  state,
  onPress,
  readonly,
  cellSize,
  colors,
}) => {
  const getBackgroundColor = (): string => {
    switch (state) {
      case 'manual-selected':
      case 'auto-selected':
        return colors.selected[type];
      case 'manual-unselected':
        return colors.manualUnselected[type];
      default:
        return colors.unselected[type];
    }
  };
  
  const getTextColor = (): string => {
    if (state === 'manual-selected' || state === 'auto-selected') {
      return colors.textLight;
    }
    return colors.textDark;
  };
  
  const isSelected = state === 'manual-selected' || state === 'auto-selected';
  
  return (
    <TouchableOpacity
      style={[
        styles.cell,
        {
          width: cellSize,
          height: cellSize,
          backgroundColor: getBackgroundColor(),
          borderColor: colors.border,
        },
        isSelected && styles.cellSelected,
      ]}
      onPress={onPress}
      disabled={readonly}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.cellText,
          { color: getTextColor() },
          cellSize < 30 && styles.cellTextSmall,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

// ============================================
// HEADER CELL COMPONENT
// ============================================

const HeaderCell: React.FC<{ label: string; cellSize: number; colors: any }> = ({ label, cellSize, colors }) => (
  <View style={[styles.headerCell, { width: cellSize, height: cellSize, backgroundColor: colors.headerBg, borderColor: colors.border }]}>
    <Text style={[styles.headerText, { color: colors.textDark }]}>{label}</Text>
  </View>
);

// ============================================
// RANGE GRID COMPONENT
// ============================================

export const RangeGrid: React.FC<RangeGridProps> = ({
  range,
  onRangeChange,
  readonly = false,
  showPercentage = true,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  // Calculate cell size based on screen width
  const screenWidth = Dimensions.get('window').width;
  const padding = 16;
  const gridSize = screenWidth - (padding * 2);
  const cellSize = Math.floor(gridSize / 14); // 13 cells + 1 header
  
  const handleCellPress = useCallback((handId: string) => {
    if (readonly) return;
    haptics.selectionChanged();
    const newRange = toggleHandInRange(range, handId);
    onRangeChange(newRange);
  }, [range, onRangeChange, readonly]);
  
  // Calculate selection percentage
  const selectedCount = Object.values(range).filter(
    s => s === 'manual-selected' || s === 'auto-selected'
  ).length;
  const percentage = Math.round((selectedCount / 169) * 100);
  
  return (
    <View style={styles.container}>
      {showPercentage && (
        <View style={styles.statsRow}>
          <Text style={[styles.statsText, { color: colors.textMuted }]}>
            {selectedCount} hands selected ({percentage}%)
          </Text>
        </View>
      )}
      
      <View style={[styles.grid, { width: cellSize * 14 }]}>
        {/* Top-left empty corner */}
        <View style={[styles.cornerCell, { width: cellSize, height: cellSize, backgroundColor: colors.headerBg }]} />
        
        {/* Column headers */}
        {GRID_HEADERS.map((rank, col) => (
          <HeaderCell key={`col-${col}`} label={rank} cellSize={cellSize} colors={colors} />
        ))}
        
        {/* Grid rows */}
        {HAND_MATRIX.map((row, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {/* Row header */}
            <HeaderCell label={GRID_HEADERS[rowIndex]} cellSize={cellSize} colors={colors} />
            
            {/* Hand cells */}
            {row.map((hand) => (
              <HandCell
                key={hand.id}
                handId={hand.id}
                label={hand.id}
                type={hand.type}
                state={getHandState(range, hand.id)}
                onPress={() => handleCellPress(hand.id)}
                readonly={readonly}
                cellSize={cellSize}
                colors={colors}
              />
            ))}
          </React.Fragment>
        ))}
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.selected.pair }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Pairs</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.selected.suited }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Suited</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.selected.offsuit }]} />
          <Text style={[styles.legendText, { color: colors.textMuted }]}>Offsuit</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
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
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cornerCell: {
    backgroundColor: COLORS.headerBg,
  },
  headerCell: {
    backgroundColor: COLORS.headerBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.border,
    position: 'relative',
  },
  cellSelected: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  cellText: {
    fontSize: 10,
    fontWeight: '500',
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
    color: COLORS.textMuted,
  },
});

export default RangeGrid;
