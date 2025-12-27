import { WinnerSelectionModal } from '@/components/WinnerSelectionModal';
import { PokerTable } from '@/components/table/PokerTable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePlayers, useSession } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useHandRecorder } from '@/hooks/useHandRecorder';
import { saveHand } from '@/services/firebase/hands';
import { getThemeColors, styles } from '@/styles/record-hand.styles';
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

  const { session, table: sessionTable, updateSeatStack } = useSession(sessionId || '');
  const { players: allPlayers } = usePlayers();
  const { user } = useCurrentUser();

  // Initialize Hook
  const {
    seats,
    setSeats,
    buttonPosition,
    setButtonPosition,
    bets,
    setBets,
    pot,
    street,
    minRaise,
    history,
    handCards,
    setHandCards,
    communityCards,
    setCommunityCards,
    isHandStarted,
    currentActionSeat,
    currentBet,
    foldedSeats,
    handleStartHand,
    handleFold,
    handleCheck,
    handleCall,
    handleBet,
    handleUndo,
    straddleCount,
    setStraddleCount,
    isMississippiActive,
    setIsMississippiActive,
    isPickingBoard,
    isHandComplete,
    winners,
    actions,
    sidePots,
    handleDistributePot
  } = useHandRecorder(
    Array(9).fill(null).map((_, i) => ({ index: i, seatNumber: i + 1 })),
    1,
    session?.bigBlind || 0,
    session?.smallBlind || 0
  );

  // Local UI State
  const [heroSeat, setHeroSeat] = useState<number | undefined>(undefined);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [activeCardSeat, setActiveCardSeat] = useState<number | null>(null);
  const [isPickingBoardUI, setIsPickingBoardUI] = useState(false); // Renamed to avoid conflict

  // Mississippi Modal State
  const [showMississippiModal, setShowMississippiModal] = useState(false);
  const [mississippiAmount, setMississippiAmount] = useState('');
  
  // Bet Modal State
  const [showBetModal, setShowBetModal] = useState(false);
  const [betAmount, setBetAmount] = useState('');

  // Stack Edit Modal State
  const [showStackModal, setShowStackModal] = useState(false);
  const [stackAmount, setStackAmount] = useState('');
  const [editingStackSeat, setEditingStackSeat] = useState<number | null>(null);

  // UI State
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // Sync with Session
  useEffect(() => {
    if (sessionId && sessionTable) {
      // Only set if we haven't started modifying? 
      // Or always sync initial state?
      // For now, let's just set seats if they are empty/default
      // But useHandRecorder initializes with default.
      // We should update seats when sessionTable loads.
      setSeats(sessionTable.seats);
      setButtonPosition(sessionTable.buttonPosition);
      if (sessionTable.heroSeatIndex !== undefined) {
        setHeroSeat(sessionTable.heroSeatIndex);
      }
    }
  }, [sessionId, sessionTable]);

  // Auto-open card picker when street changes (if logic sets isPickingBoard)
  useEffect(() => {
      if (isPickingBoard) {
          setIsPickingBoardUI(true);
          setShowCardPicker(true);
          setActiveCardSeat(null);
      }
  }, [isPickingBoard]);

  const handleSeatPress = (seatNumber: number) => {
    const index = seatNumber - 1;
    const seat = seats[index];

    if (seat.playerId || seat.player) {
      Alert.alert(
        `Seat ${seatNumber}`,
        'Choose an action',
        [
          {
            text: 'Edit Stack',
            onPress: () => {
              setEditingStackSeat(seatNumber);
              setStackAmount(seat.player?.stack?.toString() || '0');
              setShowStackModal(true);
            },
          },
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

  const confirmStackUpdate = async () => {
    const amount = parseFloat(stackAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid number.');
      return;
    }

    if (editingStackSeat !== null) {
      // Update in session (persists to session screen)
      await updateSeatStack(editingStackSeat, amount);
      
      // Update local state
      const newSeats = seats.map(s => {
        const sNum = s.seatNumber ?? (s.index + 1);
        if (sNum === editingStackSeat && s.player) {
          return {
            ...s,
            player: {
              ...s.player,
              stack: amount
            }
          };
        }
        return s;
      });
      setSeats(newSeats);
      setShowStackModal(false);
      setEditingStackSeat(null);
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
    setIsPickingBoardUI(false);
    setActiveCardSeat(seatNumber);
    setShowCardPicker(true);
  };

  const handleBoardPress = () => {
    setActiveCardSeat(null);
    setIsPickingBoardUI(true);
    setShowCardPicker(true);
  };

  const toggleCard = (cardId: string) => {
    if (activeCardSeat !== null) {
      const currentCards = handCards[activeCardSeat] || [];
      const isAlreadySelectedByMe = currentCards.includes(cardId);
      
      if (isAlreadySelectedByMe) {
        const newCards = { ...handCards };
        newCards[activeCardSeat] = currentCards.filter(c => c !== cardId);
        setHandCards(newCards);
        return;
      }

      // Check if card is used by someone else (player or community)
      const usedByOtherPlayers = Object.entries(handCards).flatMap(([seat, cards]) => 
        parseInt(seat) === activeCardSeat ? [] : cards
      );
      const usedByCommunity = communityCards.filter(c => c !== '');

      if (usedByOtherPlayers.includes(cardId) || usedByCommunity.includes(cardId)) {
        Alert.alert('Card Unavailable', 'This card is already in use.');
        return;
      }

      if (currentCards.length >= 2) {
        Alert.alert('Limit Reached', 'Each player can only have 2 cards.');
        return;
      }

      const newCards = { ...handCards };
      newCards[activeCardSeat] = [...currentCards, cardId];
      setHandCards(newCards);

    } else if (isPickingBoardUI) {
      const isAlreadySelectedByMe = communityCards.includes(cardId);

      if (isAlreadySelectedByMe) {
        const newBoard = communityCards.filter(c => c !== cardId);
        while (newBoard.length < 5) newBoard.push('');
        setCommunityCards(newBoard);
        return;
      }

      // Check if card is used by players
      const usedByPlayers = Object.values(handCards).flat();
      if (usedByPlayers.includes(cardId)) {
        Alert.alert('Card Unavailable', 'This card is already in use by a player.');
        return;
      }

      const currentBoardCount = communityCards.filter(c => c !== '').length;
      if (currentBoardCount >= 5) {
        Alert.alert('Limit Reached', 'The board can only have 5 cards.');
        return;
      }

      const newBoard = [...communityCards.filter(c => c !== ''), cardId];
      while (newBoard.length < 5) newBoard.push('');
      setCommunityCards(newBoard);
    }
  };

  const handleCloseCardPicker = () => {
    if (isPickingBoardUI) {
      const count = communityCards.filter(c => c !== '').length;
      if (count > 0 && count < 3) {
        Alert.alert('Incomplete Board', 'Please select at least 3 cards for the flop, or clear the board.');
        return;
      }
    }
    setShowCardPicker(false);
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
    setBets({
      ...bets,
      [buttonPosition]: (bets[buttonPosition] || 0) + amount
    });

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
    setBets({
      ...bets,
      [straddlerSeatNum]: (bets[straddlerSeatNum] || 0) + amount
    });

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
    // We need to reset the logic state too. 
    // Ideally we'd have a reset function in the hook.
    // For now, we can just reload the screen or manually reset via setters if we had them all.
    // But we don't have setters for everything (like currentActionSeat).
    // Let's just reload the screen for now or implement reset in hook later.
    Alert.alert('Reset', 'Please reload the screen to reset fully for now.');
  };

  const confirmBet = () => {
    if (currentActionSeat === null) return;
    const amount = parseFloat(betAmount);
    
    // Validation
    if (isNaN(amount)) {
        Alert.alert('Invalid Amount', 'Please enter a valid number.');
        return;
    }

    // Check stack
    const seat = seats.find(s => (s.seatNumber ?? (s.index + 1)) === currentActionSeat);
    if (!seat || !seat.player) return;
    
    const currentPlayerBet = bets[currentActionSeat] || 0;
    const stack = seat.player.stack || 0;
    const maxTotalBet = currentPlayerBet + stack;

    if (amount > maxTotalBet) {
        Alert.alert('Insufficient Stack', `You only have enough to bet/raise up to ${maxTotalBet}.`);
        return;
    }

    if (currentBet === 0) {
        // Opening bet
        if (amount < (session?.bigBlind || 0)) {
             Alert.alert('Invalid Bet', 'Bet must be at least the Big Blind.');
             return;
        }
    } else {
        // Raise
        if (amount < currentBet + minRaise) {
             Alert.alert('Invalid Raise', `Raise must be at least ${currentBet + minRaise} (Min Raise: ${minRaise}).`);
             return;
        }
    }
    
    handleBet(amount);
    setShowBetModal(false);
  };

  const handlePot = () => {
    if (currentActionSeat === null) return;
    
    const potBase = pot + Object.values(bets).reduce((a, b) => a + b, 0);
    const myBet = bets[currentActionSeat] || 0;
    const amountToCall = currentBet - myBet;
    
    let totalBet = 0;
    if (currentBet === 0) {
        totalBet = potBase;
        if (totalBet === 0) totalBet = session?.bigBlind || 0;
    } else {
        const raiseAmount = potBase + amountToCall;
        totalBet = currentBet + raiseAmount;
    }
    
    const player = seats.find(s => (s.seatNumber ?? (s.index + 1)) === currentActionSeat)?.player;
    const stack = player?.stack || 0;
    const maxBet = myBet + stack;
    
    const finalBet = Math.min(totalBet, maxBet);
    
    handleBet(finalBet);
  };

  const handleAllIn = () => {
    if (currentActionSeat === null) return;
    
    const player = seats.find(s => (s.seatNumber ?? (s.index + 1)) === currentActionSeat)?.player;
    if (!player) return;
    
    const myBet = bets[currentActionSeat] || 0;
    const stack = player.stack || 0;
    const totalBet = myBet + stack;
    
    handleBet(totalBet);
  };

  useEffect(() => {
    if (isHandComplete) {
      if (winners.length > 0) {
        Alert.alert(
          'Hand Complete',
          `Winner: Seat ${winners[0]}`,
          [
            { text: 'Save & Close', onPress: handleSave },
            { text: 'Review', style: 'cancel' }
          ]
        );
      } else {
        // Showdown - need to select winners
        setShowWinnerModal(true);
      }
    }
  }, [isHandComplete]);

  const handleConfirmWinners = (results: { potIndex: number, winnerSeats: number[] }[]) => {
      handleDistributePot(results);
      setShowWinnerModal(false);
      // After distributing, winners are set in state, so the useEffect above might trigger again?
      // No, because isHandComplete didn't change (it was already true).
      // But winners changed from [] to [something].
      // So the useEffect WILL trigger again and show the "Hand Complete" alert.
      // That's actually perfect flow.
  };

  const handleSave = async () => {
    if (!sessionId || !user) {
        Alert.alert('Error', 'Missing session or user information.');
        return;
    }
    try {
        const handStateToSave: any = {
            seats,
            bets,
            pot,
            sidePots,
            street,
            currentActionSeat,
            currentBet,
            minRaise,
            foldedSeats,
            handCards,
            communityCards,
            buttonPosition,
            isHandStarted,
            activeCardSeat: null,
            isPickingBoard,
            straddleCount,
            isMississippiActive,
            smallBlind: session?.smallBlind || 0,
            bigBlind: session?.bigBlind || 0,
            actedSeats: new Set(),
            actions,
            isHandComplete,
            winners
        };
        
        await saveHand(sessionId, user.id, handStateToSave);
        Alert.alert('Success', 'Hand saved!');
        router.back();
    } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to save hand.');
    }
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
            activeSeat={currentActionSeat}
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
            onBoardPress={handleBoardPress}
            foldedSeats={foldedSeats}
            pot={pot}
            street={street}
          />

        {/* Controls */}
        <View style={styles.controls}>
          {!isHandStarted ? (
            <>
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
            </>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#e74c3c', minWidth: 80 }]} 
                onPress={handleFold}
              >
                <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>Fold</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.actionButton, 
                  { backgroundColor: (currentActionSeat !== null && (bets[currentActionSeat] || 0) < currentBet) ? '#ccc' : themeColors.actionButtonBg, minWidth: 80 }
                ]} 
                onPress={handleCheck}
                disabled={currentActionSeat !== null && (bets[currentActionSeat] || 0) < currentBet}
              >
                <ThemedText style={[styles.actionButtonText, { color: (currentActionSeat !== null && (bets[currentActionSeat] || 0) < currentBet) ? '#666' : themeColors.text }]}>Check</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: themeColors.actionButtonBg, minWidth: 80 }]} 
                onPress={handleCall}
              >
                <ThemedText style={[styles.actionButtonText, { color: themeColors.text }]}>Call</ThemedText>
              </TouchableOpacity>
              
              {currentBet === 0 ? (
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#2196f3', minWidth: 80 }]} 
                  onPress={() => {
                    setBetAmount('');
                    setShowBetModal(true);
                  }}
                >
                  <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>Bet</ThemedText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#2196f3', minWidth: 80 }]} 
                  onPress={() => {
                    setBetAmount('');
                    setShowBetModal(true);
                  }}
                >
                  <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>Raise</ThemedText>
                </TouchableOpacity>
              )}

              {/* Placeholders for other buttons */}
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: themeColors.actionButtonBg, minWidth: 80 }]}
                onPress={handlePot}
              >
                <ThemedText style={[styles.actionButtonText, { color: themeColors.text }]}>Pot</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: themeColors.actionButtonBg, minWidth: 80 }]}
                onPress={handleAllIn}
              >
                <ThemedText style={[styles.actionButtonText, { color: themeColors.text }]}>All-in</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: themeColors.actionButtonBg, minWidth: 80 }]}
                onPress={handleUndo}
                disabled={history.length === 0}
              >
                <ThemedText style={[styles.actionButtonText, { color: history.length === 0 ? '#ccc' : themeColors.text }]}>←</ThemedText>
              </TouchableOpacity>
            </View>
          )}
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

      {/* Stack Edit Modal */}
      <Modal
        visible={showStackModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStackModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: themeColors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 400 }}>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: themeColors.text }}>Edit Player Stack</ThemedText>
            
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
              placeholder="Enter stack amount"
              placeholderTextColor={themeColors.subText}
              keyboardType="numeric"
              value={stackAmount}
              onChangeText={setStackAmount}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowStackModal(false)} style={{ padding: 10 }}>
                <ThemedText style={{ color: themeColors.subText, fontSize: 16 }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmStackUpdate} style={{ padding: 10, backgroundColor: '#2196f3', borderRadius: 8 }}>
                <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Update</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bet Amount Modal */}
      <Modal
        visible={showBetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBetModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: themeColors.card, borderRadius: 12, padding: 20, width: '100%', maxWidth: 400 }}>
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: themeColors.text }}>
              {currentBet === 0 ? 'Bet Amount' : 'Raise Amount'}
            </ThemedText>
            
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
              placeholder={currentBet === 0 ? "Enter bet amount" : "Enter raise amount"}
              placeholderTextColor={themeColors.subText}
              keyboardType="numeric"
              value={betAmount}
              onChangeText={setBetAmount}
              autoFocus
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowBetModal(false)} style={{ padding: 10 }}>
                <ThemedText style={{ color: themeColors.subText, fontSize: 16 }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmBet} style={{ padding: 10, backgroundColor: '#2196f3', borderRadius: 8 }}>
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
        onRequestClose={handleCloseCardPicker}
      >
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
          <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomWidth: 1, borderBottomColor: themeColors.border }]}>
            <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>
              {activeCardSeat !== null ? `Select Cards (Seat ${activeCardSeat})` : 'Select Board Cards'}
            </ThemedText>
            <TouchableOpacity onPress={handleCloseCardPicker} style={styles.headerButton}>
              <ThemedText style={styles.headerButtonText}>Done</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12 }}>
            {isPickingBoard && (
              <View style={{ marginBottom: 12, padding: 8, backgroundColor: themeColors.card, borderRadius: 6, borderWidth: 1, borderColor: themeColors.border }}>
                <ThemedText style={{ fontSize: 12, color: themeColors.subText, textAlign: 'center' }}>
                  Select 3 cards for Flop, 4 for Turn, or 5 for River.
                </ThemedText>
              </View>
            )}
            <View style={{ gap: 12 }}>
              {SUITS.map(suit => (
                <View key={suit.id}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {RANKS.map(rank => {
                      const cardId = `${rank}${suit.id}`;
                      
                      let isSelectedByMe = false;
                      let isUsedByOthers = false;

                      if (activeCardSeat !== null) {
                        isSelectedByMe = (handCards[activeCardSeat] || []).includes(cardId);
                        isUsedByOthers = Object.entries(handCards).some(([seat, cards]) => 
                          parseInt(seat) !== activeCardSeat && cards.includes(cardId)
                        ) || communityCards.includes(cardId);
                      } else if (isPickingBoard) {
                        isSelectedByMe = communityCards.includes(cardId);
                        isUsedByOthers = Object.values(handCards).flat().includes(cardId);
                      }

                      return (
                        <TouchableOpacity
                          key={cardId}
                          onPress={() => toggleCard(cardId)}
                          disabled={isUsedByOthers}
                          style={{
                            width: 38,
                            height: 52,
                            borderRadius: 4,
                            backgroundColor: isSelectedByMe ? '#2196f3' : isUsedByOthers ? '#eee' : themeColors.card,
                            borderWidth: 1,
                            borderColor: isSelectedByMe ? '#2196f3' : themeColors.border,
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: isUsedByOthers ? 0.3 : 1,
                          }}
                        >
                          <Text style={{ 
                            fontSize: 14, 
                            fontWeight: 'bold', 
                            color: isSelectedByMe ? '#fff' : isUsedByOthers ? '#999' : themeColors.text 
                          }}>
                            {rank}
                          </Text>
                          <Text style={{ 
                            fontSize: 16, 
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

      {/* Winner Selection Modal */}
      <WinnerSelectionModal
        visible={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        onConfirm={handleConfirmWinners}
        seats={seats}
        sidePots={sidePots}
        themeColors={themeColors}
      />
    </ThemedView>
  );
}
