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
import { UserPlayerLink } from '@/types/sharing';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AcceptLinkModalProps {
  visible: boolean;
  onClose: () => void;
  link: UserPlayerLink;
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
  const insets = useSafeAreaInsets();
  
  const { players, loading: playersLoading, createPlayer } = usePlayers();
  const { acceptLink, declineLink, linkCountInfo, syncFromLink } = usePlayerLinks();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
  // Create new player state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [creating, setCreating] = useState(false);

  // Filter players by search query
  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPlayer = async (playerId: string, playerName: string) => {
    Alert.alert(
      'Accept Link',
      `Link your "${playerName}" with ${link.theirUserName}'s "${link.theirPlayerName}"? You'll both be able to sync ranges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setSelectedPlayerId(playerId);
            setAccepting(true);
            
            try {
              await acceptLink(link.id, playerId, playerName);
              
              // Offer to sync ranges immediately
              Alert.alert(
                'Link Established!',
                `Your players are now linked. Would you like to sync ${link.theirUserName}'s ranges now?`,
                [
                  { 
                    text: 'Later', 
                    style: 'cancel',
                    onPress: () => {
                      onSuccess?.();
                      onClose();
                    }
                  },
                  {
                    text: 'Sync Now',
                    onPress: async () => {
                      try {
                        const result = await syncFromLink(link.id);
                        Alert.alert(
                          'Sync Complete!',
                          `Added ${result.added} range${result.added !== 1 ? 's' : ''}${result.skipped > 0 ? `, skipped ${result.skipped} (you already had data)` : ''}.`,
                          [{ text: 'OK', onPress: () => {
                            onSuccess?.();
                            onClose();
                          }}]
                        );
                      } catch (syncError) {
                        Alert.alert(
                          'Sync Failed',
                          syncError instanceof Error ? syncError.message : 'Failed to sync ranges. You can try again from the player detail screen.',
                          [{ text: 'OK', onPress: () => {
                            onSuccess?.();
                            onClose();
                          }}]
                        );
                      }
                    },
                  },
                ]
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
      `Decline the link request from ${link.theirUserName}?`,
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

  const handleCreateAndLink = async () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }

    setCreating(true);
    
    try {
      // Create the new player
      const newPlayer = await createPlayer({
        name: newPlayerName.trim(),
      });
      
      if (!newPlayer?.id) {
        throw new Error('Failed to create player');
      }

      // Now accept the link with the new player
      await acceptLink(link.id, newPlayer.id, newPlayerName.trim());
      
      // Offer to sync ranges immediately
      Alert.alert(
        'Link Established!',
        `Created "${newPlayerName.trim()}" and linked with ${link.theirUserName}'s "${link.theirPlayerName}". Would you like to sync their ranges now?`,
        [
          { 
            text: 'Later', 
            style: 'cancel',
            onPress: () => {
              onSuccess?.();
              onClose();
            }
          },
          {
            text: 'Sync Now',
            onPress: async () => {
              try {
                const result = await syncFromLink(link.id);
                Alert.alert(
                  'Sync Complete!',
                  `Added ${result.added} range${result.added !== 1 ? 's' : ''}${result.skipped > 0 ? `, skipped ${result.skipped} (you already had data)` : ''}.`,
                  [{ text: 'OK', onPress: () => {
                    onSuccess?.();
                    onClose();
                  }}]
                );
              } catch (syncError) {
                Alert.alert(
                  'Sync Failed',
                  syncError instanceof Error ? syncError.message : 'Failed to sync ranges. You can try again from the player detail screen.',
                  [{ text: 'OK', onPress: () => {
                    onSuccess?.();
                    onClose();
                  }}]
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create player and link'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!accepting && !declining && !creating) {
      setSearchQuery('');
      setSelectedPlayerId(null);
      setShowCreateForm(false);
      setNewPlayerName('');
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
      <View style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground, flex: 1, maxHeight: '100%', paddingBottom: 0 }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Accept Player Link
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.subText }]}>
              From {link.theirUserName}
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
        <View style={[styles.modalContent, { flex: 1 }]}>
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
              {link.theirUserName} wants to link their player "{link.theirPlayerName}" with one of your players.
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
          {!showCreateForm && (
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
          )}

          {/* Create New Player Option */}
          {!showCreateForm ? (
            <TouchableOpacity
              style={[localStyles.createPlayerButton, { 
                backgroundColor: themeColors.accent,
                opacity: accepting || declining ? 0.5 : 1,
              }]}
              onPress={() => setShowCreateForm(true)}
              disabled={accepting || declining}
            >
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={localStyles.createPlayerButtonText}>
                Create New Player
              </Text>
            </TouchableOpacity>
          ) : (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={[localStyles.createForm, { 
                backgroundColor: isDark ? '#2c2c2e' : '#f8f9fa',
                borderColor: themeColors.border,
              }]}>
                <View style={localStyles.createFormHeader}>
                  <Text style={[localStyles.createFormTitle, { color: themeColors.text }]}>
                    New Player
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCreateForm(false);
                      setNewPlayerName('');
                    }}
                    disabled={creating}
                  >
                    <Ionicons name="close-circle" size={24} color={themeColors.subText} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[localStyles.createFormInput, {
                    backgroundColor: isDark ? '#1c1c1e' : '#fff',
                    color: themeColors.text,
                    borderColor: themeColors.border,
                  }]}
                  placeholder="Enter player name..."
                  placeholderTextColor={themeColors.subText}
                  value={newPlayerName}
                  onChangeText={setNewPlayerName}
                  autoFocus
                  editable={!creating}
                />
                <TouchableOpacity
                  style={[localStyles.createFormButton, { 
                    backgroundColor: themeColors.accent,
                    opacity: !newPlayerName.trim() || creating ? 0.5 : 1,
                  }]}
                  onPress={handleCreateAndLink}
                  disabled={!newPlayerName.trim() || creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                      <Text style={localStyles.createFormButtonText}>
                        Create & Link
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}

          {/* Divider */}
          {!showCreateForm && (
            <View style={localStyles.dividerContainer}>
              <View style={[localStyles.divider, { backgroundColor: themeColors.border }]} />
              <Text style={[localStyles.dividerText, { color: themeColors.subText }]}>
                or select existing player
              </Text>
              <View style={[localStyles.divider, { backgroundColor: themeColors.border }]} />
            </View>
          )}

          {/* Player list */}
          {!showCreateForm && (playersLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredPlayers}
              keyExtractor={(item) => item.id}
              renderItem={renderPlayerItem}
              contentContainerStyle={filteredPlayers.length === 0 ? { flexGrow: 1 } : { paddingBottom: 16 }}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
            />
          ))}
        </View>

        {/* Footer */}
        <View style={[styles.modalFooter, { 
          borderTopColor: themeColors.border, 
          backgroundColor: themeColors.modalBackground,
          paddingBottom: Math.max(insets.bottom, 20)
        }]}>
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
              style={[localStyles.cancelButton, { 
                backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
                borderColor: themeColors.border,
              }]}
              onPress={handleClose}
              disabled={accepting || declining}
            >
              <Text style={[localStyles.cancelButtonText, { color: themeColors.subText }]}>Cancel</Text>
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
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  createPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  createPlayerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  createFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  createFormTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  createFormInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  createFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createFormButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
  },
});
