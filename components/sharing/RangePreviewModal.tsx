/**
 * RangePreviewModal
 * 
 * A modal that displays a visual preview of shared ranges.
 * Shows a read-only 13x13 hand grid for each position/action
 * so users can evaluate ranges before accepting them.
 * 
 * Supports selective import - users can choose which ranges to accept.
 */

import { RangeGrid, RangeStats } from '@/components/poker';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/sharing/range-preview.styles';
import { Range } from '@/types/poker';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RangePreviewSelector, sortRangeKeys } from './RangePreviewSelector';

// ============================================
// TYPES
// ============================================

interface RangePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  playerName: string;
  ranges: Record<string, Range>;
  rangeKeys: string[];
  onAcceptSelected?: (selectedKeys: string[]) => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Format a range key like "early_open-raise" to "Early Position - Open Raise"
 */
function formatRangeKeyFull(key: string): string {
  const [position, action] = key.split('_');
  
  const positionLabels: Record<string, string> = {
    early: 'Early Position',
    middle: 'Middle Position',
    late: 'Late Position',
    blinds: 'Blinds',
  };
  
  const actionLabels: Record<string, string> = {
    'open-raise': 'Open Raise',
    'call': 'Call',
    'call-raise': 'Call Raise',
    '3bet': '3-Bet',
    'call-3bet': 'Call 3-Bet',
    '4bet': '4-Bet',
    'squeeze': 'Squeeze',
    'limp-reraise': 'Limp Re-raise',
  };
  
  const pos = positionLabels[position] || position;
  const act = actionLabels[action] || action;
  
  return `${pos} - ${act}`;
}

/**
 * Check if a range has any selected hands
 */
function rangeHasSelections(range: Range): boolean {
  return Object.values(range).some(
    state => state === 'manual-selected' || state === 'auto-selected'
  );
}

// ============================================
// COMPONENT
// ============================================

