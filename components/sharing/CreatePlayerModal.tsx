/**
 * CreatePlayerModal
 * 
 * Modal that allows user to create a new player from shared ranges.
 * User can customize the player name and color.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRangeSharing } from '@/hooks/useRangeSharing';
import { getThemeColors, styles } from '@/styles/sharing/index.styles';
import { RangeShare } from '@/types/sharing';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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

interface CreatePlayerModalProps {
  visible: boolean;
  onClose: () => void;
  share: RangeShare;
  onSuccess: () => void;
}

// Available player colors
const PLAYER_COLORS = [
  '#e74c3c', // Red
  '#e67e22', // Orange
  '#f1c40f', // Yellow
  '#27ae60', // Green
  '#2ecc71', // Light Green
  '#1abc9c', // Teal
  '#3498db', // Blue
  '#9b59b6', // Purple
  '#e91e63', // Pink
  '#795548', // Brown
  '#607d8b', // Gray
  '#34495e', // Dark Gray
];

export function CreatePlayerModal({
  visible,
  onClose,
  share,
  onSuccess,
}: CreatePlayerModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  
  const { importToNewPlayer } = useRangeSharing();
  
  const [playerName, setPlayerName] = useState(share.playerName);
  const [selectedColor, setSelectedColor] = useState(PLAYER_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newPlayerId, setNewPlayerId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }

    setCreating(true);
    
    try {
      const playerId = await importToNewPlayer(share.id, playerName.trim(), selectedColor);
      setNewPlayerId(playerId);
      setSuccess(true);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create player'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDone = () => {
    setSuccess(false);
    setNewPlayerId(null);
    setPlayerName(share.playerName);
    setSelectedColor(PLAYER_COLORS[0]);
    onSuccess();
  };

  const handleClose = () => {
    if (!creating) {
      setSuccess(false);
      setNewPlayerId(null);
      setPlayerName(share.playerName);
      setSelectedColor(PLAYER_COLORS[0]);
      onClose();
    }
  };

  // Success screen
  if (success) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDone}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground, flex: 1 }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Player Created
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
                Player Created!
              </Text>
              <Text style={[styles.resultText, { color: themeColors.subText }]}>
                "{playerName}" with {share.rangeCount} ranges
              </Text>
              <Text style={[styles.resultText, { color: themeColors.subText }]}>
                From {share.fromUserName}
              </Text>
              
              <View style={[styles.resultStats, { backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5', marginTop: 24 }]}>
                <View style={styles.resultStatRow}>
                  <Text style={[styles.resultStatLabel, { color: themeColors.subText }]}>
                    Player name:
                  </Text>
                  <Text style={[styles.resultStatValue, { color: themeColors.text }]}>
                    {playerName}
                  </Text>
                </View>
                <View style={styles.resultStatRow}>
                  <Text style={[styles.resultStatLabel, { color: themeColors.subText }]}>
                    Ranges imported:
                  </Text>
                  <Text style={[styles.resultStatValue, { color: themeColors.success }]}>
                    {share.rangeCount}
                  </Text>
                </View>
                <View style={styles.resultStatRow}>
                  <Text style={[styles.resultStatLabel, { color: themeColors.subText }]}>
                    Color:
                  </Text>
                  <View style={[styles.playerColorDot, { backgroundColor: selectedColor, width: 16, height: 16 }]} />
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
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
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground, flex: 1 }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Create New Player
              </Text>
              <Text style={[styles.modalSubtitle, { color: themeColors.subText }]}>
                {share.rangeCount} ranges from {share.fromUserName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={handleClose}
              disabled={creating}
            >
              <Ionicons name="close" size={24} color={themeColors.subText} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Player Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: themeColors.text }]}>
                Player Name
              </Text>
              <TextInput
                style={[
                  styles.formInput,
                  { 
                    backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5',
                    color: themeColors.text,
                    borderColor: themeColors.border,
                  }
                ]}
                placeholder="Enter player name"
                placeholderTextColor={themeColors.subText}
                value={playerName}
                onChangeText={setPlayerName}
                editable={!creating}
                autoFocus
              />
            </View>

            {/* Color Picker */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: themeColors.text }]}>
                Player Color
              </Text>
              <View style={styles.colorPicker}>
                {PLAYER_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                    disabled={creating}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd' }]}>
              <Text style={[styles.infoBoxText, { color: isDark ? '#64b5f6' : '#1565c0' }]}>
                ℹ️ A new player will be created with the shared ranges. Notes from the original player are not included.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!playerName.trim() || creating) && styles.primaryButtonDisabled,
              ]}
              onPress={handleCreate}
              disabled={!playerName.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Player</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
