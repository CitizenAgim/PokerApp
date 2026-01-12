/**
 * LinkUpdatePreview
 * 
 * Modal that shows a preview of range updates available from a linked player.
 * User can select which ranges to sync before accepting.
 */

import { RangeGrid, RangeStats } from '@/components/poker';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlayerLinks } from '@/hooks/usePlayerLinks';
import { styles as sharedStyles } from '@/styles/sharing/index.styles';
import { getThemeColors, styles as previewStyles } from '@/styles/sharing/range-preview.styles';
import { Position, Range } from '@/types/poker';
import { PlayerLinkView, SyncRangesResult } from '@/types/sharing';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RangePreviewSelector, sortRangeKeys } from './RangePreviewSelector';

interface LinkUpdatePreviewProps {
  visible: boolean;
  onClose: () => void;
  linkView: PlayerLinkView;
  onSuccess?: (result: SyncRangesResult) => void;
}

// ============================================
// HELPERS
// ============================================

// Format position name for display
const formatPosition = (position: string): string => {
  const positionNames: Record<Position, string> = {
    early: 'Early',
    middle: 'Middle',
    late: 'Late',
    blinds: 'Blinds',
  };
  return positionNames[position as Position] || position;
};

// Format action name for display
const formatAction = (action: string): string => {
  const actionNames: Record<string, string> = {
    'open-raise': 'Open Raise',
    'call': 'Call',
    'call-raise': 'Call Raise',
    '3bet': '3-Bet',
    'call-3bet': 'Call 3-Bet',
    '4bet': '4-Bet',
    'squeeze': 'Squeeze',
    'limp-reraise': 'Limp Re-raise',
  };
  return actionNames[action] || action;
};

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

