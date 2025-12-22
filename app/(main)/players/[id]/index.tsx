import { HAND_MAP } from '@/constants/hands';
import { usePlayer, usePlayerRanges, usePlayers, useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/players/[id]/index.styles';
import { Action, NoteEntry, Position } from '@/types/poker';
import { resizeImage } from '@/utils/image';
import { normalizeLocation } from '@/utils/text';
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
  { id: 'call', label: 'Limp/Call' },
  { id: 'open-raise', label: 'Raise' },
  { id: 'call-raise', label: 'Call Raise' },
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme colors
  const themeColors = getThemeColors(isDark);
  
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

  // Location state
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);

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

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    
    try {
      setAddingLocation(true);
      const normalizedNewLocation = normalizeLocation(newLocation);
      const currentLocations = player?.locations || [];
      
      // Check case-insensitively
      const exists = currentLocations.some(
        loc => loc.toLowerCase() === normalizedNewLocation.toLowerCase()
      );

      if (exists) {
        Alert.alert('Error', 'Location already exists');
        return;
      }
      
      const updatedLocations = [...currentLocations, normalizedNewLocation];
      
      await updatePlayer({
        id,
        locations: updatedLocations,
      });
      
      // Also save to global locations list
      // Note: We don't have direct access to saveLocation here, but updatePlayer might trigger it?
      // Actually, we should probably expose saveLocation via a hook or just let it be.
      // The global list is usually updated when creating a session.
      // But if we want this to appear in the global list immediately, we might need to add it.
      // For now, let's just update the player.
      
      setNewLocation('');
      setIsAddingLocation(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add location');
    } finally {
      setAddingLocation(false);
    }
  };

  const handleDeleteLocation = (locationToDelete: string) => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to remove "${locationToDelete}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedLocations = (player?.locations || []).filter(
                loc => loc !== locationToDelete
              );
              
              await updatePlayer({
                id,
                locations: updatedLocations,
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete location');
            }
          },
        },
      ]
    );
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
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error || !player) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeColors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={[styles.errorText, { color: themeColors.subText }]}>Player not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content}>
      {/* Player Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        {!ninjaMode && player.photoUrl ? (
          <Image source={{ uri: player.photoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {player.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.playerName, { color: themeColors.text }]}>{player.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.editButton, { backgroundColor: themeColors.editButtonBg }]} onPress={handleOpenEditModal}>
            <Ionicons name="pencil" size={18} color="#0a7ea4" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.deleteButton, { backgroundColor: themeColors.deleteButtonBg }]} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color="#e74c3c" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          {isSelectionMode ? (
            <View style={[styles.selectionHeader, { backgroundColor: themeColors.selectionHeader }]}>
              <TouchableOpacity onPress={handleCancelSelection}>
                <Ionicons name="close" size={24} color={themeColors.icon} />
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
                <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 0 }]}>Notes</Text>
                <Ionicons 
                  name={showNotes ? "chevron-up" : "chevron-down"} 
                  size={24} 
                  color={themeColors.icon} 
                />
              </TouchableOpacity>
              
              {showNotes && !isAddingNote && (
                <TouchableOpacity 
                  style={[styles.addNoteButton, { backgroundColor: themeColors.editButtonBg }]}
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
              <View style={[styles.addNoteContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <TextInput
                  style={[styles.addNoteInput, { color: themeColors.text }]}
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="Write a new note..."
                  placeholderTextColor={themeColors.placeholder}
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
                    <Text style={[styles.cancelNoteText, { color: themeColors.subText }]}>Cancel</Text>
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
                        { backgroundColor: themeColors.card },
                        isSelected && [styles.noteItemSelected, { backgroundColor: themeColors.noteSelected }],
                        isSelectionMode && !isSelected && styles.noteItemUnselected
                      ]}
                      onLongPress={() => handleLongPressNote(note.id)}
                      onPress={() => handlePressNote(note.id)}
                      activeOpacity={0.7}
                      delayLongPress={300}
                    >
                      <View style={styles.noteHeader}>
                        <Text style={[styles.noteDate, { color: themeColors.subText }]}>
                          {new Date(note.timestamp).toLocaleDateString()}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color="#0a7ea4" />
                        )}
                        {isSelectionMode && !isSelected && (
                          <Ionicons name="ellipse-outline" size={20} color={themeColors.icon} />
                        )}
                      </View>
                      <Text style={[styles.noteContent, { color: themeColors.text }]}>{note.content}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : player.notes ? (
                // Legacy notes fallback
                <View style={[styles.noteItem, { backgroundColor: themeColors.card }]}>
                  <Text style={[styles.noteDate, { color: themeColors.subText }]}>Legacy Note</Text>
                  <Text style={[styles.noteContent, { color: themeColors.text }]}>{player.notes}</Text>
                </View>
              ) : !isAddingNote && (
                <Text style={[styles.emptyNoteText, { color: themeColors.subText }]}>No notes added yet.</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Ranges Grid */}
      <View style={styles.rangesSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Ranges</Text>
        {POSITIONS.map((pos) => (
          <View key={pos.id} style={[styles.positionCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.positionHeader}>
              <View style={[styles.positionDot, { backgroundColor: pos.color }]} />
              <Text style={[styles.positionLabel, { color: themeColors.text }]}>{pos.label}</Text>
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
                      { backgroundColor: themeColors.actionCell },
                      hasRange && [styles.actionCellActive, { backgroundColor: themeColors.actionCellActive }],
                    ]}
                    onPress={() => handleEditRange(pos.id, action.id)}
                  >
                    <Text style={[
                      styles.actionLabel,
                      { color: themeColors.subText },
                      hasRange && [styles.actionLabelActive, { color: themeColors.actionLabelActive }],
                    ]}>
                      {action.label}
                    </Text>
                    <Text style={[
                      styles.actionPercentage,
                      { color: themeColors.subText },
                      hasRange && [styles.actionPercentageActive, { color: themeColors.actionLabelActive }],
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

      {/* Locations Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Locations</Text>
          {!isAddingLocation && (
            <TouchableOpacity 
              style={[styles.addNoteButton, { backgroundColor: themeColors.editButtonBg }]}
              onPress={() => setIsAddingLocation(true)}
            >
              <Ionicons name="add" size={16} color="#0a7ea4" />
              <Text style={styles.addNoteButtonText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {isAddingLocation && (
          <View style={[styles.addNoteContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border, marginBottom: 12 }]}>
            <TextInput
              style={[styles.addNoteInput, { color: themeColors.text, height: 40 }]}
              value={newLocation}
              onChangeText={setNewLocation}
              placeholder="Enter location..."
              placeholderTextColor={themeColors.placeholder}
              autoFocus
            />
            <View style={styles.addNoteActions}>
              <TouchableOpacity 
                style={styles.cancelNoteButton}
                onPress={() => {
                  setIsAddingLocation(false);
                  setNewLocation('');
                }}
              >
                <Text style={[styles.cancelNoteText, { color: themeColors.subText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.saveNoteButton,
                  !newLocation.trim() && styles.saveNoteButtonDisabled
                ]}
                onPress={handleAddLocation}
                disabled={!newLocation.trim() || addingLocation}
              >
                {addingLocation ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveNoteText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.notesList, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
          {player.locations && player.locations.length > 0 ? (
            player.locations.map((loc, index) => (
              <TouchableOpacity
                key={index}
                style={{ 
                  backgroundColor: themeColors.card, 
                  borderColor: themeColors.border, 
                  borderWidth: 1, 
                  borderRadius: 16, 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  gap: 6 
                }}
                onPress={() => handleDeleteLocation(loc)}
              >
                <Ionicons name="location" size={14} color={themeColors.subText} />
                <Text style={{ color: themeColors.text, fontSize: 14 }}>{loc}</Text>
                <Ionicons name="close-circle" size={16} color={themeColors.subText} />
              </TouchableOpacity>
            ))
          ) : (
            !isAddingLocation && <Text style={[styles.emptyNoteText, { color: themeColors.subText }]}>No locations added yet.</Text>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: themeColors.card }]}>
            <Text style={styles.statValue}>
              {ranges?.handsObserved || 0}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.subText }]}>Hands Observed</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.card }]}>
            <Text style={styles.statValue}>
              {ranges ? Object.keys(ranges.ranges).length : 0}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.subText }]}>Ranges Set</Text>
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
          style={[styles.modalOverlay, { backgroundColor: themeColors.modalOverlay }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <View style={[styles.editModalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Player</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <Ionicons name="close" size={24} color={themeColors.text} />
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
                <Text style={[styles.editLabel, { color: themeColors.text }]}>Name *</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter player name"
                  placeholderTextColor={themeColors.placeholder}
                />
              </View>
            </ScrollView>
            
            {/* Action Buttons */}
            <View style={[styles.editModalFooter, { borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: themeColors.modalInputBg }]}
                onPress={handleCancelEdit}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.subText }]}>Cancel</Text>
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
          style={[styles.modalOverlay, { backgroundColor: themeColors.modalOverlay }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.editNoteModalContent, { backgroundColor: themeColors.modalBg }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Note</Text>
            <TextInput
              style={[styles.editNoteInput, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
              value={editNoteContent}
              onChangeText={setEditNoteContent}
              multiline
              autoFocus
              textAlignVertical="top"
            />
            <View style={styles.editNoteActions}>
              <TouchableOpacity 
                style={[styles.cancelButton, { backgroundColor: themeColors.modalInputBg }]} 
                onPress={() => setEditingNote(null)}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.subText }]}>Cancel</Text>
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
