import { useFriends, usePlayer, usePlayerRanges, usePlayers } from '@/hooks';
import * as playersFirebase from '@/services/firebase/players';
import { Action, Position, User } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const POSITIONS: { id: Position; label: string; color: string }[] = [
  { id: 'early', label: 'Early', color: '#e74c3c' },
  { id: 'middle', label: 'Middle', color: '#f39c12' },
  { id: 'late', label: 'Late', color: '#27ae60' },
  { id: 'blinds', label: 'Blinds', color: '#3498db' },
];

const ACTIONS: { id: Action; label: string }[] = [
  { id: 'open-raise', label: 'Open Raise' },
  { id: 'call', label: 'Call' },
  { id: '3bet', label: '3-Bet' },
  { id: 'call-3bet', label: 'Call 3-Bet' },
  { id: '4bet', label: '4-Bet' },
];

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { player, loading, error } = usePlayer(id);
  const { deletePlayer, updatePlayer } = usePlayers();
  const { ranges } = usePlayerRanges(id);
  const { friends } = useFriends();
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize edit form when player loads or modal opens
  useEffect(() => {
    if (player && showEditModal) {
      setEditName(player.name);
      setEditNotes(player.notes || '');
    }
  }, [player, showEditModal]);

  const handleOpenEditModal = () => {
    if (player) {
      setEditName(player.name);
      setEditNotes(player.notes || '');
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Player name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await updatePlayer({
        id,
        name: editName.trim(),
        notes: editNotes.trim() || undefined,
      });
      setShowEditModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update player');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    // Reset form to original values
    if (player) {
      setEditName(player.name);
      setEditNotes(player.notes || '');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Player',
      `Are you sure you want to delete ${player?.name}? This will also delete all their ranges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlayer(id);
            router.back();
          },
        },
      ]
    );
  };

  const handleShareWithFriend = async (friend: User) => {
    if (!player) return;
    
    try {
      setSharing(true);
      
      // Add friend to sharedWith array
      const newSharedWith = [...(player.sharedWith || [])];
      if (!newSharedWith.includes(friend.id)) {
        newSharedWith.push(friend.id);
        
        await playersFirebase.sharePlayer(id, friend.id);
        await updatePlayer({ id, sharedWith: newSharedWith });
        
        Alert.alert('Shared', `${player.name} has been shared with ${friend.displayName}`);
      } else {
        Alert.alert('Already Shared', `${player.name} is already shared with ${friend.displayName}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share player');
      console.error(error);
    } finally {
      setSharing(false);
      setShowShareModal(false);
    }
  };

  const handleUnshare = async (friendId: string) => {
    if (!player) return;
    
    try {
      const newSharedWith = (player.sharedWith || []).filter(id => id !== friendId);
      await updatePlayer({ id, sharedWith: newSharedWith });
      Alert.alert('Unshared', 'Player access has been removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to unshare player');
    }
  };

  const handleEditRange = (position: Position, action: Action) => {
    router.push(`/(main)/players/${id}/range?position=${position}&action=${action}`);
  };

  const getRangePercentage = (position: Position, action: Action): number => {
    const key = `${position}_${action}`;
    const range = ranges?.ranges[key];
    if (!range) return 0;
    
    const selected = Object.values(range).filter(
      s => s === 'manual-selected' || s === 'auto-selected'
    ).length;
    return Math.round((selected / 169) * 100);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error || !player) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorText}>Player not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Player Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {player.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.playerName}>{player.name}</Text>
        {player.notes && (
          <Text style={styles.playerNotes}>{player.notes}</Text>
        )}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={() => setShowShareModal(true)}
          >
            <Ionicons name="share-social" size={18} color="#27ae60" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={handleOpenEditModal}>
            <Ionicons name="pencil" size={18} color="#0a7ea4" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color="#e74c3c" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>

        {/* Shared With */}
        {player.sharedWith && player.sharedWith.length > 0 && (
          <View style={styles.sharedSection}>
            <Text style={styles.sharedLabel}>
              Shared with {player.sharedWith.length} friend{player.sharedWith.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Ranges Overview */}
      <View style={styles.rangesSection}>
        <Text style={styles.sectionTitle}>Hand Ranges</Text>
        
        {POSITIONS.map(pos => (
          <View key={pos.id} style={styles.positionCard}>
            <View style={styles.positionHeader}>
              <View style={[styles.positionDot, { backgroundColor: pos.color }]} />
              <Text style={styles.positionLabel}>{pos.label}</Text>
            </View>
            
            <View style={styles.actionsGrid}>
              {ACTIONS.map(action => {
                const percentage = getRangePercentage(pos.id, action.id);
                const hasRange = percentage > 0;
                
                return (
                  <TouchableOpacity
                    key={action.id}
                    style={[
                      styles.actionCell,
                      hasRange && styles.actionCellActive,
                    ]}
                    onPress={() => handleEditRange(pos.id, action.id)}
                  >
                    <Text style={[
                      styles.actionLabel,
                      hasRange && styles.actionLabelActive,
                    ]}>
                      {action.label}
                    </Text>
                    <Text style={[
                      styles.actionPercentage,
                      hasRange && styles.actionPercentageActive,
                    ]}>
                      {percentage}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {ranges?.handsObserved || 0}
            </Text>
            <Text style={styles.statLabel}>Hands Observed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {ranges ? Object.keys(ranges.ranges).length : 0}
            </Text>
            <Text style={styles.statLabel}>Ranges Set</Text>
          </View>
        </View>
      </View>
      
      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Player</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {friends.length === 0 ? (
              <View style={styles.noFriendsContainer}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.noFriendsText}>
                  Add friends to share player data
                </Text>
                <TouchableOpacity
                  style={styles.addFriendsButton}
                  onPress={() => {
                    setShowShareModal(false);
                    router.push('/(main)/friends/add');
                  }}
                >
                  <Text style={styles.addFriendsButtonText}>Add Friends</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.friendsList}
                renderItem={({ item }) => {
                  const isShared = player?.sharedWith?.includes(item.id);
                  return (
                    <View style={styles.friendItem}>
                      <View style={styles.friendAvatar}>
                        <Text style={styles.friendAvatarText}>
                          {item.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{item.displayName}</Text>
                        <Text style={styles.friendEmail}>{item.email}</Text>
                      </View>
                      {isShared ? (
                        <TouchableOpacity
                          style={styles.unshareButton}
                          onPress={() => handleUnshare(item.id)}
                        >
                          <Text style={styles.unshareText}>Unshare</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.shareToButton}
                          onPress={() => handleShareWithFriend(item)}
                          disabled={sharing}
                        >
                          {sharing ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.shareToText}>Share</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={handleCancelEdit}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Player</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.editModalBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Avatar Preview */}
              <View style={styles.editAvatarContainer}>
                <View style={styles.editAvatar}>
                  <Text style={styles.editAvatarText}>
                    {editName ? editName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              </View>
              
              {/* Name Input */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>Name *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter player name"
                  placeholderTextColor="#999"
                />
              </View>
              
              {/* Notes Input */}
              <View style={styles.editInputGroup}>
                <Text style={styles.editLabel}>Notes</Text>
                <TextInput
                  style={[styles.editInput, styles.editTextArea]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Add notes about this player's tendencies..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
            
            {/* Action Buttons */}
            <View style={styles.editModalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveEditButton,
                  !editName.trim() && styles.saveEditButtonDisabled,
                ]}
                onPress={handleSaveEdit}
                disabled={saving || !editName.trim()}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveEditButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  playerNotes: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
  },
  shareButtonText: {
    color: '#27ae60',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
  },
  editButtonText: {
    color: '#0a7ea4',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffebee',
    borderRadius: 20,
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontWeight: '500',
  },
  sharedSection: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
  },
  sharedLabel: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
  },
  rangesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  positionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  positionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  actionCellActive: {
    backgroundColor: '#e8f5e9',
  },
  actionLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionLabelActive: {
    color: '#2e7d32',
  },
  actionPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginTop: 2,
  },
  actionPercentageActive: {
    color: '#2e7d32',
  },
  statsSection: {
    padding: 20,
    paddingTop: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  noFriendsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noFriendsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  addFriendsButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
  },
  addFriendsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  friendsList: {
    padding: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 8,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  friendEmail: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  shareToButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#27ae60',
    borderRadius: 8,
  },
  shareToText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  unshareButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  unshareText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  // Edit Modal Styles
  editModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    marginTop: 'auto',
  },
  editModalBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  editAvatarContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  editAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  editInputGroup: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  editModalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveEditButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
  },
  saveEditButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveEditButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