export function LinkUpdatePreview({
  visible,
  onClose,
  linkView,
  onSuccess,
}: LinkUpdatePreviewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  const insets = useSafeAreaInsets();
  
  const { getRangesForSync, markLinkAsSynced, syncSelectedFromLink } = usePlayerLinks();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Range data
  const [theirRanges, setTheirRanges] = useState<Record<string, Range>>({});
  const [theirVersion, setTheirVersion] = useState<number>(0);
  const [newRangeKeys, setNewRangeKeys] = useState<string[]>([]);
  const [updateRangeKeys, setUpdateRangeKeys] = useState<string[]>([]);
  
  // Selection state
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());

  // Combine and sort all available keys (new + updates)
  const allRangeKeys = useMemo(() => [...newRangeKeys, ...updateRangeKeys], [newRangeKeys, updateRangeKeys]);
  const sortedAllKeys = useMemo(() => sortRangeKeys(allRangeKeys), [allRangeKeys]);
  const sortedNewKeys = useMemo(() => sortRangeKeys(newRangeKeys), [newRangeKeys]);
  const sortedUpdateKeys = useMemo(() => sortRangeKeys(updateRangeKeys), [updateRangeKeys]);
  
  // Track which keys are updates (will overwrite existing data)
  const updateKeySet = useMemo(() => new Set(updateRangeKeys), [updateRangeKeys]);

  // Load ranges when modal opens
  useEffect(() => {
    if (visible) {
      loadRangesForSync();
    } else {
      // Reset state when modal closes
      setLoading(true);
      setTheirRanges({});
      setTheirVersion(0);
      setNewRangeKeys([]);
      setUpdateRangeKeys([]);
      setSelectedKey('');
      setSelectedForImport(new Set());
      setError(null);
    }
  }, [visible]);

  // Set initial selection when keys change - only select NEW ranges by default, not updates
  useEffect(() => {
    if (sortedAllKeys.length > 0) {
      setSelectedKey(sortedAllKeys[0]);
      // By default, only select new ranges (not updates that would overwrite)
      setSelectedForImport(new Set(sortedNewKeys));
    }
  }, [sortedAllKeys, sortedNewKeys]);

  const loadRangesForSync = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getRangesForSync(linkView.link.id);
      setTheirRanges(data.theirRanges);
      setTheirVersion(data.theirVersion);
      setNewRangeKeys(data.newRangeKeys);
      setUpdateRangeKeys(data.updateRangeKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ranges');
    } finally {
      setLoading(false);
    }
  };

  // Toggle import selection for a range
  const toggleImport = useCallback((key: string) => {
    haptics.selectionChanged();
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
    setSelectedForImport(new Set(sortedAllKeys));
  }, [sortedAllKeys]);

  // Deselect all ranges
  const deselectAll = useCallback(() => {
    haptics.selectionChanged();
    setSelectedForImport(new Set());
  }, []);

  const handleSync = async () => {
    if (selectedForImport.size === 0) return;
    
    setSyncing(true);
    
    try {
      const selectedKeys = Array.from(selectedForImport);
      const syncResult = await syncSelectedFromLink(linkView.link.id, selectedKeys);
      
      // Auto-close and return to previous screen after successful sync
      onSuccess?.(syncResult);
      onClose();
      
      // Show a brief toast-style message
      if (syncResult.added > 0) {
        Alert.alert(
          'Sync Complete',
          `Added ${syncResult.added} range${syncResult.added !== 1 ? 's' : ''}${syncResult.skipped > 0 ? `, skipped ${syncResult.skipped} (you already had data)` : ''}.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No New Ranges',
          `You already have observations for all selected positions. No changes were made.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to sync ranges'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleClose = () => {
    if (!syncing) {
      onClose();
    }
  };
  
  // Handle dismissing the "all caught up" screen - mark as synced to clear notification
  const handleAllCaughtUpDone = async () => {
    try {
      // Mark as synced so notification clears
      if (theirVersion > 0) {
        await markLinkAsSynced(linkView.link.id, theirVersion);
      }
    } catch (err) {
      console.error('Failed to mark as synced:', err);
    }
    onClose();
  };

  // Get the current range data for preview
  const currentRange = theirRanges[selectedKey] || {};
  const hasSelections = rangeHasSelections(currentRange);
  const isCurrentKeyUpdate = updateKeySet.has(selectedKey);

  // Selection counts
  const selectedCount = selectedForImport.size;
  const totalCount = sortedAllKeys.length;
  const selectedUpdateCount = Array.from(selectedForImport).filter(k => updateKeySet.has(k)).length;

  // Loading state
  if (loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[previewStyles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
          <View style={[previewStyles.header, { borderBottomColor: themeColors.border, paddingTop: insets.top > 0 ? insets.top : 16 }]}>
            <View style={previewStyles.headerContent}>
              <Text style={[previewStyles.headerTitle, { color: themeColors.text }]}>
                Loading Updates...
              </Text>
              <Text style={[previewStyles.headerSubtitle, { color: themeColors.subText }]}>
                From {linkView.theirUserName}
              </Text>
            </View>
            <TouchableOpacity
              style={previewStyles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color={themeColors.subText} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={themeColors.accent} />
            <Text style={[{ color: themeColors.subText, marginTop: 16 }]}>
              Fetching ranges from {linkView.theirUserName}...
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Error state
  if (error) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[previewStyles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
          <View style={[previewStyles.header, { borderBottomColor: themeColors.border, paddingTop: insets.top > 0 ? insets.top : 16 }]}>
            <View style={previewStyles.headerContent}>
              <Text style={[previewStyles.headerTitle, { color: themeColors.text }]}>
                Error
              </Text>
            </View>
            <TouchableOpacity
              style={previewStyles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color={themeColors.subText} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Ionicons name="alert-circle" size={64} color="#e74c3c" />
            <Text style={[{ color: themeColors.text, fontSize: 16, marginTop: 16, textAlign: 'center' }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[sharedStyles.primaryButton, { marginTop: 24, paddingHorizontal: 32 }]}
              onPress={loadRangesForSync}
            >
              <Text style={sharedStyles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // No available ranges to sync (friend has no ranges with content)
  if (sortedAllKeys.length === 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[previewStyles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
          <View style={[previewStyles.header, { borderBottomColor: themeColors.border, paddingTop: insets.top > 0 ? insets.top : 16 }]}>
            <View style={previewStyles.headerContent}>
              <Text style={[previewStyles.headerTitle, { color: themeColors.text }]}>
                No Ranges Available
              </Text>
              <Text style={[previewStyles.headerSubtitle, { color: themeColors.subText }]}>
                From {linkView.theirUserName}
              </Text>
            </View>
            <TouchableOpacity
              style={previewStyles.closeButton}
              onPress={handleClose}
            >
              <Ionicons name="close" size={24} color={themeColors.subText} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Ionicons name="checkmark-circle" size={64} color={themeColors.success} />
            <Text style={[{ color: themeColors.text, fontSize: 18, fontWeight: '600', marginTop: 16 }]}>
              You're all caught up!
            </Text>
            <Text style={[{ color: themeColors.subText, fontSize: 14, marginTop: 8, textAlign: 'center' }]}>
              {linkView.theirUserName} hasn't added any ranges yet.
            </Text>
          </View>
          <View style={[previewStyles.footer, { borderTopColor: themeColors.border, paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
            <TouchableOpacity
              style={[sharedStyles.primaryButton, { backgroundColor: themeColors.accent }]}
              onPress={handleAllCaughtUpDone}
            >
              <Text style={sharedStyles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Main selection view
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[previewStyles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
        {/* Header */}
        <View
          style={[
            previewStyles.header,
            {
              borderBottomColor: themeColors.border,
              paddingTop: insets.top > 0 ? insets.top : 16,
            },
          ]}
        >
          <View style={previewStyles.headerContent}>
            <Text style={[previewStyles.headerTitle, { color: themeColors.text }]}>
              Select Ranges to Sync
            </Text>
            <Text style={[previewStyles.headerSubtitle, { color: themeColors.subText }]}>
              From {linkView.theirUserName}'s "{linkView.theirPlayerName}"
            </Text>
          </View>
          <TouchableOpacity
            style={previewStyles.closeButton}
            onPress={handleClose}
            disabled={syncing}
          >
            <Ionicons name="close" size={24} color={themeColors.subText} />
          </TouchableOpacity>
        </View>

        {/* Range Selector Tabs with Checkboxes */}
        <RangePreviewSelector
          rangeKeys={sortedAllKeys}
          selectedKey={selectedKey}
          onSelectKey={setSelectedKey}
          selectedForImport={selectedForImport}
          onToggleImport={toggleImport}
        />

        {/* Selection Summary */}
        <View 
          style={[
            previewStyles.selectionSummary, 
            { borderBottomColor: themeColors.border }
          ]}
        >
          <Text 
            style={[
              previewStyles.selectionSummaryText, 
              { color: selectedCount > 0 ? themeColors.accent : themeColors.subText }
            ]}
          >
            {selectedCount} of {totalCount} range{totalCount !== 1 ? 's' : ''} selected
          </Text>
        </View>

        {/* Bulk Actions */}
        {totalCount > 1 && (
          <View style={previewStyles.bulkActionsContainer}>
            <TouchableOpacity
              style={[previewStyles.bulkActionButton, { backgroundColor: themeColors.bulkActionBg }]}
              onPress={selectAll}
              disabled={selectedCount === totalCount}
            >
              <Text 
                style={[
                  previewStyles.bulkActionText, 
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
              style={[previewStyles.bulkActionButton, { backgroundColor: themeColors.bulkActionBg }]}
              onPress={deselectAll}
              disabled={selectedCount === 0}
            >
              <Text 
                style={[
                  previewStyles.bulkActionText, 
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
          style={previewStyles.contentContainer}
          contentContainerStyle={previewStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Current Range Title */}
          <View style={previewStyles.rangeSection}>
            <Text style={[previewStyles.rangeSectionTitle, { color: themeColors.text }]}>
              {formatRangeKeyFull(selectedKey)}
            </Text>
            {isCurrentKeyUpdate && (
              <View style={[localStyles.updateBadge, { backgroundColor: isDark ? '#4a3a00' : '#fff3cd' }]}>
                <Ionicons name="sync" size={14} color={isDark ? '#ffc107' : '#856404'} />
                <Text style={[localStyles.updateBadgeText, { color: isDark ? '#ffc107' : '#856404' }]}>
                  Update - will replace your existing range
                </Text>
              </View>
            )}
          </View>

          {/* Info Box - different message for new vs update */}
          {isCurrentKeyUpdate ? (
            <View
              style={[
                previewStyles.infoBox,
                { backgroundColor: isDark ? '#4a3a00' : '#fff3cd' },
              ]}
            >
              <Ionicons
                name="warning-outline"
                size={18}
                color={isDark ? '#ffc107' : '#856404'}
                style={previewStyles.infoIcon}
              />
              <Text
                style={[
                  previewStyles.infoText,
                  { color: isDark ? '#ffc107' : '#856404' },
                ]}
              >
                This will replace your current observations with {linkView.theirUserName}'s version.
              </Text>
            </View>
          ) : (
            <View
              style={[
                previewStyles.infoBox,
                { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd' },
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={isDark ? '#5dade2' : '#1565c0'}
                style={previewStyles.infoIcon}
              />
              <Text
                style={[
                  previewStyles.infoText,
                  { color: isDark ? '#5dade2' : '#1565c0' },
                ]}
              >
                New range - you don't have any observations here yet.
              </Text>
            </View>
          )}

          {/* Range Stats */}
          {hasSelections && <RangeStats range={currentRange} showDetails={false} />}

          {/* Range Grid (Read-only) */}
          <View style={previewStyles.gridWrapper}>
            {hasSelections ? (
              <RangeGrid
                range={currentRange}
                onRangeChange={() => {}}
                readonly={true}
                showPercentage={false}
              />
            ) : (
              <View
                style={[
                  previewStyles.emptyRangeContainer,
                  { backgroundColor: themeColors.emptyStateBg },
                ]}
              >
                <Ionicons
                  name="grid-outline"
                  size={48}
                  color={themeColors.subText}
                />
                <Text
                  style={[previewStyles.emptyRangeText, { color: themeColors.subText }]}
                >
                  No hands selected in this range
                </Text>
              </View>
            )}
          </View>

          {/* Summary of what will happen */}
          {sortedUpdateKeys.length > 0 && (
            <View style={[localStyles.summaryBox, { backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5', marginTop: 16 }]}>
              <Text style={[localStyles.summaryTitle, { color: themeColors.text }]}>
                Summary:
              </Text>
              {sortedNewKeys.length > 0 && (
                <View style={localStyles.summaryRow}>
                  <Ionicons name="add-circle" size={16} color={themeColors.success} />
                  <Text style={[localStyles.summaryText, { color: themeColors.subText }]}>
                    {sortedNewKeys.length} new range{sortedNewKeys.length !== 1 ? 's' : ''} (empty slots)
                  </Text>
                </View>
              )}
              <View style={localStyles.summaryRow}>
                <Ionicons name="sync" size={16} color="#ffc107" />
                <Text style={[localStyles.summaryText, { color: themeColors.subText }]}>
                  {sortedUpdateKeys.length} update{sortedUpdateKeys.length !== 1 ? 's' : ''} (will replace your data if selected)
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            previewStyles.footer,
            {
              borderTopColor: themeColors.border,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
            },
          ]}
        >
          {/* Warning if updates are selected */}
          {selectedUpdateCount > 0 && (
            <View style={[localStyles.footerWarning, { backgroundColor: isDark ? '#4a3a00' : '#fff3cd' }]}>
              <Ionicons name="warning" size={16} color={isDark ? '#ffc107' : '#856404'} />
              <Text style={[{ color: isDark ? '#ffc107' : '#856404', fontSize: 12, marginLeft: 6, flex: 1 }]}>
                {selectedUpdateCount} update{selectedUpdateCount !== 1 ? 's' : ''} will replace your existing observations
              </Text>
            </View>
          )}
          <View style={previewStyles.footerButtons}>
            <TouchableOpacity
              style={[
                previewStyles.cancelButton,
                { 
                  backgroundColor: 'transparent',
                  borderColor: themeColors.border,
                },
              ]}
              onPress={handleClose}
              disabled={syncing}
            >
              <Text style={[previewStyles.cancelButtonText, { color: themeColors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                previewStyles.acceptButton,
                { backgroundColor: themeColors.success },
                (selectedCount === 0 || syncing) && previewStyles.acceptButtonDisabled,
              ]}
              onPress={handleSync}
              disabled={selectedCount === 0 || syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={previewStyles.acceptButtonText}>
                  {selectedCount === 0
                    ? 'Select ranges'
                    : `Sync ${selectedCount} Range${selectedCount !== 1 ? 's' : ''}`
                  }
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  updateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  updateBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryBox: {
    padding: 12,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
  },
  footerWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
});
