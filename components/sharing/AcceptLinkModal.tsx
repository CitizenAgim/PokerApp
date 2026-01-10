/**
 * AcceptLinkModal
 * 
 * Modal that allows a user to accept a pending player link invitation.
 * User selects one of their existing players to link, or creates a new one.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlayers } from '@/hooks/usePlayer';
import { usePlayerLinks } from '@/hooks/usePlayerLinks';
import { getThemeColors, styles } from '@/styles/sharing/index.styles';
import { PlayerLink } from '@/types/sharing';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface AcceptLinkModalProps {
  visible: boolean;
  onClose: () => void;
  link: PlayerLink;
  onSuccess?: () => void;
  onDecline?: () => void;
}

export function AcceptLinkModal({
  visible,
  onClose,
  link,
  onSuccess,
  onDecline,
}: AcceptLinkModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  
  const { players, loading: playersLoading } = usePlayers();
  const { acceptLink, declineLink, linkCountInfo } = usePlayerLinks();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Filter players by search query
  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPlayer = async (playerId: string, playerName: string) => {
    Alert.alert(
      'Accept Link',
      `Link your "${playerName}" with ${link.userAName}'s "${link.userAPlayerName}"? You'll both be able to sync ranges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setSelectedPlayerId(playerId);
            setAccepting(true);
            
            try {
              await acceptLink(link.id, playerId, playerName);
              
              Alert.alert(
                'Link Established!',
                `Your players are now linked. You can sync ranges from ${link.userAName} anytime.`,
                [{ text: 'OK', onPress: () => {
                  onSuccess?.();
                  onClose();
                }}]
              );
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to accept link'
              );
            } finally {
              setAccepting(false);
              setSelectedPlayerId(null);
            }
          },
        },
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Link',
      `Decline the link request from ${link.userAName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setDeclining(true);
            
            try {
              await declineLink(link.id);
              onDecline?.();
              onClose();
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to decline link'
              );
            } finally {
              setDeclining(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    if (!accepting && !declining) {
      setSearchQuery('');
      setSelectedPlayerId(null);
      onClose();
    }
  };

  const renderPlayerItem = ({ item }: { item: typeof players[0] }) => {
    const isSelected = selectedPlayerId === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.playerItem,
          { backgroundColor: themeColors.card, borderColor: themeColors.border },
        ]}
        onPress={() => handleSelectPlayer(item.id, item.name)}
        disabled={accepting || declining}
      >
        <View 
          style={[
            styles.playerColorDot, 
            { backgroundColor: item.color || '#9b59b6' }
          ]} 
        />
        <Text style={[styles.playerName, { color: themeColors.text }]}>
          {item.name}
        </Text>
        {isSelected && accepting ? (
          <ActivityIndicator size="small" color={themeColors.accent} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={themeColors.subText} />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name="person-outline" 
        size={48} 
        color={themeColors.subText} 
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
        No Players Found
      </Text>
      <Text style={[styles.emptyText, { color: themeColors.subText }]}>
        {searchQuery ? 'Try a different search term.' : 'Create a player first to accept this link.'}
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
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Accept Player Link
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.subText }]}>
              From {link.userAName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleClose}
            disabled={accepting || declining}
          >
            <Ionicons name="close" size={24} color={themeColors.subText} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.modalContent}>
          {/* Link invite card */}
          <View style={[localStyles.inviteCard, { 
            backgroundColor: isDark ? '#2c2c2e' : '#f8f9fa',
            borderColor: themeColors.border,
          }]}>
            <View style={localStyles.inviteHeader}>
              <Ionicons name="link" size={24} color={themeColors.accent} />
              <Text style={[localStyles.inviteTitle, { color: themeColors.text }]}>
                Link Request
              </Text>
            </View>
            <Text style={[localStyles.inviteDescription, { color: themeColors.subText }]}>
              {link.userAName} wants to link their player "{link.userAPlayerName}" with one of your players.
            </Text>
          </View>

          {/* Info box */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd', marginTop: 0, marginBottom: 16 }]}>
            <Text style={[styles.infoBoxText, { color: isDark ? '#64b5f6' : '#1565c0' }]}>
              🔗 Select one of your players to link. Once linked, you'll both be able to sync range updates. Your existing observations are never overwritten automatically.
            </Text>
          </View>

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

          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.searchInput,
                { 
                  backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
                  color: themeColors.text,
                  borderColor: themeColors.border,
                }
              ]}
              placeholder="Search your players..."
              placeholderTextColor={themeColors.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={!accepting && !declining}
            />
          </View>

          {/* Player list */}
          {playersLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredPlayers}
              keyExtractor={(item) => item.id}
              renderItem={renderPlayerItem}
              contentContainerStyle={filteredPlayers.length === 0 ? { flex: 1 } : undefined}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Footer */}
        <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
          <View style={localStyles.footerButtons}>
            <TouchableOpacity
              style={[localStyles.declineButton, { borderColor: themeColors.danger }]}
              onPress={handleDecline}
              disabled={accepting || declining}
            >
              {declining ? (
                <ActivityIndicator size="small" color={themeColors.danger} />
              ) : (
                <Text style={[localStyles.declineButtonText, { color: themeColors.danger }]}>
                  Decline
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleClose}
              disabled={accepting || declining}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  inviteCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  inviteDescription: {
    fontSize: 14,
    lineHeight: 20,
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
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  declineButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
