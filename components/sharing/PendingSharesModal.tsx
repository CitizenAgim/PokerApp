/**
 * PendingSharesModal
 * 
 * Modal that displays pending range shares from a specific friend.
 * User can accept (copy to player or create new) or dismiss each share.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRangeSharing } from '@/hooks/useRangeSharing';
import { getThemeColors, styles } from '@/styles/sharing/index.styles';
import { RangeShare } from '@/types/sharing';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CreatePlayerModal } from './CreatePlayerModal';
import { RangePreviewModal } from './RangePreviewModal';
import { SelectPlayerModal } from './SelectPlayerModal';

interface PendingSharesModalProps {
  visible: boolean;
  onClose: () => void;
  friendId: string;
  friendName: string;
}

// Helper to format range keys into readable position/action groups
function formatRangeKeys(rangeKeys: string[]): { position: string; actions: string[] }[] {
  const positionMap: Record<string, string[]> = {};
  
  for (const key of rangeKeys) {
    const [position, action] = key.split('_');
    if (!positionMap[position]) {
      positionMap[position] = [];
    }
    // Format action: "open-raise" -> "Open-Raise"
    const formattedAction = action
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-');
    positionMap[position].push(formattedAction);
  }

  // Format position names and return
  return Object.entries(positionMap).map(([position, actions]) => ({
    position: position.charAt(0).toUpperCase() + position.slice(1),
    actions,
  }));
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PendingSharesModal({
  visible,
  onClose,
  friendId,
  friendName,
}: PendingSharesModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  
  const { getSharesFromFriend, dismissShare } = useRangeSharing();
  
  const [shares, setShares] = useState<RangeShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  
  // Modal states for import
  const [selectPlayerModalVisible, setSelectPlayerModalVisible] = useState(false);
  const [createPlayerModalVisible, setCreatePlayerModalVisible] = useState(false);
  const [selectedShare, setSelectedShare] = useState<RangeShare | null>(null);
  const [selectedKeysForImport, setSelectedKeysForImport] = useState<string[] | undefined>(undefined);
  
  // Preview modal state
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewShare, setPreviewShare] = useState<RangeShare | null>(null);
  const [previewMode, setPreviewMode] = useState<'view' | 'select'>('view');

  // Load shares when modal opens
  useEffect(() => {
    if (visible && friendId) {
      loadShares();
    }
  }, [visible, friendId]);

  const loadShares = async () => {
    setLoading(true);
    try {
      const result = await getSharesFromFriend(friendId);
      setShares(result);
    } catch (error) {
      console.error('Failed to load shares:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (share: RangeShare) => {
    setPreviewShare(share);
    setPreviewMode('view');
    setPreviewModalVisible(true);
  };

  const handleSelectAndImport = (share: RangeShare) => {
    setPreviewShare(share);
    setPreviewMode('select');
    setPreviewModalVisible(true);
  };

  const handleAcceptSelected = (selectedKeys: string[]) => {
    if (!previewShare) return;
    
    setPreviewModalVisible(false);
    setSelectedShare(previewShare);
    setSelectedKeysForImport(selectedKeys);
    setPreviewShare(null);
    
    // Show action choice alert
    Alert.alert(
      'Import Ranges',
      `Import ${selectedKeys.length} range${selectedKeys.length !== 1 ? 's' : ''} to:`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {
          setSelectedShare(null);
          setSelectedKeysForImport(undefined);
        }},
        { 
          text: 'Existing Player', 
          onPress: () => setSelectPlayerModalVisible(true)
        },
        { 
          text: 'New Player', 
          onPress: () => setCreatePlayerModalVisible(true)
        },
      ]
    );
  };

  const handleCopyToPlayer = (share: RangeShare) => {
    setSelectedShare(share);
    setSelectedKeysForImport(undefined); // Import all ranges
    setSelectPlayerModalVisible(true);
  };

  const handleCreateNew = (share: RangeShare) => {
    setSelectedShare(share);
    setSelectedKeysForImport(undefined); // Import all ranges
    setCreatePlayerModalVisible(true);
  };

  const handleDismiss = (share: RangeShare) => {
    Alert.alert(
      'Dismiss Share',
      `Are you sure you want to dismiss "${share.playerName}" ranges from ${share.fromUserName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: async () => {
            setDismissingId(share.id);
            try {
              await dismissShare(share.id);
              setShares(prev => prev.filter(s => s.id !== share.id));
              
              // Close modal if no more shares
              if (shares.length === 1) {
                onClose();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to dismiss share');
            } finally {
              setDismissingId(null);
            }
          },
        },
      ]
    );
  };

  const handleImportSuccess = (shareId: string) => {
    setShares(prev => prev.filter(s => s.id !== shareId));
    setSelectedShare(null);
    setSelectedKeysForImport(undefined);
    setSelectPlayerModalVisible(false);
    setCreatePlayerModalVisible(false);
    
    // Close modal if no more shares
    if (shares.length === 1) {
      onClose();
    }
  };

  const renderShareItem = ({ item }: { item: RangeShare }) => {
    const rangeGroups = formatRangeKeys(item.rangeKeys);
    const isDismissing = dismissingId === item.id;
    
    return (
      <View style={[styles.shareCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <View style={styles.shareCardHeader}>
          <Text style={[styles.sharePlayerName, { color: themeColors.text }]}>
            "{item.playerName}" Ranges
          </Text>
          <Text style={[styles.shareRangeCount, { color: themeColors.accent }]}>
            {item.rangeCount} ranges defined
          </Text>
        </View>
        
        {/* Range preview */}
        <View style={styles.shareRangeList}>
          {rangeGroups.slice(0, 3).map((group, index) => (
            <View key={index} style={styles.shareRangeGroup}>
              <Text style={[styles.shareRangePosition, { color: themeColors.text }]}>
                • {group.position}:{' '}
              </Text>
              <Text style={[styles.shareRangeActions, { color: themeColors.subText }]}>
                {group.actions.join(', ')}
              </Text>
            </View>
          ))}
          {rangeGroups.length > 3 && (
            <Text style={[styles.shareRangeActions, { color: themeColors.subText }]}>
              ...and {rangeGroups.length - 3} more positions
            </Text>
          )}
        </View>
        
        <Text style={[styles.shareDate, { color: themeColors.subText }]}>
          Sent: {formatDate(item.createdAt)}
        </Text>
        
        {/* Preview button */}
        <TouchableOpacity
          style={[styles.shareActionButton, { 
            backgroundColor: isDark ? '#3a3a3c' : '#e8e8e8',
            marginTop: 12,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }]}
          onPress={() => handlePreview(item)}
          disabled={isDismissing}
        >
          <Ionicons name="eye-outline" size={16} color={themeColors.subText} />
          <Text style={[styles.shareActionText, { color: themeColors.subText }]}>
            Preview
          </Text>
        </TouchableOpacity>
        
        {/* Select & Import button */}
        <TouchableOpacity
          style={[styles.shareActionButton, { 
            backgroundColor: themeColors.accent,
            marginTop: 8,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }]}
          onPress={() => handleSelectAndImport(item)}
          disabled={isDismissing}
        >
          <Ionicons name="checkbox-outline" size={16} color="#fff" />
          <Text style={[styles.shareActionText, { color: '#fff', fontWeight: '600' }]}>
            Select & Import Ranges
          </Text>
        </TouchableOpacity>
        
        {/* Action buttons */}
        <View style={styles.shareActions}>
          <TouchableOpacity
            style={[styles.shareActionButton, styles.copyToPlayerButton]}
            onPress={() => handleCopyToPlayer(item)}
            disabled={isDismissing}
          >
            <Text style={[styles.shareActionText, styles.shareActionTextLight]}>
              Import All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.shareActionButton, styles.createNewButton]}
            onPress={() => handleCreateNew(item)}
            disabled={isDismissing}
          >
            <Text style={[styles.shareActionText, styles.shareActionTextLight]}>
              New Player
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[
            styles.shareActionButton, 
            styles.dismissButton,
            { marginTop: 8, backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5' }
          ]}
          onPress={() => handleDismiss(item)}
          disabled={isDismissing}
        >
          {isDismissing ? (
            <ActivityIndicator size="small" color={themeColors.subText} />
          ) : (
            <Text style={[styles.shareActionText, styles.shareActionTextDark]}>
              Dismiss
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="document-outline" 
        size={48} 
        color={themeColors.subText} 
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        No Pending Shares
      </Text>
      <Text style={[styles.emptyText, { color: themeColors.subText }]}>
        {friendName} hasn't shared any ranges with you.
      </Text>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground, flex: 1 }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Shared Ranges
              </Text>
              <Text style={[styles.modalSubtitle, { color: themeColors.subText }]}>
                From {friendName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={themeColors.subText} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.modalContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.accent} />
              </View>
            ) : (
              <FlatList
                data={shares}
                keyExtractor={(item) => item.id}
                renderItem={renderShareItem}
                contentContainerStyle={shares.length === 0 ? { flex: 1 } : undefined}
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Select Player Modal */}
      {selectedShare && (
        <SelectPlayerModal
          visible={selectPlayerModalVisible}
          onClose={() => {
            setSelectPlayerModalVisible(false);
            setSelectedShare(null);
            setSelectedKeysForImport(undefined);
          }}
          share={selectedShare}
          onSuccess={() => handleImportSuccess(selectedShare.id)}
          selectedKeys={selectedKeysForImport}
        />
      )}

      {/* Create Player Modal */}
      {selectedShare && (
        <CreatePlayerModal
          visible={createPlayerModalVisible}
          onClose={() => {
            setCreatePlayerModalVisible(false);
            setSelectedShare(null);
            setSelectedKeysForImport(undefined);
          }}
          share={selectedShare}
          onSuccess={() => handleImportSuccess(selectedShare.id)}
          selectedKeys={selectedKeysForImport}
        />
      )}

      {/* Range Preview Modal */}
      {previewShare && (
        <RangePreviewModal
          visible={previewModalVisible}
          onClose={() => {
            setPreviewModalVisible(false);
            setPreviewShare(null);
          }}
          playerName={previewShare.playerName}
          ranges={previewShare.ranges}
          rangeKeys={previewShare.rangeKeys}
          onAcceptSelected={previewMode === 'select' ? handleAcceptSelected : undefined}
        />
      )}
    </>
  );
}
