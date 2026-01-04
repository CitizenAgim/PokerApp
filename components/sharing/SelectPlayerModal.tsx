/**
 * SelectPlayerModal
 * 
 * Modal that allows user to select an existing player to copy ranges to.
 * Ranges are merged using "fill empty only" strategy - existing observations are preserved.
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlayers } from '@/hooks/usePlayer';
import { useRangeSharing } from '@/hooks/useRangeSharing';
import { getThemeColors, styles } from '@/styles/sharing/index.styles';
import { RangeShare, ImportRangesResult } from '@/types/sharing';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface SelectPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  share: RangeShare;
  onSuccess: () => void;
}

export function SelectPlayerModal({
  visible,
  onClose,
  share,
  onSuccess,
}: SelectPlayerModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  
  const { players, loading: playersLoading } = usePlayers();
  const { importToExistingPlayer } = useRangeSharing();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [result, setResult] = useState<ImportRangesResult | null>(null);

  // Filter players by search query
  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPlayer = async (playerId: string, playerName: string) => {
    setSelectedPlayerId(playerId);
    setImporting(true);
    
    try {
      const importResult = await importToExistingPlayer(share.id, playerId);
      setResult(importResult);
      
      // Show appropriate message based on result
      if (importResult.added === 0) {
        Alert.alert(
          'No Ranges Added',
          `You already have observations for all ${importResult.skipped} shared positions. No changes were made.`,
          [{ text: 'OK', onPress: onSuccess }]
        );
      } else {
        // Success - show result screen
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to import ranges'
      );
      setSelectedPlayerId(null);
    } finally {
      setImporting(false);
    }
  };

  const handleDone = () => {
    setResult(null);
    setSelectedPlayerId(null);
    setSearchQuery('');
    onSuccess();
  };

  const handleClose = () => {
    if (!importing) {
      setResult(null);
      setSelectedPlayerId(null);
      setSearchQuery('');
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
        disabled={importing}
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
        {isSelected && importing ? (
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
        {searchQuery ? 'Try a different search term.' : 'Create a player first.'}
      </Text>
    </View>
  );

  // Result screen
  if (result && result.added > 0) {
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
              Import Complete
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
                Ranges Imported!
              </Text>
              <Text style={[styles.resultText, { color: themeColors.subText }]}>
                From "{share.playerName}" by {share.fromUserName}
              </Text>
              
              <View style={[styles.resultStats, { backgroundColor: isDark ? '#2c2c2e' : '#f5f5f5' }]}>
                <View style={styles.resultStatRow}>
                  <Text style={[styles.resultStatLabel, { color: themeColors.subText }]}>
                    Ranges added:
                  </Text>
                  <Text style={[styles.resultStatValue, { color: themeColors.success }]}>
                    {result.added}
                  </Text>
                </View>
                {result.skipped > 0 && (
                  <View style={styles.resultStatRow}>
                    <Text style={[styles.resultStatLabel, { color: themeColors.subText }]}>
                      Skipped (you already had):
                    </Text>
                    <Text style={[styles.resultStatValue, { color: themeColors.warning }]}>
                      {result.skipped}
                    </Text>
                  </View>
                )}
              </View>
              
              {result.skipped > 0 && (
                <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd', marginTop: 16 }]}>
                  <Text style={[styles.infoBoxText, { color: isDark ? '#64b5f6' : '#1565c0' }]}>
                    ℹ️ Your existing observations were preserved. Only empty positions received new ranges.
                  </Text>
                </View>
              )}
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
      <View style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground, flex: 1 }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
          <View>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>
              Copy to Player
            </Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.subText }]}>
              "{share.playerName}" • {share.rangeCount} ranges
            </Text>
          </View>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleClose}
            disabled={importing}
          >
            <Ionicons name="close" size={24} color={themeColors.subText} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.modalContent}>
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
              placeholder="Search players..."
              placeholderTextColor={themeColors.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={!importing}
            />
          </View>

          {/* Info box */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? '#1a3a4a' : '#e3f2fd' }]}>
            <Text style={[styles.infoBoxText, { color: isDark ? '#64b5f6' : '#1565c0' }]}>
              ℹ️ Only empty positions will be filled. Your existing observations will NOT be changed.
            </Text>
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
              contentContainerStyle={filteredPlayers.length === 0 ? { flex: 1 } : { paddingTop: 12 }}
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
            disabled={importing}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
