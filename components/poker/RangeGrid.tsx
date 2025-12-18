import { GRID_HEADERS, HAND_MATRIX } from '@/constants/hands';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Range, SelectionState } from '@/types/poker';
import { getHandState, toggleHandInRange } from '@/utils/handRanking';
import { haptics } from '@/utils/haptics';
import React, { useCallback } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { getThemeColors, styles } from './RangeGrid.styles';

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

export default RangeGrid;