export function RangePreviewModal({
  visible,
  onClose,
  playerName,
  ranges,
  rangeKeys,
  onAcceptSelected,
}: RangePreviewModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  const insets = useSafeAreaInsets();

  // Sort keys for consistent ordering
  const sortedKeys = useMemo(() => sortRangeKeys(rangeKeys), [rangeKeys]);

  // Current selected range key (for viewing)
  const [selectedKey, setSelectedKey] = useState<string>(sortedKeys[0] || '');

  // Ranges selected for import (all selected by default)
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(
    new Set(sortedKeys)
  );

  // Reset state when modal opens with new data
  useEffect(() => {
    if (visible && sortedKeys.length > 0) {
      setSelectedKey(sortedKeys[0]);
      setSelectedForImport(new Set(sortedKeys));
    }
  }, [visible, sortedKeys]);

  // Toggle import selection for a range
  const toggleImport = useCallback((key: string) => {
    setSelectedForImport(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Select all ranges
  const selectAll = useCallback(() => {
    haptics.selectionChanged();
    setSelectedForImport(new Set(sortedKeys));
  }, [sortedKeys]);

  // Deselect all ranges
  const deselectAll = useCallback(() => {
    haptics.selectionChanged();
    setSelectedForImport(new Set());
  }, []);

  // Handle accept
  const handleAccept = useCallback(() => {
    if (onAcceptSelected && selectedForImport.size > 0) {
      haptics.success();
      onAcceptSelected(Array.from(selectedForImport));
    }
  }, [onAcceptSelected, selectedForImport]);

  // Get the current range data
  const currentRange = ranges[selectedKey] || {};
  const hasSelections = rangeHasSelections(currentRange);

  // No-op handler for readonly grid
  const handleRangeChange = () => {
    // Read-only mode - do nothing
  };

  const selectedCount = selectedForImport.size;
  const totalCount = sortedKeys.length;
  const hasAcceptCallback = !!onAcceptSelected;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: themeColors.modalBackground },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: themeColors.border,
              paddingTop: insets.top > 0 ? insets.top : 16,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>
              {hasAcceptCallback ? 'Select Ranges to Import' : 'Range Preview'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: themeColors.subText }]}>
              "{playerName}"
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close preview"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color={themeColors.subText} />
          </TouchableOpacity>
        </View>

        {/* Range Selector Tabs with Checkboxes */}
        <RangePreviewSelector
          rangeKeys={sortedKeys}
          selectedKey={selectedKey}
          onSelectKey={setSelectedKey}
          selectedForImport={selectedForImport}
          onToggleImport={toggleImport}
        />

        {/* Selection Summary */}
        {hasAcceptCallback && (
          <View 
            style={[
              styles.selectionSummary, 
              { borderBottomColor: themeColors.border }
            ]}
          >
            <Text 
              style={[
                styles.selectionSummaryText, 
                { color: selectedCount > 0 ? themeColors.accent : themeColors.subText }
              ]}
              accessibilityLiveRegion="polite"
            >
              {selectedCount} of {totalCount} range{totalCount !== 1 ? 's' : ''} selected
            </Text>
          </View>
        )}

        {/* Bulk Actions */}
        {hasAcceptCallback && totalCount > 1 && (
          <View style={styles.bulkActionsContainer}>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: themeColors.bulkActionBg }]}
              onPress={selectAll}
              disabled={selectedCount === totalCount}
            >
              <Text 
                style={[
                  styles.bulkActionText, 
                  { 
                    color: selectedCount === totalCount 
                      ? themeColors.subText 
                      : themeColors.accent 
                  }
                ]}
              >
                Select All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: themeColors.bulkActionBg }]}
              onPress={deselectAll}
              disabled={selectedCount === 0}
            >
              <Text 
                style={[
                  styles.bulkActionText, 
                  { 
                    color: selectedCount === 0 
                      ? themeColors.subText 
                      : themeColors.text 
                  }
                ]}
              >
                Deselect All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={styles.contentContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Range Title */}
          <View style={styles.rangeSection}>
            <Text style={[styles.rangeSectionTitle, { color: themeColors.text }]}>
              {formatRangeKeyFull(selectedKey)}
            </Text>
          </View>

          {/* Info Box */}
          <View
            style={[
              styles.infoBox,
              { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd' },
            ]}
          >
            <Ionicons
              name={hasAcceptCallback ? 'checkbox-outline' : 'eye-outline'}
              size={18}
              color={isDark ? '#5dade2' : '#1565c0'}
              style={styles.infoIcon}
            />
            <Text
              style={[
                styles.infoText,
                { color: isDark ? '#5dade2' : '#1565c0' },
              ]}
            >
              {hasAcceptCallback 
                ? 'Use checkboxes to select which ranges to import. Tap tabs to preview each range.'
                : 'This is a preview. Accept the share to add these ranges to a player.'
              }
            </Text>
          </View>

          {/* Range Stats */}
          {hasSelections ? (
            <RangeStats range={currentRange} showDetails={false} />
          ) : null}

          {/* Range Grid (Read-only) */}
          <View style={styles.gridWrapper}>
            {hasSelections ? (
              <RangeGrid
                range={currentRange}
                onRangeChange={handleRangeChange}
                readonly={true}
                showPercentage={false}
              />
            ) : (
              <View
                style={[
                  styles.emptyRangeContainer,
                  { backgroundColor: themeColors.emptyStateBg },
                ]}
              >
                <Ionicons
                  name="grid-outline"
                  size={48}
                  color={themeColors.subText}
                />
                <Text
                  style={[styles.emptyRangeText, { color: themeColors.subText }]}
                >
                  No hands selected in this range
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: themeColors.border,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
            },
          ]}
        >
          {hasAcceptCallback ? (
            <View style={styles.footerButtons}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { 
                    backgroundColor: 'transparent',
                    borderColor: themeColors.border,
                  },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  { backgroundColor: themeColors.success },
                  selectedCount === 0 && styles.acceptButtonDisabled,
                ]}
                onPress={handleAccept}
                disabled={selectedCount === 0}
              >
                <Text style={styles.acceptButtonText}>
                  {selectedCount === 0
                    ? 'Select ranges'
                    : `Accept ${selectedCount} Range${selectedCount !== 1 ? 's' : ''}`
                  }
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.closeButtonFooter,
                { backgroundColor: themeColors.accent },
              ]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: '#fff' }]}>
                Close Preview
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default RangePreviewModal;
