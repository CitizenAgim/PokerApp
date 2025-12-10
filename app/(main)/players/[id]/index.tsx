import { HAND_MAP } from '@/constants/hands';
import { usePlayer, usePlayerRanges, usePlayers, useSettings } from '@/hooks';
import { Action, NoteEntry, Position } from '@/types/poker';
import { resizeImage } from '@/utils/image';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
  const { ninjaMode } = useSettings();
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  
  // Notes state
  const [showNotes, setShowNotes] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  
  // Note selection & editing state
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteEntry | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  // Initialize edit form when player loads or modal opens
  useEffect(() => {
    if (player && showEditModal) {
      setEditName(player.name);
      setEditPhotoUrl(player.photoUrl);
    }
  }, [player, showEditModal]);

  const handleOpenEditModal = () => {
    if (player) {
      setEditName(player.name);
      setEditPhotoUrl(player.photoUrl);
      setShowEditModal(true);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const resizedUri = await resizeImage(result.assets[0].uri);
      setEditPhotoUrl(resizedUri);
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
        photoUrl: editPhotoUrl,
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
      setEditPhotoUrl(player.photoUrl);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);
      const noteEntry = {
        id: Date.now().toString(),
        content: newNote.trim(),
        timestamp: Date.now(),
      };

      // Prepend new note to existing list
      const updatedNotesList = [noteEntry, ...(player?.notesList || [])];

      await updatePlayer({
        id,
        notesList: updatedNotesList,
      });
      
      setNewNote('');
      setIsAddingNote(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add note');
      console.error(error);
    } finally {
      setAddingNote(false);
    }
  };

  const handleLongPressNote = (noteId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedNoteIds(new Set([noteId]));
    }
  };

  const handlePressNote = (noteId: string) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedNoteIds);
      if (newSelected.has(noteId)) {
        newSelected.delete(noteId);
        if (newSelected.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        newSelected.add(noteId);
      }
      setSelectedNoteIds(newSelected);
    }
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
  };

  const handleDeleteSelectedNotes = () => {
    Alert.alert(
      'Delete Notes',
      `Are you sure you want to delete ${selectedNoteIds.size} note${selectedNoteIds.size > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedNotesList = (player?.notesList || []).filter(
                note => !selectedNoteIds.has(note.id)
              );
              
              await updatePlayer({
                id,
                notesList: updatedNotesList,
              });
              
              handleCancelSelection();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete notes');
            }
          },
        },
      ]
    );
  };

  const handleEditSelectedNote = () => {
    if (selectedNoteIds.size !== 1) return;
    
    const noteId = Array.from(selectedNoteIds)[0];
    const note = player?.notesList?.find(n => n.id === noteId);
    
    if (note) {
      setEditingNote(note);
      setEditNoteContent(note.content);
      handleCancelSelection();
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editNoteContent.trim()) return;

    try {
      const updatedNotesList = (player?.notesList || []).map(note => 
        note.id === editingNote.id 
          ? { ...note, content: editNoteContent.trim() }
          : note
      );

      await updatePlayer({
        id,
        notesList: updatedNotesList,
      });
      
      setEditingNote(null);
      setEditNoteContent('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update note');
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

  const handleEditRange = (position: Position, action: Action) => {
    router.push(`/(main)/players/${id}/range?position=${position}&action=${action}`);
  };

  const getRangePercentage = (position: Position, action: Action): string => {
    const key = `${position}_${action}`;
    const range = ranges?.ranges[key];
    if (!range) return "0.0";
    
    let selectedCombos = 0;
    const totalCombos = 1326;

    Object.entries(range).forEach(([handId, state]) => {
      if (state === 'manual-selected' || state === 'auto-selected') {
        const hand = HAND_MAP[handId];
        if (hand) {
           const combos = hand.type === 'pair' ? 6 : hand.type === 'suited' ? 4 : 12;
           selectedCombos += combos;
        }
      }
    });

    return (selectedCombos / totalCombos * 100).toFixed(1);
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
        {!ninjaMode && player.photoUrl ? (
          <Image source={{ uri: player.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {player.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.playerName}>{player.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editButton} onPress={handleOpenEditModal}>
            <Ionicons name="pencil" size={18} color="#0a7ea4" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color="#e74c3c" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          {isSelectionMode ? (
            <View style={styles.selectionHeader}>
              <TouchableOpacity onPress={handleCancelSelection}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.selectionTitle}>
                {selectedNoteIds.size} selected
              </Text>
              <View style={styles.selectionActions}>
                {selectedNoteIds.size === 1 && (
                  <TouchableOpacity onPress={handleEditSelectedNote} style={styles.selectionAction}>
                    <Ionicons name="pencil" size={20} color="#0a7ea4" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleDeleteSelectedNotes} style={styles.selectionAction}>
                  <Ionicons name="trash" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.sectionHeaderTitle} 
                onPress={() => setShowNotes(!showNotes)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Notes</Text>
                <Ionicons 
                  name={showNotes ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color="#666" 
                />
              </TouchableOpacity>
              
              {showNotes && !isAddingNote && (
                <TouchableOpacity 
                  style={styles.addNoteButton}
                  onPress={() => setIsAddingNote(true)}
                >
                  <Ionicons name="add" size={16} color="#0a7ea4" />
                  <Text style={styles.addNoteButtonText}>Add Note</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
        
        {showNotes && (
          <View style={styles.notesContainer}>
            {isAddingNote && (
              <View style={styles.addNoteContainer}>
                <TextInput
                  style={styles.addNoteInput}
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="Write a new note..."
                  placeholderTextColor="#999"
                  multiline
                  autoFocus
                />
                <View style={styles.addNoteActions}>
                  <TouchableOpacity 
                    style={styles.cancelNoteButton}
                    onPress={() => {
                      setIsAddingNote(false);
                      setNewNote('');
                    }}
                  >
                    <Text style={styles.cancelNoteText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.saveNoteButton,
                      !newNote.trim() && styles.saveNoteButtonDisabled
                    ]}
                    onPress={handleAddNote}
                    disabled={!newNote.trim() || addingNote}
                  >
                    {addingNote ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveNoteText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.notesList}>
              {player.notesList && player.notesList.length > 0 ? (
                player.notesList.map(note => {
                  const isSelected = selectedNoteIds.has(note.id);
                  return (
                    <TouchableOpacity
                      key={note.id}
                      style={[
                        styles.noteItem,
                        isSelected && styles.noteItemSelected,
                        isSelectionMode && !isSelected && styles.noteItemUnselected
                      ]}
                      onLongPress={() => handleLongPressNote(note.id)}
                      onPress={() => handlePressNote(note.id)}
                      activeOpacity={0.7}
                      delayLongPress={300}
                    >
                      <View style={styles.noteHeader}>
                        <Text style={styles.noteDate}>
                          {new Date(note.timestamp).toLocaleDateString()}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#0a7ea4" />
                        )}
                        {isSelectionMode && !isSelected && (
                          <Ionicons name="ellipse-outline" size={20} color="#ccc" />
                        )}
                      </View>
                      <Text style={styles.noteContent}>{note.content}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : player.notes ? (
                // Legacy notes fallback
                <View style={styles.noteItem}>
                  <Text style={styles.noteDate}>Legacy Note</Text>
                  <Text style={styles.noteContent}>{player.notes}</Text>
                </View>
              ) : !isAddingNote && (
                <Text style={styles.emptyNoteText}>No notes added yet.</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Ranges Grid */}
      <View style={styles.rangesSection}>
        <Text style={styles.sectionTitle}>Ranges</Text>
        {POSITIONS.map((pos) => (
          <View key={pos.id} style={styles.positionCard}>
            <View style={styles.positionHeader}>
              <View style={[styles.positionDot, { backgroundColor: pos.color }]} />
              <Text style={styles.positionLabel}>{pos.label}</Text>
            </View>
            <View style={styles.actionsGrid}>
              {ACTIONS.map((action) => {
                const percentage = getRangePercentage(pos.id, action.id);
                const hasRange = percentage !== "0.0";
                
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
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
                <TouchableOpacity onPress={handlePickImage}>
                  {editPhotoUrl ? (
                    <Image source={{ uri: editPhotoUrl }} style={styles.editAvatar} />
                  ) : (
                    <View style={styles.editAvatar}>
                      <Text style={styles.editAvatarText}>
                        {editName ? editName.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePickImage} style={{ marginTop: 8 }}>
                  <Text style={{ color: '#0a7ea4', fontWeight: '500' }}>
                    {editPhotoUrl ? 'Change Photo' : 'Add Photo'}
                  </Text>
                </TouchableOpacity>
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

      {/* Edit Note Modal */}
      <Modal
        visible={!!editingNote}
        animationType="fade"
        transparent
        onRequestClose={() => setEditingNote(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.editNoteModalContent}>
            <Text style={styles.modalTitle}>Edit Note</Text>
            <TextInput
              style={styles.editNoteInput}
              value={editNoteContent}
              onChangeText={setEditNoteContent}
              multiline
              autoFocus
              textAlignVertical="top"
            />
            <View style={styles.editNoteActions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setEditingNote(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.saveEditButton,
                  !editNoteContent.trim() && styles.saveEditButtonDisabled
                ]} 
                onPress={handleUpdateNote}
                disabled={!editNoteContent.trim()}
              >
                <Text style={styles.saveEditButtonText}>Save</Text>
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
  editModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  editModalBody: {
    padding: 20,
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
  editAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
  sectionContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
  },
  addNoteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  notesContainer: {
    gap: 16,
  },
  addNoteContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addNoteInput: {
    fontSize: 15,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  addNoteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelNoteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelNoteText: {
    color: '#666',
    fontWeight: '500',
  },
  saveNoteButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  saveNoteButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveNoteText: {
    color: '#fff',
    fontWeight: '600',
  },
  notesList: {
    gap: 12,
  },
  noteItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0a7ea4',
  },
  noteDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    fontWeight: '500',
  },
  noteContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  emptyNoteText: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  selectionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 12,
  },
  selectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 16,
  },
  selectionAction: {
    padding: 4,
  },
  noteItemSelected: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#0a7ea4',
    borderColor: '#0a7ea4',
    borderWidth: 1,
  },
  noteItemUnselected: {
    opacity: 0.7,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  editNoteModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  editNoteInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 120,
    marginBottom: 20,
    marginTop: 12,
  },
  editNoteActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
