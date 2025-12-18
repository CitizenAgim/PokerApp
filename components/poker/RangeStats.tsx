import { HAND_MATRIX } from '@/constants/hands';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Range } from '@/types/poker';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ============================================
// TYPES
// ============================================

interface RangeStatsProps {
  range: Range;
  showDetails?: boolean;
}

const getThemeColors = (isDark: boolean) => ({
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

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
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

export default RangeStats;
