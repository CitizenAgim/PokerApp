/**
 * CreateLinkModal
 * 
 * Modal that allows a user to create a bidirectional player link with a friend.
 * The friend will receive a link invite and can accept by selecting their own player.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFriends } from '@/hooks/useFriends';
import { usePlayerLinks } from '@/hooks/usePlayerLinks';
import { getThemeColors, styles } from '@/styles/sharing/index.styles';
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

interface CreateLinkModalProps {
  visible: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
  onSuccess?: () => void;
}

export function CreateLinkModal({
  visible,
  onClose,
  playerId,
  playerName,
  onSuccess,
}: CreateLinkModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  
  const { friends, loading: friendsLoading } = useFriends();
  const { createLink, linkCountInfo, activeLinks } = usePlayerLinks();
  
  const [sending, setSending] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // Get existing link friend IDs to filter them out
  const linkedFriendIds = new Set(
    activeLinks
      .filter(link => 
        link.userAPlayerId === playerId || link.userBPlayerId === playerId
      )
      .map(link => link.userAId === playerId ? link.userBId : link.userAId)
  );

  // Filter out friends who are already linked
  const availableFriends = friends.filter(
    friend => !linkedFriendIds.has(friend.odUserId)
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSelectFriend = async (friendId: string, friendName: string) => {
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
            <Text style={styles.selectButtonText}>Link</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="link-outline" 
        size={48} 
        color={themeColors.subText} 
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        {friends.length === 0 ? 'No Friends Yet' : 'All Friends Linked'}
      </Text>
      <Text style={[styles.emptyText, { color: themeColors.subText }]}>
        {friends.length === 0 
          ? 'Add friends to create player links with them.'
          : 'You\'ve already linked this player with all your friends.'}
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
              Create Player Link
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.subText }]}>
              {playerName}
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
          {/* Description */}
          <Text style={[styles.shareModalDescription, { color: themeColors.subText }]}>
            Create a two-way link with a friend. You'll both be able to sync range updates automatically.
          </Text>

          {/* Link count info */}
          {linkCountInfo && (
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

          {/* Info box */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd' }]}>
            <Text style={[styles.infoBoxText, { color: isDark ? '#64b5f6' : '#1565c0' }]}>
              🔗 Once linked, both you and your friend can pull range updates from each other. Your existing observations are never overwritten automatically.
            </Text>
          </View>

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
