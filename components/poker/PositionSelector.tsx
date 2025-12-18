import { useColorScheme } from '@/hooks/use-color-scheme';
import { Action, Position } from '@/types/poker';
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

const getThemeColors = (isDark: boolean) => ({
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

// ============================================
// POSITION SELECTOR COMPONENT
// ============================================

export const PositionSelector: React.FC<PositionSelectorProps> = ({
  selectedPosition,
  selectedAction,
  onSelectionChange,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.containerBg }]}>
      {/* Position Tabs */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>Position</Text>
        <View style={styles.tabsContainer}>
          {POSITIONS.map(pos => {
            const isActive = selectedPosition === pos.id;
            const bgColor = isActive ? colors[pos.id] : colors.inactive;
            
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
                    { color: isActive ? colors.textLight : colors.textMuted },
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
        <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>Action</Text>
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
                    backgroundColor: isActive ? colors.actionActive : colors.actionInactive,
                    borderColor: isActive ? colors.actionActive : colors.actionBorder,
                  },
                ]}
                onPress={() => onSelectionChange(selectedPosition, action.id)}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: isActive ? colors.textLight : colors.textDark },
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
