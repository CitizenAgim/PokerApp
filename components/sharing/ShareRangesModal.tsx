/**
 * ShareRangesModal
 * 
 * Modal that allows a user to select a friend and share player ranges with them.
 * Only ranges are shared - notes and other personal data are excluded for privacy.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFriends } from '@/hooks/useFriends';
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
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ShareRangesModalProps {
  visible: boolean;
  onClose: () => void;
  playerName: string;
  ranges: Record<string, Range>;
  onSuccess?: () => void;
}

export function ShareRangesModal({
  visible,
  onClose,
  playerName,
  ranges,
  onSuccess,
}: ShareRangesModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  
  const { friends, loading: friendsLoading } = useFriends();
  const { sendShare } = useRangeSharing();
  
  const [sending, setSending] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

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
    // Confirm before sending
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
            <Text style={styles.selectButtonText}>Select</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="people-outline" 
        size={48} 
        color={themeColors.subText} 
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        No Friends Yet
      </Text>
      <Text style={[styles.emptyText, { color: themeColors.subText }]}>
        Add friends to share ranges with them.
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
              Share Ranges
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.subText }]}>
              {playerName} • {rangeCount} ranges
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
          <Text style={[styles.shareModalDescription, { color: themeColors.subText }]}>
            Select a friend to share this player's ranges with.
            Only ranges will be shared - notes are kept private.
          </Text>

          {friendsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.accent} />
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.odUserId}
              renderItem={renderFriendItem}
              contentContainerStyle={friends.length === 0 ? { flex: 1 } : undefined}
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
