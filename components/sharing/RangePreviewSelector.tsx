/**
 * RangePreviewSelector
 * 
 * A horizontal scrollable tab selector for navigating between
 * different position/action ranges in the preview modal.
 * Includes checkboxes for selective import functionality.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/sharing/range-preview.styles';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

// ============================================
// TYPES
// ============================================

interface RangePreviewSelectorProps {
  rangeKeys: string[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  selectedForImport: Set<string>;
  onToggleImport: (key: string) => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Format a range key like "early_open-raise" to "Early Open-Raise"
 */
export function formatRangeKey(key: string): string {
  return key
    .split('_')
    .map(part =>
      part
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('-')
    )
    .join(' ');
}

/**
 * Get a shorter label for compact display
 * "early_open-raise" -> "E: Open"
 */
function getCompactLabel(key: string): string {
  const [position, action] = key.split('_');
  
  const positionShort: Record<string, string> = {
    early: 'EP',
    middle: 'MP',
    late: 'LP',
    blinds: 'BB',
  };
  
  const actionShort: Record<string, string> = {
    'open-raise': 'Open',
    'call': 'Call',
    'call-raise': 'Call-R',
    '3bet': '3-Bet',
    'call-3bet': 'Call-3B',
    '4bet': '4-Bet',
    'squeeze': 'Squeeze',
    'limp-reraise': 'Limp-RR',
  };
  
  const pos = positionShort[position] || position.charAt(0).toUpperCase();
  const act = actionShort[action] || action;
  
  return `${pos}: ${act}`;
}

/**
 * Sort range keys by position priority then action
 */
export function sortRangeKeys(rangeKeys: string[]): string[] {
  const positionOrder: Record<string, number> = {
    early: 0,
    middle: 1,
    late: 2,
    blinds: 3,
  };
  
  const actionOrder: Record<string, number> = {
    'open-raise': 0,
    'call': 1,
    '3bet': 2,
    'call-raise': 3,
    'call-3bet': 4,
    '4bet': 5,
    'squeeze': 6,
    'limp-reraise': 7,
  };

  return [...rangeKeys].sort((a, b) => {
    const [posA, actA] = a.split('_');
    const [posB, actB] = b.split('_');
    
    const posCompare = (positionOrder[posA] ?? 99) - (positionOrder[posB] ?? 99);
    if (posCompare !== 0) return posCompare;
    
    return (actionOrder[actA] ?? 99) - (actionOrder[actB] ?? 99);
  });
}

// ============================================
// COMPONENT
// ============================================

export function RangePreviewSelector({
  rangeKeys,
  selectedKey,
  onSelectKey,
  selectedForImport,
  onToggleImport,
}: RangePreviewSelectorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);

  // Sort range keys by position priority then action
  const sortedKeys = useMemo(() => sortRangeKeys(rangeKeys), [rangeKeys]);

  const handleSelect = (key: string) => {
    haptics.selectionChanged();
    onSelectKey(key);
  };

  const handleToggleImport = (key: string) => {
    haptics.selectionChanged();
    onToggleImport(key);
  };

  // If only one range, don't show selector (but still show checkbox in modal)
  if (sortedKeys.length <= 1) {
    return null;
  }

  return (
    <View style={[styles.selectorContainer, { borderBottomColor: themeColors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.selectorScroll}
        contentContainerStyle={styles.selectorScrollContent}
      >
        {sortedKeys.map((key) => {
          const isActive = key === selectedKey;
          const isSelectedForImport = selectedForImport.has(key);
          
          return (
            <View
              key={key}
              style={[
                styles.tab,
                { 
                  backgroundColor: isActive 
                    ? themeColors.tabActiveBg 
                    : isSelectedForImport 
                      ? themeColors.tabBg 
                      : themeColors.tabDeselectedBg,
                },
                !isSelectedForImport && styles.tabDeselected,
              ]}
            >
              {/* Checkbox */}
              <TouchableOpacity
                onPress={() => handleToggleImport(key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelectedForImport }}
                accessibilityLabel={`${isSelectedForImport ? 'Deselect' : 'Select'} ${formatRangeKey(key)} for import`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              >
                <View
                  style={[
                    styles.checkbox,
                    { 
                      backgroundColor: isSelectedForImport 
                        ? themeColors.checkboxCheckedBg 
                        : 'transparent',
                      borderColor: isActive 
                        ? 'rgba(255,255,255,0.5)' 
                        : themeColors.border,
                    },
                    isSelectedForImport && styles.checkboxChecked,
                  ]}
                >
                  {isSelectedForImport && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
              
              {/* Tab Label */}
              <TouchableOpacity
                onPress={() => handleSelect(key)}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`View ${formatRangeKey(key)} range`}
              >
                <Text
                  style={[
                    styles.tabText,
                    { 
                      color: isActive 
                        ? themeColors.tabActiveText 
                        : isSelectedForImport 
                          ? themeColors.tabText 
                          : themeColors.tabDeselectedText,
                    },
                    isActive && styles.tabTextActive,
                  ]}
                >
                  {getCompactLabel(key)}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default RangePreviewSelector;
