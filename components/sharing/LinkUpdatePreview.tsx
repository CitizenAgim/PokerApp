/**
 * LinkUpdatePreview
 * 
 * Modal that shows a preview of range updates available from a linked player.
 * User can accept all updates or dismiss.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlayerLinks } from '@/hooks/usePlayerLinks';
import { getThemeColors, styles } from '@/styles/sharing/index.styles';
import { Position } from '@/types/poker';
import { PlayerLinkView, SyncRangesResult } from '@/types/sharing';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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

interface LinkUpdatePreviewProps {
  visible: boolean;
  onClose: () => void;
  linkView: PlayerLinkView;
  onSuccess?: (result: SyncRangesResult) => void;
}

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
  
  const { syncFromLink } = usePlayerLinks();
  
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncRangesResult | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    
    try {
      const syncResult = await syncFromLink(linkView.link.id);
      setResult(syncResult);
      
      if (syncResult.added === 0) {
        Alert.alert(
          'No New Ranges',
          `You already have observations for all shared positions. No changes were made.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to sync ranges'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDone = () => {
    if (result) {
      onSuccess?.(result);
    }
    setResult(null);
    onClose();
  };

  const handleClose = () => {
    if (!syncing) {
      setResult(null);
      onClose();
    }
  };

  // Result screen
  if (result && result.added > 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDone}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground, flex: 1, maxHeight: undefined }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Sync Complete
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleDone}
            >
              <Ionicons name="close" size={24} color={themeColors.subText} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.resultContainer}>
              <Ionicons 
                name="checkmark-circle" 
                size={64} 
                color={themeColors.success} 
                style={styles.resultIcon}
              />
              <Text style={[styles.resultTitle, { color: themeColors.success }]}>
                Ranges Synced!
              </Text>
              <Text style={[styles.resultText, { color: themeColors.subText }]}>
                From {linkView.theirUserName}'s "{linkView.theirPlayerName}"
              </Text>
              
              <View style={[styles.resultStats, { backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5' }]}>
                <View style={styles.resultStatRow}>
                  <Text style={[styles.resultStatLabel, { color: themeColors.subText }]}>
                    Ranges added:
                  </Text>
                  <Text style={[styles.resultStatValue, { color: themeColors.success }]}>
                    {result.added}
                  </Text>
                </View>
                {result.skipped > 0 && (
                  <View style={styles.resultStatRow}>
                    <Text style={[styles.resultStatLabel, { color: themeColors.subText }]}>
                      Skipped (you already had):
                    </Text>
                    <Text style={[styles.resultStatValue, { color: themeColors.warning }]}>
                      {result.skipped}
                    </Text>
                  </View>
                )}
              </View>

              {/* Show added ranges */}
              {result.rangeKeysAdded.length > 0 && (
                <View style={[localStyles.rangesList, { backgroundColor: isDark ? '#1a3a2a' : '#e8f5e9' }]}>
                  <Text style={[localStyles.rangesListTitle, { color: themeColors.success }]}>
                    Added Ranges:
                  </Text>
                  {result.rangeKeysAdded.map(key => {
                    const [position, action] = key.split('_');
                    return (
                      <Text key={key} style={[localStyles.rangeItem, { color: isDark ? '#81c784' : '#2e7d32' }]}>
                        • {formatPosition(position)} - {formatAction(action)}
                      </Text>
                    );
                  })}
                </View>
              )}
              
              {result.skipped > 0 && (
                <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd', marginTop: 16 }]}>
                  <Text style={[styles.infoBoxText, { color: isDark ? '#64b5f6' : '#1565c0' }]}>
                    ℹ️ Your existing observations were preserved. Only empty positions received new ranges.
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.modalFooter, { borderTopColor: themeColors.border, paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleDone}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground, flex: 1, maxHeight: undefined }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Sync Updates
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.subText }]}>
              From {linkView.theirUserName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleClose}
            disabled={syncing}
          >
            <Ionicons name="close" size={24} color={themeColors.subText} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.modalContent}>
          {/* Update card */}
          <View style={[localStyles.updateCard, { 
            backgroundColor: isDark ? '#2c2c2e' : '#f8f9fa',
            borderColor: themeColors.accent,
          }]}>
            <View style={localStyles.updateHeader}>
              <Ionicons name="sync" size={24} color={themeColors.accent} />
              <Text style={[localStyles.updateTitle, { color: themeColors.text }]}>
                Updates Available
              </Text>
            </View>
            
            <View style={localStyles.updateDetails}>
              <View style={localStyles.updateDetailRow}>
                <Text style={[localStyles.updateDetailLabel, { color: themeColors.subText }]}>
                  From:
                </Text>
                <Text style={[localStyles.updateDetailValue, { color: themeColors.text }]}>
                  {linkView.theirUserName}
                </Text>
              </View>
              <View style={localStyles.updateDetailRow}>
                <Text style={[localStyles.updateDetailLabel, { color: themeColors.subText }]}>
                  Their player:
                </Text>
                <Text style={[localStyles.updateDetailValue, { color: themeColors.text }]}>
                  {linkView.theirPlayerName}
                </Text>
              </View>
              <View style={localStyles.updateDetailRow}>
                <Text style={[localStyles.updateDetailLabel, { color: themeColors.subText }]}>
                  Your player:
                </Text>
                <Text style={[localStyles.updateDetailValue, { color: themeColors.text }]}>
                  {linkView.myPlayerName}
                </Text>
              </View>
              {linkView.theirRangeVersion !== null && (
                <View style={localStyles.updateDetailRow}>
                  <Text style={[localStyles.updateDetailLabel, { color: themeColors.subText }]}>
                    Their version:
                  </Text>
                  <Text style={[localStyles.updateDetailValue, { color: themeColors.accent }]}>
                    v{linkView.theirRangeVersion} (yours: v{linkView.myLastSyncedVersion})
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Info box */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd', marginTop: 16 }]}>
            <Text style={[styles.infoBoxText, { color: isDark ? '#64b5f6' : '#1565c0' }]}>
              ℹ️ Only empty range slots will be filled. Your existing observations will NOT be changed. You can always sync again later.
            </Text>
          </View>

          {/* How it works */}
          <View style={[localStyles.howItWorks, { borderColor: themeColors.border }]}>
            <Text style={[localStyles.howItWorksTitle, { color: themeColors.text }]}>
              How syncing works:
            </Text>
            <View style={localStyles.howItWorksItem}>
              <Ionicons name="checkmark-circle" size={16} color={themeColors.success} />
              <Text style={[localStyles.howItWorksText, { color: themeColors.subText }]}>
                Ranges you don't have → Added from friend
              </Text>
            </View>
            <View style={localStyles.howItWorksItem}>
              <Ionicons name="shield-checkmark" size={16} color={themeColors.accent} />
              <Text style={[localStyles.howItWorksText, { color: themeColors.subText }]}>
                Ranges you already have → Kept as-is (protected)
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.modalFooter, { borderTopColor: themeColors.border, paddingBottom: insets.bottom + 20 }]}>
          <View style={localStyles.footerButtons}>
            <TouchableOpacity
              style={[
                styles.secondaryButton, 
                { flex: 1, backgroundColor: themeColors.card, borderColor: themeColors.border }
              ]}
              onPress={handleClose}
              disabled={syncing}
            >
              <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 2 }, syncing && styles.primaryButtonDisabled]}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Sync Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  updateCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  updateTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  updateDetails: {
    gap: 8,
  },
  updateDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  updateDetailLabel: {
    fontSize: 14,
  },
  updateDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  howItWorks: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  howItWorksTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  howItWorksText: {
    fontSize: 13,
    flex: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rangesList: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  rangesListTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  rangeItem: {
    fontSize: 13,
    marginBottom: 4,
  },
});
