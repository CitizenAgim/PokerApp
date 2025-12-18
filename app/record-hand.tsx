import { PokerTable } from '@/components/table/PokerTable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlayers, useSession } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/record-hand.styles';
import { Seat } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RecordHandScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  const insets = useSafeAreaInsets();

  const { session, table: sessionTable } = useSession(sessionId || '');
  const { players: allPlayers } = usePlayers();

  // Local State for the Hand Record
  const [seats, setSeats] = useState<Seat[]>(Array(9).fill(null).map((_, i) => ({ index: i, seatNumber: i + 1 })));
  const [buttonPosition, setButtonPosition] = useState(1);
  const [heroSeat, setHeroSeat] = useState<number | undefined>(undefined);
  
  // Hand Details State
  const [board, setBoard] = useState('');
  const [potSize, setPotSize] = useState('');
  const [notes, setNotes] = useState('');

  // UI State
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);

  // Initialize from Session if available
  useEffect(() => {
    if (sessionId && sessionTable) {
      setSeats(sessionTable.seats);
      setButtonPosition(sessionTable.buttonPosition);
      // We could also set heroSeat if it was stored in the session context, 
      // but for now we'll leave it or maybe infer it.
    }
  }, [sessionId, sessionTable]);

  const handleSeatPress = (seatNumber: number) => {
    const index = seatNumber - 1;
    const seat = seats[index];

    if (seat.playerId || seat.player) {
      Alert.alert(
        `Seat ${seatNumber}`,
        'Choose an action',
        [
          {
            text: 'Set as Hero',
            onPress: () => setHeroSeat(seatNumber),
          },
          {
            text: 'Remove Player',
            style: 'destructive',
            onPress: () => {
              const newSeats = [...seats];
              newSeats[index] = { ...newSeats[index], player: null, playerId: null };
              setSeats(newSeats);
              if (heroSeat === seatNumber) setHeroSeat(undefined);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      setSelectedSeatIndex(index);
      setShowPlayerPicker(true);
    }
  };

  const handleAssignPlayer = (player: any) => {
    if (selectedSeatIndex === null) return;

    const newSeats = [...seats];
    newSeats[selectedSeatIndex] = {
      ...newSeats[selectedSeatIndex],
      playerId: player.id,
      player: {
        id: player.id,
        name: player.name,
        photoUrl: player.photoUrl,
        isTemp: false,
      },
    };
    setSeats(newSeats);
    setShowPlayerPicker(false);
    setSelectedSeatIndex(null);
  };

  const handleMoveButton = () => {
    setButtonPosition((prev) => (prev % 9) + 1);
  };

  const handleSave = () => {
    // TODO: Implement saving logic
    Alert.alert('Success', 'Hand recorded successfully (Placeholder)');
    router.back();
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: themeColors.card, 
          borderBottomColor: themeColors.border,
          paddingTop: insets.top + 10 
        }
      ]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <ThemedText style={styles.headerButtonText}>Cancel</ThemedText>
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>Record Hand</ThemedText>
        <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
          <ThemedText style={styles.headerButtonText}>Save</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Table View */}
        <PokerTable
          seats={seats}
          players={allPlayers}
          buttonPosition={buttonPosition}
          heroSeat={heroSeat}
          onSeatPress={handleSeatPress}
          themeColors={themeColors}
          centerText="Tap seat to assign/edit"
        />

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: themeColors.actionButtonBg }]}
            onPress={handleMoveButton}
          >
            <Ionicons name="arrow-forward-circle" size={24} color="#0a7ea4" />
            <ThemedText style={[styles.actionButtonText, { color: '#0a7ea4' }]}>Move Button</ThemedText>
          </TouchableOpacity>

          <View style={styles.sectionTitle}>
            <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Hand Details</ThemedText>
          </View>

          <View style={styles.row}>
            <View style={[styles.col, styles.inputGroup]}>
              <ThemedText style={[styles.label, { color: themeColors.subText }]}>Pot Size</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={potSize}
                onChangeText={setPotSize}
                placeholder="0"
                placeholderTextColor={themeColors.placeholder}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.col, styles.inputGroup]}>
              <ThemedText style={[styles.label, { color: themeColors.subText }]}>Board Cards</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={board}
                onChangeText={setBoard}
                placeholder="e.g. Ah Ks 2d"
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={[styles.label, { color: themeColors.subText }]}>Notes</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Describe the action..."
              placeholderTextColor={themeColors.placeholder}
              multiline
            />
          </View>
        </View>
      </ScrollView>

      {/* Player Picker Modal */}
      <Modal
        visible={showPlayerPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPlayerPicker(false)}
      >
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
          <View style={[styles.header, { backgroundColor: themeColors.card }]}>
            <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>Select Player</ThemedText>
            <TouchableOpacity onPress={() => setShowPlayerPicker(false)} style={styles.headerButton}>
              <ThemedText style={styles.headerButtonText}>Close</ThemedText>
            </TouchableOpacity>
          </View>
          <FlatList
            data={allPlayers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: themeColors.border, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => handleAssignPlayer(item)}
              >
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', marginRight: 12, overflow: 'hidden' }}>
                   {item.photoUrl && <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: '100%' }} />}
                </View>
                <ThemedText style={{ fontSize: 16, color: themeColors.text }}>{item.name}</ThemedText>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ThemedView>
  );
}
