import { useColorScheme } from '@/hooks/use-color-scheme';
import { Action, Position } from '@/types/poker';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { getThemeColors, styles } from './PositionSelector.styles';

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
  { id: 'call', label: 'Limp/Call' },
  { id: 'open-raise', label: 'Raise' },
  { id: 'call-raise', label: 'Call Raise' },
  { id: '3bet', label: '3-Bet' },
  { id: 'call-3bet', label: 'Call 3-Bet' },
  { id: '4bet', label: '4-Bet' },
];

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

export default PositionSelector;
