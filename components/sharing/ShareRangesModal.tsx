/**
 * ShareRangesModal
 * 
 * Modal that allows a user to select a friend and share player ranges with them.
 * Supports two modes:
 * - One-Time Share: Send ranges to a friend once
 * - Create Link: Set up bidirectional automatic sync
 * 
 * Only ranges are shared - notes and other personal data are excluded for privacy.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFriends } from '@/hooks/useFriends';
import { usePlayerLinks } from '@/hooks/usePlayerLinks';
import { useRangeSharing } from '@/hooks/useRangeSharing';
import { getThemeColors, styles } from '@/styles/sharing/index.styles';
import { Range } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type ShareMode = 'one-time' | 'link';

interface ShareRangesModalProps {
  visible: boolean;
  onClose: () => void;
  playerId?: string;  // Optional - required for link mode
  playerName: string;
  ranges: Record<string, Range>;
  onSuccess?: () => void;
}

export function ShareRangesModal({
  visible,
  onClose,
  playerId,
  playerName,
  ranges,
  onSuccess,
}: ShareRangesModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  
  const { friends, loading: friendsLoading } = useFriends();
  const { sendShare } = useRangeSharing();
  const { createLink, linkCountInfo, activeLinks } = usePlayerLinks();
  
  const [sending, setSending] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [mode, setMode] = useState<ShareMode>('one-time');

  // Get existing link friend IDs to filter them out in link mode
  const linkedFriendIds = new Set(
    activeLinks
      .filter(link => link.myPlayerId === playerId)
      .map(link => link.theirUserId)
  );

  // Filter friends based on mode
  const availableFriends = mode === 'link' && playerId
    ? friends.filter(friend => !linkedFriendIds.has(friend.odUserId))
    : friends;

  // Count non-empty ranges
  const rangeCount = Object.entries(ranges).filter(([_, range]) => 
    Object.values(range).some(state => state !== 'unselected')
  ).length;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSelectFriend = async (friendId: string, friendName: string) => {
    if (mode === 'link') {
      // Handle link creation
      if (!playerId) {
        Alert.alert('Error', 'Player ID is required to create a link');
        return;
      }
      
      Alert.alert(
        'Create Two-Way Link',
        `Create a link with ${friendName}? You'll both be able to sync range updates for this player.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Link',
            onPress: async () => {
              setSending(true);
              setSelectedFriendId(friendId);
              
              try {
                await createLink(friendId, friendName, playerId, playerName);
                
                Alert.alert(
                  'Link Request Sent!',
                  `${friendName} will receive your link request. Once they accept and select their player, you'll both be able to sync ranges.`,
                  [{ text: 'OK', onPress: () => {
                    onSuccess?.();
                    onClose();
                  }}]
                );
              } catch (error) {
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to create link'
                );
              } finally {
                setSending(false);
                setSelectedFriendId(null);
              }
            },
          },
        ]
      );
    } else {
      // Handle one-time share
      Alert.alert(
        'Share Ranges',
        `Share ${playerName}'s ranges (${rangeCount} total) with ${friendName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share',
            onPress: async () => {
              setSending(true);
              setSelectedFriendId(friendId);
              
              try {
                await sendShare(friendId, friendName, playerName, ranges);
                
                Alert.alert(
                  'Shared!',
                  `${playerName}'s ranges have been shared with ${friendName}.`,
                  [{ text: 'OK', onPress: () => {
                    onSuccess?.();
                    onClose();
                  }}]
                );
              } catch (error) {
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to share ranges'
                );
              } finally {
                setSending(false);
                setSelectedFriendId(null);
              }
            },
          },
        ]
      );
    }
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
    }
  };

  const renderFriendItem = ({ item }: { item: typeof friends[0] }) => {
    const isSelected = selectedFriendId === item.odUserId;
    
    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          { backgroundColor: themeColors.card, borderColor: themeColors.border },
          isSelected && styles.friendItemSelected,
        ]}
        onPress={() => handleSelectFriend(item.odUserId, item.displayName)}
        disabled={sending}
      >
        <View style={styles.friendAvatar}>
          <Text style={styles.friendAvatarText}>{getInitials(item.displayName)}</Text>
        </View>
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: themeColors.text }]}>
            {item.displayName}
          </Text>
          <Text style={[styles.friendCode, { color: themeColors.subText }]}>
            {item.friendCode}
          </Text>
        </View>
        {isSelected && sending ? (
          <ActivityIndicator size="small" color={themeColors.accent} />
        ) : (
          <View style={styles.selectButton}>
            <Text style={styles.selectButtonText}>
              {mode === 'link' ? 'Link' : 'Share'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={mode === 'link' ? 'link-outline' : 'people-outline'} 
        size={48} 
        color={themeColors.subText} 
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {friends.length === 0 
          ? 'No Friends Yet' 
          : mode === 'link' && availableFriends.length === 0
            ? 'All Friends Linked'
            : 'No Friends Yet'}
      </Text>
      <Text style={[styles.emptyText, { color: themeColors.subText }]}>
        {friends.length === 0 
          ? 'Add friends to share ranges with them.'
          : mode === 'link' && availableFriends.length === 0
            ? "You've already linked this player with all your friends."
            : 'Add friends to share ranges with them.'}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground, flex: 1 }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
          <View>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              {mode === 'link' ? 'Create Player Link' : 'Share Ranges'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.subText }]}>
              {playerName} {mode !== 'link' && `• ${rangeCount} ranges`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleClose}
            disabled={sending}
          >
            <Ionicons name="close" size={24} color={themeColors.subText} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.modalContent}>
          {/* Mode Selector - only show if playerId is provided */}
          {playerId && (
            <View style={[localStyles.modeSelector, { borderColor: themeColors.border }]}>
              <TouchableOpacity
                style={[
                  localStyles.modeButton,
                  mode === 'one-time' && localStyles.modeButtonActive,
                  mode === 'one-time' && { backgroundColor: themeColors.accent },
                ]}
                onPress={() => setMode('one-time')}
                disabled={sending}
              >
                <Ionicons 
                  name="send-outline" 
                  size={16} 
                  color={mode === 'one-time' ? '#fff' : themeColors.text} 
                />
                <Text style={[
                  localStyles.modeButtonText,
                  { color: mode === 'one-time' ? '#fff' : themeColors.text },
                ]}>
                  One-Time
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  localStyles.modeButton,
                  mode === 'link' && localStyles.modeButtonActive,
                  mode === 'link' && { backgroundColor: themeColors.accent },
                ]}
                onPress={() => setMode('link')}
                disabled={sending}
              >
                <Ionicons 
                  name="link-outline" 
                  size={16} 
                  color={mode === 'link' ? '#fff' : themeColors.text} 
                />
                <Text style={[
                  localStyles.modeButtonText,
                  { color: mode === 'link' ? '#fff' : themeColors.text },
                ]}>
                  Create Link
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Description */}
          <Text style={[styles.shareModalDescription, { color: themeColors.subText }]}>
            {mode === 'link'
              ? 'Create a two-way link with a friend. You\'ll both be able to sync range updates automatically.'
              : 'Select a friend to share this player\'s ranges with. Only ranges will be shared - notes are kept private.'}
          </Text>

          {/* Link count info - only for link mode */}
          {mode === 'link' && linkCountInfo && (
            <View style={[localStyles.linkCountContainer, { 
              backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
              borderColor: themeColors.border,
            }]}>
              <Ionicons name="link" size={16} color={themeColors.accent} />
              <Text style={[localStyles.linkCountText, { color: themeColors.text }]}>
                Links available: {linkCountInfo.remaining} / {linkCountInfo.max}
              </Text>
            </View>
          )}

          {/* Info box for link mode */}
          {mode === 'link' && (
            <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd' }]}>
              <Text style={[styles.infoBoxText, { color: isDark ? '#64b5f6' : '#1565c0' }]}>
                🔗 Once linked, both you and your friend can pull range updates from each other. Your existing observations are never overwritten automatically.
              </Text>
            </View>
          )}

          {friendsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.accent} />
            </View>
          ) : (
            <FlatList
              data={availableFriends}
              keyExtractor={(item) => item.odUserId}
              renderItem={renderFriendItem}
              contentContainerStyle={availableFriends.length === 0 ? { flex: 1 } : { paddingTop: 12 }}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Footer */}
        <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleClose}
            disabled={sending}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  modeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#0a7ea4',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  linkCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  linkCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
