import { PokerTable } from '@/components/table/PokerTable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlayers, useSession } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/record-hand.styles';
import { Seat } from '@/types/poker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = [
  { id: 's', symbol: '♠', color: '#000' },
  { id: 'h', symbol: '♥', color: '#e74c3c' },
  { id: 'd', symbol: '♦', color: '#e74c3c' },
  { id: 'c', symbol: '♣', color: '#000' },
];

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
  
  // Betting State
  const [bets, setBets] = useState<Record<number, number>>({});
  const [straddleCount, setStraddleCount] = useState(0);
  const [isMississippiActive, setIsMississippiActive] = useState(false);
  
  // Card State
  const [handCards, setHandCards] = useState<Record<number, string[]>>({});
  const [communityCards, setCommunityCards] = useState<string[]>(['', '', '', '', '']);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [activeCardSeat, setActiveCardSeat] = useState<number | null>(null);
  const [activeCommunityCardIndex, setActiveCommunityCardIndex] = useState<number | null>(null);

  // Mississippi Modal State
  const [showMississippiModal, setShowMississippiModal] = useState(false);
  const [mississippiAmount, setMississippiAmount] = useState('');

  // UI State
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);

  // Initialize from Session if available
  useEffect(() => {
    if (sessionId && sessionTable) {
      setSeats(sessionTable.seats);
      setButtonPosition(sessionTable.buttonPosition);
      if (sessionTable.heroSeatIndex !== undefined) {
        setHeroSeat(sessionTable.heroSeatIndex);
      }
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
            text: 'Set as Button',
            onPress: () => setButtonPosition(seatNumber),
          },
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
        stack: player.stack
      },
    };
    setSeats(newSeats);
    setShowPlayerPicker(false);
    setSelectedSeatIndex(null);
  };

  const handleCardPress = (seatNumber: number) => {
    setActiveCommunityCardIndex(null);
    setActiveCardSeat(seatNumber);
    setShowCardPicker(true);
  };

  const handleCommunityCardPress = (index: number) => {
    setActiveCardSeat(null);
    setActiveCommunityCardIndex(index);
    setShowCardPicker(true);
  };

  const toggleCard = (cardId: string) => {
    if (activeCardSeat !== null) {
      const currentCards = handCards[activeCardSeat] || [];
      const isAlreadySelectedByMe = currentCards.includes(cardId);
      
      if (isAlreadySelectedByMe) {
        setHandCards(prev => ({
          ...prev,
          [activeCardSeat]: prev[activeCardSeat].filter(c => c !== cardId)
        }));
        return;
      }

      // Check if card is used by someone else (player or community)
      const usedByOtherPlayers = Object.entries(handCards).flatMap(([seat, cards]) => 
        parseInt(seat) === activeCardSeat ? [] : cards
      );
      const usedByCommunity = communityCards;

      if (usedByOtherPlayers.includes(cardId) || usedByCommunity.includes(cardId)) {
        Alert.alert('Card Unavailable', 'This card is already in use.');
        return;
      }

      if (currentCards.length >= 2) {
        Alert.alert('Limit Reached', 'Each player can only have 2 cards.');
        return;
      }

      setHandCards(prev => ({
        ...prev,
        [activeCardSeat]: [...(prev[activeCardSeat] || []), cardId]
      }));
    } else if (activeCommunityCardIndex !== null) {
      const isAlreadySelectedByMe = communityCards[activeCommunityCardIndex] === cardId;

      if (isAlreadySelectedByMe) {
        const newCommunity = [...communityCards];
        newCommunity[activeCommunityCardIndex] = '';
        setCommunityCards(newCommunity);
        return;
      }

      // Check if card is used by someone else (player or community)
      const usedByPlayers = Object.values(handCards).flat();
      const usedByOtherCommunity = communityCards.filter((_, i) => i !== activeCommunityCardIndex);

      if (usedByPlayers.includes(cardId) || usedByOtherCommunity.includes(cardId)) {
        Alert.alert('Card Unavailable', 'This card is already in use.');
        return;
      }

      const newCommunity = [...communityCards];
      newCommunity[activeCommunityCardIndex] = cardId;
      setCommunityCards(newCommunity);
    }
  };

  const handleMississippi = () => {
    if (straddleCount > 0) {
      Alert.alert('Error', 'Cannot Mississippi when Straddle is active.');
      return;
    }
    setMississippiAmount('');
    setShowMississippiModal(true);
  };

  const confirmMississippi = () => {
    const amount = parseFloat(mississippiAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive number.');
      return;
    }

    // Find button seat
    const buttonSeat = seats.find(s => (s.seatNumber ?? (s.index + 1)) === buttonPosition);
    if (!buttonSeat || (!buttonSeat.player && !buttonSeat.playerId)) {
      Alert.alert('Error', 'No player on the button.');
      return;
    }

    if (buttonSeat.player && buttonSeat.player.stack !== undefined && buttonSeat.player.stack < amount) {
      Alert.alert('Error', 'Insufficient stack for Mississippi.');
      return;
    }

    // Update bets
    setBets(prev => ({
      ...prev,
      [buttonPosition]: (prev[buttonPosition] || 0) + amount
    }));

    // Update stack
    const newSeats = seats.map(s => {
      const sNum = s.seatNumber ?? (s.index + 1);
      if (sNum === buttonPosition && s.player && s.player.stack !== undefined) {
        return {
          ...s,
          player: {
            ...s.player,
            stack: s.player.stack - amount
          }
        };
      }
      return s;
    });
    setSeats(newSeats);
    setIsMississippiActive(true);
    setShowMississippiModal(false);
  };

  const handleStraddle = () => {
    if (isMississippiActive) {
      Alert.alert('Error', 'Cannot Straddle when Mississippi is active.');
      return;
    }

    // Find occupied seats sorted by seat number
    const occupiedSeats = seats.filter(s => s.player || s.playerId).sort((a, b) => {
      const seatA = a.seatNumber ?? (a.index + 1);
      const seatB = b.seatNumber ?? (b.index + 1);
      return seatA - seatB;
    });

    if (occupiedSeats.length < 2) {
      Alert.alert('Error', 'Not enough players for straddle.');
      return;
    }

    // Determine who is straddling
    let buttonIndex = occupiedSeats.findIndex(s => (s.seatNumber ?? (s.index + 1)) === buttonPosition);
    if (buttonIndex === -1) {
       buttonIndex = 0; 
    }

    // Straddle logic: Button -> SB -> BB -> Straddle 1
    // 0: Button
    // 1: SB
    // 2: BB
    // 3: UTG (Straddle 1)
    const straddleIndex = (buttonIndex + 3 + straddleCount) % occupiedSeats.length;
    const straddlerSeat = occupiedSeats[straddleIndex];
    const straddlerSeatNum = straddlerSeat.seatNumber ?? (straddlerSeat.index + 1);

    // Calculate amount: 2 * BB * (2 ^ straddleCount)
    const bbAmount = session?.bigBlind || 0;
    if (bbAmount <= 0) {
       Alert.alert('Error', 'Big Blind not set for this session.');
       return;
    }
    const amount = bbAmount * Math.pow(2, straddleCount + 1);

    if (straddlerSeat.player && straddlerSeat.player.stack !== undefined && straddlerSeat.player.stack < amount) {
      Alert.alert('Error', 'Stack too low to straddle.');
      return;
    }

    // Update bets
    setBets(prev => ({
      ...prev,
      [straddlerSeatNum]: (prev[straddlerSeatNum] || 0) + amount
    }));

    // Update stack
    const newSeats = seats.map(s => {
      const sNum = s.seatNumber ?? (s.index + 1);
      if (sNum === straddlerSeatNum && s.player && s.player.stack !== undefined) {
        return {
          ...s,
          player: {
            ...s.player,
            stack: s.player.stack - amount
          }
        };
      }
      return s;
    });
    setSeats(newSeats);
    setStraddleCount(prev => prev + 1);
  };

  const handleReset = () => {
    // Restore stacks
    const newSeats = seats.map(s => {
      const sNum = s.seatNumber ?? (s.index + 1);
      const betAmount = bets[sNum];
      if (betAmount && s.player && s.player.stack !== undefined) {
        return {
          ...s,
          player: {
            ...s.player,
            stack: s.player.stack + betAmount
          }
        };
      }
      return s;
    });
    setSeats(newSeats);
    setBets({});
    setStraddleCount(0);
    setIsMississippiActive(false);
    setHandCards({});
    setCommunityCards(['', '', '', '', '']);
  };

  const handleStartHand = () => {
    // Placeholder
    Alert.alert('Info', 'Start Hand clicked (Not implemented yet)');
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
            currency={session?.currency}
            smallBlind={session?.smallBlind}
            bigBlind={session?.bigBlind}
            bets={bets}
            showCards={true}
            handCards={handCards}
            onCardPress={handleCardPress}
            communityCards={communityCards}
            onCommunityCardPress={handleCommunityCardPress}
          />

        {/* Controls */}
        <View style={styles.controls}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
             <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: themeColors.actionButtonBg, flex: 1 }]} 
                onPress={handleMississippi}
             >
                <ThemedText style={[styles.actionButtonText, { color: themeColors.text }]}>Mississippi</ThemedText>
             </TouchableOpacity>
             <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: themeColors.actionButtonBg, flex: 1 }]} 
                onPress={handleStraddle}
             >
                <ThemedText style={[styles.actionButtonText, { color: themeColors.text }]}>Straddle</ThemedText>
             </TouchableOpacity>
             <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: themeColors.actionButtonBg, flex: 1 }]} 
                onPress={handleReset}
             >
                <ThemedText style={[styles.actionButtonText, { color: themeColors.text }]}>Reset</ThemedText>
             </TouchableOpacity>
          </View>
          <TouchableOpacity 
             style={[styles.actionButton, { backgroundColor: '#2196f3', width: '100%' }]} 
             onPress={handleStartHand}
          >
             <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>Start Hand</ThemedText>
          </TouchableOpacity>
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

      {/* Mississippi Amount Modal */}
      <Modal
        visible={showMississippiModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMississippiModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: themeColors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 400 }}>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: themeColors.text }}>Mississippi Straddle Amount</ThemedText>
            
            <TextInput
              style={{ 
                borderWidth: 1, 
                borderColor: themeColors.border, 
                borderRadius: 8, 
                padding: 12, 
                fontSize: 16, 
                color: themeColors.text,
                marginBottom: 20,
                backgroundColor: themeColors.inputBg
              }}
              placeholder="Enter amount"
              placeholderTextColor={themeColors.subText}
              keyboardType="numeric"
              value={mississippiAmount}
              onChangeText={setMississippiAmount}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowMississippiModal(false)} style={{ padding: 10 }}>
                <ThemedText style={{ color: themeColors.subText, fontSize: 16 }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmMississippi} style={{ padding: 10, backgroundColor: '#2196f3', borderRadius: 8 }}>
                <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Confirm</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Card Picker Modal */}
      <Modal
        visible={showCardPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCardPicker(false)}
      >
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
          <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomWidth: 1, borderBottomColor: themeColors.border }]}>
            <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>
              {activeCardSeat !== null ? `Select Cards (Seat ${activeCardSeat})` : `Select Community Card (${activeCommunityCardIndex === 0 || activeCommunityCardIndex === 1 || activeCommunityCardIndex === 2 ? 'Flop' : activeCommunityCardIndex === 3 ? 'Turn' : 'River'})`}
            </ThemedText>
            <TouchableOpacity onPress={() => setShowCardPicker(false)} style={styles.headerButton}>
              <ThemedText style={styles.headerButtonText}>Done</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={{ gap: 20 }}>
              {SUITS.map(suit => (
                <View key={suit.id}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: themeColors.subText, textTransform: 'uppercase' }}>
                    {suit.id === 's' ? 'Spades' : suit.id === 'h' ? 'Hearts' : suit.id === 'd' ? 'Diamonds' : 'Clubs'}
                  </ThemedText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {RANKS.map(rank => {
                      const cardId = `${rank}${suit.id}`;
                      
                      let isSelectedByMe = false;
                      let isUsedByOthers = false;

                      if (activeCardSeat !== null) {
                        isSelectedByMe = (handCards[activeCardSeat] || []).includes(cardId);
                        isUsedByOthers = Object.entries(handCards).some(([seat, cards]) => 
                          parseInt(seat) !== activeCardSeat && cards.includes(cardId)
                        ) || communityCards.includes(cardId);
                      } else if (activeCommunityCardIndex !== null) {
                        isSelectedByMe = communityCards[activeCommunityCardIndex] === cardId;
                        isUsedByOthers = Object.values(handCards).flat().includes(cardId) || 
                          communityCards.some((c, i) => i !== activeCommunityCardIndex && c === cardId);
                      }

                      return (
                        <TouchableOpacity
                          key={cardId}
                          onPress={() => toggleCard(cardId)}
                          disabled={isUsedByOthers}
                          style={{
                            width: 45,
                            height: 60,
                            borderRadius: 6,
                            backgroundColor: isSelectedByMe ? '#2196f3' : isUsedByOthers ? '#eee' : themeColors.card,
                            borderWidth: 1,
                            borderColor: isSelectedByMe ? '#2196f3' : themeColors.border,
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: isUsedByOthers ? 0.3 : 1,
                          }}
                        >
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: 'bold', 
                            color: isSelectedByMe ? '#fff' : isUsedByOthers ? '#999' : themeColors.text 
                          }}>
                            {rank}
                          </Text>
                          <Text style={{ 
                            fontSize: 18, 
                            color: isSelectedByMe ? '#fff' : isUsedByOthers ? '#999' : suit.color 
                          }}>
                            {suit.symbol}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ThemedView>
  );
}
