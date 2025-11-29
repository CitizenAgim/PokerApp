import { Range, SelectionState } from '@/types/poker';
import { HAND_MATRIX } from '@/constants/hands';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
    <View style={styles.container}>
      {/* Main percentage display */}
      <View style={styles.mainStats}>
        <View style={styles.statBox}>
          <Text style={styles.percentageValue}>{stats.percentage}%</Text>
          <Text style={styles.percentageLabel}>of hands</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.combosValue}>{stats.selectedCombos}</Text>
          <Text style={styles.combosLabel}>combos</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.handsValue}>{stats.selectedHands}</Text>
          <Text style={styles.handsLabel}>hands</Text>
        </View>
      </View>

      {/* Detailed breakdown */}
      {showDetails && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <View style={[styles.colorDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.detailLabel}>Manual</Text>
            <Text style={styles.detailValue}>{stats.manualSelected}</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.colorDot, { backgroundColor: '#81C784' }]} />
            <Text style={styles.detailLabel}>Auto</Text>
            <Text style={styles.detailValue}>{stats.autoSelected}</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.colorDot, { backgroundColor: '#FF5722' }]} />
            <Text style={styles.detailLabel}>Excluded</Text>
            <Text style={styles.detailValue}>{stats.manualUnselected}</Text>
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
