import { Action, Position, RangeCategory } from '@/types/poker';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================
// TYPES
// ============================================

interface PositionSelectorProps {
  selectedPosition: Position;
  selectedAction: Action;
  onSelectionChange: (position: Position, action: Action) => void;
}

// ============================================
// CONSTANTS
// ============================================

const POSITIONS: { id: Position; label: string; shortLabel: string }[] = [
  { id: 'early', label: 'Early', shortLabel: 'EP' },
  { id: 'middle', label: 'Middle', shortLabel: 'MP' },
  { id: 'late', label: 'Late', shortLabel: 'LP' },
  { id: 'blinds', label: 'Blinds', shortLabel: 'BL' },
];

const ACTIONS: { id: Action; label: string }[] = [
  { id: 'open-raise', label: 'Open Raise' },
  { id: 'call', label: 'Call' },
  { id: '3bet', label: '3-Bet' },
  { id: 'call-3bet', label: 'Call 3-Bet' },
  { id: '4bet', label: '4-Bet' },
];

const COLORS = {
  early: '#e74c3c',
  middle: '#f39c12',
  late: '#27ae60',
  blinds: '#3498db',
  inactive: '#E0E0E0',
  actionActive: '#0a7ea4',
  actionInactive: '#F5F5F5',
  textDark: '#333333',
  textLight: '#FFFFFF',
  textMuted: '#888888',
};

// ============================================
// POSITION SELECTOR COMPONENT
// ============================================

export const PositionSelector: React.FC<PositionSelectorProps> = ({
  selectedPosition,
  selectedAction,
  onSelectionChange,
}) => {
  return (
    <View style={styles.container}>
      {/* Position Tabs */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Position</Text>
        <View style={styles.tabsContainer}>
          {POSITIONS.map(pos => {
            const isActive = selectedPosition === pos.id;
            const bgColor = isActive ? COLORS[pos.id] : COLORS.inactive;
            
            return (
              <TouchableOpacity
                key={pos.id}
                style={[
                  styles.positionTab,
                  { backgroundColor: bgColor },
                ]}
                onPress={() => onSelectionChange(pos.id, selectedAction)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? COLORS.textLight : COLORS.textMuted },
                  ]}
                >
                  {pos.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      {/* Action Tabs */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Action</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsScroll}
        >
          {ACTIONS.map(action => {
            const isActive = selectedAction === action.id;
            
            return (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionTab,
                  {
                    backgroundColor: isActive ? COLORS.actionActive : COLORS.actionInactive,
                    borderColor: isActive ? COLORS.actionActive : '#DDD',
                  },
                ]}
                onPress={() => onSelectionChange(selectedPosition, action.id)}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: isActive ? COLORS.textLight : COLORS.textDark },
                  ]}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
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

export default PositionSelector;
