import { HAND_MATRIX } from '@/constants/hands';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Range } from '@/types/poker';
import React from 'react';
import { Text, View } from 'react-native';
import { getThemeColors, styles } from './RangeStats.styles';

// ============================================
// TYPES
// ============================================

interface RangeStatsProps {
  range: Range;
  showDetails?: boolean;
}

// ============================================
// RANGE STATS COMPONENT
// ============================================

export const RangeStats: React.FC<RangeStatsProps> = ({
  range,
  showDetails = true,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  // Calculate statistics
  const stats = React.useMemo(() => {
    let manualSelected = 0;
    let autoSelected = 0;
    let manualUnselected = 0;
    let unselected = 0;
    let totalCombos = 0;
    let selectedCombos = 0;

    // Count each state
    for (const row of HAND_MATRIX) {
      for (const hand of row) {
        const state = range[hand.id] || 'unselected';
        const combos = hand.type === 'pair' ? 6 : hand.type === 'suited' ? 4 : 12;
        totalCombos += combos;

        switch (state) {
          case 'manual-selected':
            manualSelected++;
            selectedCombos += combos;
            break;
          case 'auto-selected':
            autoSelected++;
            selectedCombos += combos;
            break;
          case 'manual-unselected':
            manualUnselected++;
            break;
          default:
            unselected++;
        }
      }
    }

    const totalHands = 169; // 13x13 grid
    const selectedHands = manualSelected + autoSelected;
    const percentage = (selectedCombos / 1326 * 100).toFixed(1);
    const handPercentage = (selectedHands / totalHands * 100).toFixed(1);

    return {
      manualSelected,
      autoSelected,
      manualUnselected,
      unselected,
      totalHands,
      selectedHands,
      totalCombos,
      selectedCombos,
      percentage,
      handPercentage,
    };
  }, [range]);

  return (
    <View style={[styles.container, { backgroundColor: colors.containerBg }]}>
      {/* Main percentage display */}
      <View style={styles.mainStats}>
        <View style={styles.statBox}>
          <Text style={[styles.percentageValue, { color: colors.percentageValue }]}>{stats.percentage}%</Text>
          <Text style={[styles.percentageLabel, { color: colors.percentageLabel }]}>of hands</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.combosValue, { color: colors.combosValue }]}>{stats.selectedCombos}</Text>
          <Text style={[styles.combosLabel, { color: colors.combosLabel }]}>combos</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.handsValue, { color: colors.handsValue }]}>{stats.selectedHands}</Text>
          <Text style={[styles.handsLabel, { color: colors.handsLabel }]}>hands</Text>
        </View>
      </View>

      {/* Detailed breakdown */}
      {showDetails && (
        <View style={[styles.detailsContainer, { borderTopColor: colors.borderTop }]}>
          <View style={styles.detailRow}>
            <View style={[styles.colorDot, { backgroundColor: colors.manualDot }]} />
            <Text style={[styles.detailLabel, { color: colors.detailLabel }]}>Manual</Text>
            <Text style={[styles.detailValue, { color: colors.detailValue }]}>{stats.manualSelected}</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.colorDot, { backgroundColor: colors.autoDot }]} />
            <Text style={[styles.detailLabel, { color: colors.detailLabel }]}>Auto</Text>
            <Text style={[styles.detailValue, { color: colors.detailValue }]}>{stats.autoSelected}</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.colorDot, { backgroundColor: colors.excludedDot }]} />
            <Text style={[styles.detailLabel, { color: colors.detailLabel }]}>Excluded</Text>
            <Text style={[styles.detailValue, { color: colors.detailValue }]}>{stats.manualUnselected}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default RangeStats;
