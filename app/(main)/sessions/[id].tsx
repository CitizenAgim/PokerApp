import { HandHistoryItem } from '@/components/HandHistoryItem';
import { PokerTable } from '@/components/table/PokerTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useCurrentSession, useCurrentUser, usePlayers, useSession, useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteHandRecords, getHandsBySession, HandRecord } from '@/services/firebase/hands';
import { getThemeColors, styles } from '@/styles/sessions/[id].styles';
import { formatDate } from '@/utils/text';
import { Ionicons } from '@expo/vector-icons';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Force refresh
const PLAYER_COLORS = [
  { name: 'Green', hex: '#2ecc71' },
  { name: 'Red', hex: '#e74c3c' },
  { name: 'Yellow', hex: '#f1c40f' },
  { name: 'Orange', hex: '#e67e22' },
  { name: 'Purple', hex: '#9b59b6' },
  { name: 'Blue', hex: '#3498db' },
  { name: 'Cyan', hex: '#1abc9c' },
  { name: 'Pink', hex: '#e91e63' },
  { name: 'Gray', hex: '#95a5a6' },
];

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, table, loading, updateButtonPosition, assignPlayerToSeat, updateSeatStack, movePlayer, endSession, updateSessionDetails, updateHeroSeat, clearTable } = useSession(id);
  const { user, loading: userLoading } = useCurrentUser();
  const { clearSession } = useCurrentSession();
  const { players, createPlayer, updatePlayer } = usePlayers();
  const { dateFormat } = useSettings();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme colors
  const themeColors = getThemeColors(isDark);
  
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  
  // Stack Editor State
  const [showStackEditor, setShowStackEditor] = useState(false);
  const [editingSeat, setEditingSeat] = useState<number | null>(null);
  const [stackAmount, setStackAmount] = useState('');

  // Color Picker State
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [colorPickerSeat, setColorPickerSeat] = useState<number | null>(null);

  // Create Player State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNotes, setNewPlayerNotes] = useState('');
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);
  
  // Unknown Player State
  const [showUnknownPlayerModal, setShowUnknownPlayerModal] = useState(false);
  const [unknownPlayerStack, setUnknownPlayerStack] = useState('');
  
  // Player Action Sheet State (for Android)
  const [showPlayerActionSheet, setShowPlayerActionSheet] = useState(false);
  const [actionSheetSeat, setActionSheetSeat] = useState<number | null>(null);
  
  // Selection State
  const [selectedHandIds, setSelectedHandIds] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedHandIds.size > 0;

  const toggleSelection = (handId: string) => {
    const newSelection = new Set(selectedHandIds);
    if (newSelection.has(handId)) {
      newSelection.delete(handId);
    } else {
      newSelection.add(handId);
    }
    setSelectedHandIds(newSelection);
  };

  const handleHandLongPress = (hand: HandRecord) => {
    if (!isSelectionMode) {
      const newSelection = new Set<string>();
      newSelection.add(hand.id);
      setSelectedHandIds(newSelection);
    }
  };

  const handleHandPress = (hand: HandRecord) => {
    if (isSelectionMode) {
      toggleSelection(hand.id);
    } else {
      router.push(`/hand-replay/${hand.id}`);
    }
  };

  const cancelSelection = () => {
    setSelectedHandIds(new Set());
  };

  const handleDeleteHands = () => {
    Alert.alert(
      'Delete Hands',
      'Are you sure you want to delete ' + selectedHandIds.size + ' hand' + (selectedHandIds.size > 1 ? 's' : '') + '?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const handsToDelete = hands.filter(h => selectedHandIds.has(h.id));
              await deleteHandRecords(handsToDelete);
              setHands(prev => prev.filter(h => !selectedHandIds.has(h.id)));
              setSelectedHandIds(new Set());
            } catch (error) {
              Alert.alert('Error', 'Failed to delete hands');
            }
          },
        },
      ]
    );
  };

  // Edit Buy-in State
  const [showEditBuyInModal, setShowEditBuyInModal] = useState(false);
  const [editBuyInAmount, setEditBuyInAmount] = useState('');

  // End Session State
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [endSessionBuyIn, setEndSessionBuyIn] = useState('');
  const [pauseDuration, setPauseDuration] = useState('');
  const [endTime, setEndTime] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [isStartTimeExpanded, setIsStartTimeExpanded] = useState(false);
  const [isEndTimeExpanded, setIsEndTimeExpanded] = useState(false);

  // Edit Session State
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [editBuyIn, setEditBuyIn] = useState('');
  const [editCashOut, setEditCashOut] = useState('');
  const [editStartTime, setEditStartTime] = useState(new Date());
  const [editEndTime, setEditEndTime] = useState(new Date());

  // New Table Confirmation State
  const [showNewTableConfirm, setShowNewTableConfirm] = useState(false);

  // Hand History State
  const [hands, setHands] = useState<HandRecord[]>([]);
  const [loadingHands, setLoadingHands] = useState(false);

  // Fetch hands when screen is focused
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchHands = async () => {
        if (!id || userLoading) return;
        
        if (!user) {
          console.log('User not authenticated, skipping hand fetch');
          return;
        }

        console.log('[SessionDetail] Fetching hands for user:', user.id, 'session:', id);

        try {
          setLoadingHands(true);
          const fetchedHands = await getHandsBySession(id, user.id);
          if (isActive) {
            setHands(fetchedHands);
          }
        } catch (error) {
          console.error('Error fetching hands:', error);
        } finally {
          if (isActive) {
            setLoadingHands(false);
          }
        }
      };

      fetchHands();

      return () => {
        isActive = false;
      };
    }, [id, user?.id, userLoading])
  );

  // Result View State
  const [activeTab, setActiveTab] = useState<'overview' | 'hands'>('overview');

  // Get all unique locations from players
  const allLocations = useMemo(() => {
    const locs = new Set<string>();
    players.forEach(p => p.locations?.forEach(l => locs.add(l)));
    return Array.from(locs).sort();
  }, [players]);

  // Players not already at the table
  const availablePlayers = useMemo(() => {
    if (!table || !table.seats) return players;
    const seatedPlayerIds = new Set(
      table.seats
        .filter(s => s.playerId)
        .map(s => s.playerId)
    );
    let filtered = players.filter(p => !seatedPlayerIds.has(p.id));
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
    }

    if (filterLocation) {
      filtered = filtered.filter(p => p.locations?.includes(filterLocation));
    }
    
    return filtered;
  }, [players, table, searchQuery, filterLocation]);

  const handleSeatPress = (seatNumber: number) => {
    if (!table) return;
    
    const seat = table.seats.find((s, i) => {
      const sNum = s.seatNumber ?? (typeof s.index === 'number' ? s.index + 1 : i + 1);
      return sNum === seatNumber;
    });
    if (!seat) return;
    
    if (seat.playerId || seat.player) {
      // On Android, use custom action sheet to show all options
      if (Platform.OS === 'android') {
        setActionSheetSeat(seatNumber);
        setShowPlayerActionSheet(true);
      } else {
        // iOS uses native Alert
        Alert.alert(
          `Seat ${seatNumber} - ${seat.player?.name || 'Player'}`,
          `Stack: ${seat.player?.stack || 0}`,
          [
            {
              text: 'Ranges & Notes',
              onPress: () => seat.playerId ? router.push(`/(main)/sessions/player/${seat.playerId}`) : Alert.alert('Info', 'Cannot view details for unknown player'),
            },
            {
              text: 'Set Color',
              onPress: () => {
                setEditingPlayerId(seat.playerId || seat.player?.id || null);
                setColorPickerSeat(seatNumber);
                setShowColorPicker(true);
              }
            },
            {
              text: 'Edit Stack',
              onPress: () => {
                setEditingSeat(seatNumber);
                setStackAmount(seat.player?.stack?.toString() || '');
                setShowStackEditor(true);
              }
            },
            {
              text: 'Set as Button',
              onPress: () => updateButtonPosition(seatNumber),
            },
            {
              text: table?.heroSeatIndex === seatNumber ? 'Remove as Hero' : 'Set as Hero',
              onPress: () => updateHeroSeat(table?.heroSeatIndex === seatNumber ? undefined : seatNumber),
            },
            {
              text: 'Remove Player',
              style: 'destructive',
              onPress: () => assignPlayerToSeat(seatNumber, null),
            },
            { text: 'Cancel', style: 'cancel' },
          ],
          { cancelable: true }
        );
      }
    } else {
      // Assign player to empty seat
      setSelectedSeat(seatNumber);
      setSearchQuery('');
      setShowPlayerPicker(true);
    }
  };

  const handleAssignUnknownPlayer = async () => {
    if (selectedSeat === null) return;
    
    // Close player picker and show unknown player modal
    setShowPlayerPicker(false);
    setUnknownPlayerStack('');
    setTimeout(() => {
      setShowUnknownPlayerModal(true);
    }, 300);
  };
  
  const handleConfirmUnknownPlayer = async () => {
    if (selectedSeat === null) return;
    
    const initialStack = unknownPlayerStack ? parseFloat(unknownPlayerStack) : 0;
    if (isNaN(initialStack)) {
      Alert.alert('Error', 'Invalid stack size');
      return;
    }
    
    await assignPlayerToSeat(selectedSeat, null, initialStack, {
      name: 'Unknown',
      isTemp: true,
    });
    setShowUnknownPlayerModal(false);
    setSelectedSeat(null);
    setUnknownPlayerStack('');
  };

  const handleSaveStack = async () => {
    if (editingSeat === null) return;
    
    const stack = parseFloat(stackAmount);
    if (isNaN(stack)) {
      Alert.alert('Error', 'Please enter a valid stack amount');
      return;
    }

    // Find player name if possible, to handle legacy seats without player object
    let playerName: string | undefined;
    if (table) {
      const seat = table.seats.find(s => {
        const sNum = s.seatNumber ?? (typeof s.index === 'number' ? s.index + 1 : 0);
        return sNum === editingSeat;
      });
      
      if (seat) {
        if (seat.player) {
          playerName = seat.player.name;
        } else if (seat.playerId) {
          const found = players.find(p => p.id === seat.playerId);
          if (found) playerName = found.name;
        }
      }
    }

    await updateSeatStack(editingSeat, stack, playerName);
    setShowStackEditor(false);
    setEditingSeat(null);
    setStackAmount('');
  };

  const handleColorSelect = async (color: string) => {
    if (!editingPlayerId && colorPickerSeat === null) return;

    const finalColor = color === '#95a5a6' ? undefined : color;

    try {
      // Check if it's a temp player
      let isTemp = false;
      if (colorPickerSeat !== null && table) {
        const seat = table.seats.find(s => {
          const sNum = s.seatNumber ?? (typeof s.index === 'number' ? s.index + 1 : 0);
          return sNum === colorPickerSeat;
        });
        // Check if explicitly temp OR if it has no playerId (implicit temp)
        if (seat?.player?.isTemp || !seat?.playerId) {
          isTemp = true;
        }
      }

      if (isTemp && colorPickerSeat !== null) {
        // Update temp player in the seat
        await assignPlayerToSeat(colorPickerSeat, null, undefined, { color: finalColor });
      } else if (editingPlayerId) {
        // Update persistent player
        await updatePlayer({
          id: editingPlayerId,
          color: finalColor,
        });
      }

      setShowColorPicker(false);
      setEditingPlayerId(null);
      setColorPickerSeat(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update player color');
    }
  };

  const handleAssignPlayer = async (playerId: string) => {
    if (selectedSeat === null) return;
    
    // Prompt for stack size
    Alert.prompt(
      'Initial Stack',
      'Enter stack size:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Assign',
          onPress: async (stack?: string) => {
            const initialStack = stack ? parseFloat(stack) : 0;
            await assignPlayerToSeat(selectedSeat, playerId, initialStack);
            setShowPlayerPicker(false);
            setSelectedSeat(null);
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleSaveNewPlayer = async () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }

    try {
      setIsCreatingPlayer(true);
      const newPlayer = await createPlayer({
        name: newPlayerName.trim(),
        notes: newPlayerNotes.trim() || undefined,
        locations: session?.location ? [session.location] : [],
      });
      
      setShowCreatePlayerModal(false);
      setNewPlayerName('');
      setNewPlayerNotes('');
      
      // Auto-assign the new player
      if (selectedSeat !== null && newPlayer) {
        await assignPlayerToSeat(selectedSeat, newPlayer.id);
        setShowPlayerPicker(false);
        setSelectedSeat(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create player');
      console.error(error);
    } finally {
      setIsCreatingPlayer(false);
    }
  };

  const openEditBuyInModal = () => {
    if (session) {
      setEditBuyInAmount(session.buyIn?.toString() || '');
      setShowEditBuyInModal(true);
    }
  };

  const handleEditBuyIn = async () => {
    if (!editBuyInAmount) return;
    const amount = parseFloat(editBuyInAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await updateSessionDetails({
        buyIn: amount
      });
      setShowEditBuyInModal(false);
      setEditBuyInAmount('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update buy-in');
    }
  };

  const handleNewTable = () => {
    setShowNewTableConfirm(true);
  };

  const confirmNewTable = async () => {
    try {
      await clearTable();
      setShowNewTableConfirm(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to clear table');
    }
  };

  const handleEndSession = () => {
    if (session) {
      setStartTime(new Date(session.startTime));
      setEndSessionBuyIn(session.buyIn?.toString() || '');
    }
    setEndTime(new Date());
    setCashOutAmount('');
    setPauseDuration('');
    setIsStartTimeExpanded(false);
    setIsEndTimeExpanded(false);
    setShowEndSessionModal(true);
  };

  const confirmEndSession = async () => {
    try {
      const cashOut = cashOutAmount ? parseFloat(cashOutAmount) : 0;
      const buyIn = endSessionBuyIn ? parseFloat(endSessionBuyIn) : (session?.buyIn || 0);
      const pauseMins = pauseDuration ? parseFloat(pauseDuration) : 0;
      
      if (endTime < startTime) {
        Alert.alert('Error', 'End time cannot be earlier than start time');
        return;
      }

      const totalDurationMs = endTime.getTime() - startTime.getTime();
      const pauseDurationMs = pauseMins * 60 * 1000;

      if (pauseDurationMs > totalDurationMs) {
        Alert.alert('Error', 'Pause duration cannot be longer than the session duration');
        return;
      }

      await endSession(cashOut, endTime.getTime(), startTime.getTime(), buyIn, pauseMins);
      await clearSession();
      setShowEndSessionModal(false);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to end session');
    }
  };

  const handleEditSession = () => {
    if (!session) return;
    setEditBuyIn(session.buyIn?.toString() || '');
    setEditCashOut(session.cashOut?.toString() || '');
    setEditStartTime(new Date(session.startTime));
    setEditEndTime(session.endTime ? new Date(session.endTime) : new Date());
    setShowEditSessionModal(true);
  };

  const confirmEditSession = async () => {
    try {
      const buyIn = parseFloat(editBuyIn);
      const cashOut = editCashOut ? parseFloat(editCashOut) : undefined;
      
      if (isNaN(buyIn)) {
        Alert.alert('Error', 'Please enter a valid buy-in amount');
        return;
      }

      await updateSessionDetails({
        buyIn,
        cashOut,
        startTime: editStartTime.getTime(),
        endTime: editEndTime.getTime(),
      });
      
      setShowEditSessionModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update session');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.subText }]}>Session not found</Text>
      </View>
    );
  }

  // If session is ended, show summary regardless of table state
  if (!session.isActive) {
    const buyIn = session.buyIn || 0;
    const cashOut = session.cashOut || 0;
    const profit = cashOut - buyIn;
    const isProfit = profit >= 0;
    
    const durationMs = (session.endTime || Date.now()) - session.startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.summaryHeader, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
          <Text style={[styles.summaryTitle, { color: themeColors.text }]}>Session Result</Text>
          <Text style={[styles.summaryDate, { color: themeColors.subText }]}>
            {formatDate(session.startTime, dateFormat)}
          </Text>
          <TouchableOpacity onPress={handleEditSession} style={[styles.editButton, { backgroundColor: themeColors.actionButtonBg }]}>
            <Ionicons name="pencil" size={16} color="#0a7ea4" />
            <Text style={styles.editButtonText}>Edit Session</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.tabContainer, { backgroundColor: themeColors.tabBg }]}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'overview' && [styles.activeTabButton, { backgroundColor: themeColors.tabActiveBg }]]} 
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, { color: themeColors.subText }, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'hands' && [styles.activeTabButton, { backgroundColor: themeColors.tabActiveBg }]]} 
            onPress={() => setActiveTab('hands')}
          >
            <Text style={[styles.tabText, { color: themeColors.subText }, activeTab === 'hands' && styles.activeTabText]}>Hands</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' ? (
          <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
            <View style={styles.resultContainer}>
              <Text style={[styles.resultLabel, { color: themeColors.subText }]}>Total Profit/Loss</Text>
              <Text style={[styles.resultAmount, isProfit ? styles.profitText : styles.lossText]}>
                {isProfit ? '+' : ''}{profit}
              </Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: themeColors.subText }]}>Buy In</Text>
                <Text style={[styles.statValue, { color: themeColors.text }]}>{buyIn}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: themeColors.subText }]}>Cash Out</Text>
                <Text style={[styles.statValue, { color: themeColors.text }]}>{cashOut}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: themeColors.subText }]}>Duration</Text>
                <Text style={[styles.statValue, { color: themeColors.text }]}>{durationStr}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: themeColors.subText }]}>Stakes</Text>
                <Text style={[styles.statValue, { color: themeColors.text }]}>{session.stakes || '-'}</Text>
              </View>
            </View>

            {session.location && (
              <View style={[styles.locationContainer, { borderTopColor: themeColors.border }]}>
                <Ionicons name="location" size={16} color={themeColors.icon} />
                <Text style={[styles.locationText, { color: themeColors.subText }]}>{session.location}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
             {/* Selection Header */}
             {isSelectionMode && (
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  paddingHorizontal: 16, 
                  paddingVertical: 12, 
                  backgroundColor: themeColors.card, 
                  borderBottomWidth: 1, 
                  borderBottomColor: themeColors.border 
                }}>
                  <TouchableOpacity onPress={cancelSelection} style={{ padding: 4 }}>
                    <Text style={{ color: themeColors.text, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: themeColors.text }}>
                    {selectedHandIds.size} Selected
                  </Text>
                  <TouchableOpacity onPress={handleDeleteHands} style={{ padding: 4 }}>
                    <Text style={{ color: '#ff3b30', fontSize: 16, fontWeight: '600' }}>
                      Delete ({selectedHandIds.size})
                    </Text>
                  </TouchableOpacity>
                </View>
             )}

             {hands.length === 0 ? (
               <View style={[styles.graphContainer, { backgroundColor: themeColors.card }]}>
                 <Text style={[styles.placeholderText, { color: themeColors.subText }]}>No hands recorded for this session.</Text>
               </View>
             ) : (
               <FlatList
                 data={hands}
                 keyExtractor={item => item.id}
                 extraData={selectedHandIds}
                 renderItem={({ item }) => (
                   <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                     <HandHistoryItem 
                       hand={item} 
                       onPress={handleHandPress}
                       onLongPress={handleHandLongPress}
                       isSelected={selectedHandIds.has(item.id)}
                       isSelectionMode={isSelectionMode}
                     />
                   </View>
                 )}
                 contentContainerStyle={{ paddingVertical: 16 }}
               />
             )}
          </View>
        )}

        {/* Edit Session Modal */}
        <Modal
          visible={showEditSessionModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowEditSessionModal(false)}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.centeredModalOverlay, { backgroundColor: themeColors.modalOverlay }]}
          >
            <View style={[styles.centeredModalContent, { backgroundColor: themeColors.modalBg }]}>
              <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Session</Text>
                <TouchableOpacity onPress={() => setShowEditSessionModal(false)}>
                  <Ionicons name="close" size={24} color={themeColors.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.formContent}>
                <Text style={[styles.label, { color: themeColors.text }]}>Buy In</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  value={editBuyIn}
                  onChangeText={setEditBuyIn}
                  placeholder="0"
                  placeholderTextColor={themeColors.placeholder}
                  keyboardType="numeric"
                />

                <Text style={[styles.label, { color: themeColors.text }]}>Cash Out</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  value={editCashOut}
                  onChangeText={setEditCashOut}
                  placeholder="0"
                  placeholderTextColor={themeColors.placeholder}
                  keyboardType="numeric"
                />
                
                <Text style={[styles.label, { color: themeColors.text }]}>Start Time</Text>
                <View style={styles.datePickerContainer}>
                  {Platform.OS === 'ios' ? (
                    <RNDateTimePicker
                      value={editStartTime}
                      mode="datetime"
                      display="spinner"
                      onChange={(event, date) => date && setEditStartTime(date)}
                      style={styles.datePicker}
                      textColor={themeColors.text}
                    />
                  ) : (
                    <View style={styles.androidPickerButtons}>
                      <TouchableOpacity style={[styles.androidPickerButton, { backgroundColor: themeColors.modalInputBg }]}>
                        <Text style={{ color: themeColors.text }}>{editStartTime.toLocaleString()}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text style={[styles.label, { color: themeColors.text }]}>End Time</Text>
                <View style={styles.datePickerContainer}>
                  {Platform.OS === 'ios' ? (
                    <RNDateTimePicker
                      value={editEndTime}
                      mode="datetime"
                      display="spinner"
                      onChange={(event, date) => date && setEditEndTime(date)}
                      style={styles.datePicker}
                      textColor={themeColors.text}
                    />
                  ) : (
                    <View style={styles.androidPickerButtons}>
                      <TouchableOpacity style={[styles.androidPickerButton, { backgroundColor: themeColors.modalInputBg }]}>
                        <Text style={{ color: themeColors.text }}>{editEndTime.toLocaleString()}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>

              <View style={[styles.modalFooter, { backgroundColor: themeColors.modalFooterBg, borderTopColor: themeColors.border }]}>
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={confirmEditSession}
                >
                  <Text style={styles.confirmButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  if (!table) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.subText }]}>Table data not found</Text>
      </View>
    );
  }

  const occupiedSeats = table.seats ? table.seats.filter(s => s.playerId || s.player).length : 0;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <FlatList
        data={hands}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <HandHistoryItem 
              hand={item} 
              onPress={(hand) => {
                router.push(`/hand-replay/${hand.id}`);
              }} 
            />
          </View>
        )}
        ListHeaderComponent={
          <>
            {/* Session Info Header */}
            <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
              <View style={styles.headerInfo}>
                <Text style={[styles.sessionName, { color: themeColors.text }]}>{session.name}</Text>
                <View style={styles.headerMeta}>
                  {session.location && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location" size={14} color={themeColors.icon} />
                      <Text style={[styles.metaText, { color: themeColors.subText }]}>{session.location}</Text>
                    </View>
                  )}
                  {session.stakes && (
                    <View style={styles.metaItem}>
                      <Ionicons name="cash" size={14} color={themeColors.icon} />
                      <Text style={[styles.metaText, { color: themeColors.subText }]}>{session.stakes}</Text>
                    </View>
                  )}
                  <View style={styles.metaItem}>
                    <Ionicons name="wallet" size={14} color={themeColors.icon} />
                    <Text style={[styles.metaText, { color: themeColors.subText }]}>Buy-in: {session.buyIn || 0}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.headerStats, { flexDirection: 'row', alignItems: 'center' }]}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.statsNumber}>{occupiedSeats}/9</Text>
                  <Text style={[styles.statsLabel, { color: themeColors.subText }]}>Players</Text>
                </View>
                <TouchableOpacity 
                  onPress={handleNewTable}
                  style={{ marginLeft: 16, padding: 4 }}
                >
                  <Ionicons name="refresh-circle-outline" size={28} color={themeColors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Table View */}
            <PokerTable
              seats={table.seats}
              players={players}
              buttonPosition={table.buttonPosition}
              heroSeat={table.heroSeatIndex}
              onSeatPress={handleSeatPress}
              onMovePlayer={movePlayer}
              themeColors={themeColors}
              currency={session.currency}
              showCards={false}
            />

            {/* Quick Actions */}
            <View style={[styles.actions, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: themeColors.actionButtonBg }]}
                onPress={() => router.push({ pathname: '/record-hand', params: { sessionId: id } })}
              >
                <Ionicons name="create-outline" size={20} color="#0a7ea4" />
                <Text style={styles.actionText}>Record Hand</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: isDark ? '#1b3a20' : '#e8f5e9' }]}
                onPress={openEditBuyInModal}
              >
                <Ionicons name="cash-outline" size={20} color="#2e7d32" />
                <Text style={[styles.actionText, { color: '#2e7d32' }]}>Edit Buy-in</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonDanger, { backgroundColor: themeColors.actionButtonDangerBg }]}
                onPress={handleEndSession}
              >
                <Ionicons name="stop-circle" size={20} color="#e74c3c" />
                <Text style={[styles.actionText, styles.actionTextDanger]}>End Session</Text>
              </TouchableOpacity>
            </View>

            {/* History Title */}
            {hands.length > 0 && (
              <View style={{ padding: 16, paddingBottom: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: themeColors.text }}>Hand History</Text>
              </View>
            )}
          </>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Player Picker Modal */}
      <Modal
        visible={showPlayerPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPlayerPicker(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { backgroundColor: themeColors.modalOverlay }]}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Assign Player to Seat {selectedSeat}
              </Text>
              <TouchableOpacity onPress={() => setShowPlayerPicker(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchContainer, { backgroundColor: themeColors.searchBg }]}>
              <Ionicons name="search" size={20} color={themeColors.icon} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                placeholder="Search players..."
                placeholderTextColor={themeColors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={themeColors.icon} />
                </TouchableOpacity>
              )}
            </View>

            {/* Location Filter */}
            {allLocations.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <TouchableOpacity
                  style={[
                    styles.filterChip, 
                    { backgroundColor: themeColors.filterChipBg },
                    !filterLocation && [styles.filterChipActive, { backgroundColor: themeColors.filterChipActiveBg, borderColor: themeColors.filterChipActiveBg }]
                  ]}
                  onPress={() => setFilterLocation(null)}
                >
                  <Text style={[
                    styles.filterChipText, 
                    { color: themeColors.filterChipText },
                    !filterLocation && [styles.filterChipTextActive, { color: themeColors.filterChipActiveText }]
                  ]}>All</Text>
                </TouchableOpacity>
                {allLocations.map(loc => (
                  <TouchableOpacity
                    key={loc}
                    style={[
                      styles.filterChip, 
                      { backgroundColor: themeColors.filterChipBg },
                      filterLocation === loc && [styles.filterChipActive, { backgroundColor: themeColors.filterChipActiveBg, borderColor: themeColors.filterChipActiveBg }]
                    ]}
                    onPress={() => setFilterLocation(filterLocation === loc ? null : loc)}
                  >
                    <Text style={[
                      styles.filterChipText, 
                      { color: themeColors.filterChipText },
                      filterLocation === loc && [styles.filterChipTextActive, { color: themeColors.filterChipActiveText }]
                    ]}>{loc}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.createPlayerRow, { backgroundColor: themeColors.createPlayerRowBg, borderBottomColor: themeColors.border }]}
              onPress={() => {
                // Close the picker first to avoid "already presenting" error on iOS
                setShowPlayerPicker(false);
                // Small delay to allow the first modal to dismiss completely
                setTimeout(() => {
                  setShowCreatePlayerModal(true);
                }, 500);
              }}
            >
              <View style={styles.createPlayerIcon}>
                <Ionicons name="add" size={24} color="#fff" />
              </View>
              <Text style={styles.createPlayerText}>Create New Player</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createPlayerRow, { backgroundColor: themeColors.createPlayerRowBg, borderBottomColor: themeColors.border }]}
              onPress={handleAssignUnknownPlayer}
            >
              <View style={[styles.createPlayerIcon, { backgroundColor: '#6c757d' }]}>
                <Ionicons name="person-outline" size={24} color="#fff" />
              </View>
              <Text style={styles.createPlayerText}>Unknown Player</Text>
            </TouchableOpacity>

            <ScrollView style={styles.playerList} keyboardShouldPersistTaps="handled">
              {availablePlayers.length === 0 ? (
                <View style={styles.emptyPlayers}>
                  <Text style={[styles.emptyPlayersText, { color: themeColors.subText }]}>
                    No players found matching "{searchQuery}"
                  </Text>
                </View>
              ) : (
                availablePlayers.map(player => (
                  <TouchableOpacity
                    key={player.id}
                    style={[styles.playerOption, { backgroundColor: themeColors.playerOptionBg }]}
                    onPress={() => handleAssignPlayer(player.id)}
                  >
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerInitial}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={[styles.playerName, { color: themeColors.text }]}>{player.name}</Text>
                      {player.notes && (
                        <Text style={[styles.playerNotes, { color: themeColors.subText }]} numberOfLines={1}>
                          {player.notes}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Create Player Modal */}
      <Modal
        visible={showCreatePlayerModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreatePlayerModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.centeredModalOverlay, { backgroundColor: themeColors.modalOverlay }]}
        >
          <View style={[styles.centeredModalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>New Player</Text>
              <TouchableOpacity onPress={() => setShowCreatePlayerModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContent} keyboardShouldPersistTaps="handled">
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {newPlayerName ? newPlayerName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.label, { color: themeColors.text }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                placeholder="Enter player name"
                placeholderTextColor={themeColors.placeholder}
                autoFocus
              />

              <Text style={[styles.label, { color: themeColors.text }]}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={newPlayerNotes}
                onChangeText={setNewPlayerNotes}
                placeholder="Add notes..."
                placeholderTextColor={themeColors.placeholder}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: themeColors.modalFooterBg, borderTopColor: themeColors.border }]}>
              <TouchableOpacity 
                style={[styles.confirmButton, !newPlayerName.trim() && styles.saveButtonDisabled]}
                onPress={handleSaveNewPlayer}
                disabled={isCreatingPlayer || !newPlayerName.trim()}
              >
                {isCreatingPlayer ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Create & Assign</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Unknown Player Modal */}
      <Modal
        visible={showUnknownPlayerModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowUnknownPlayerModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.centeredModalOverlay, { backgroundColor: themeColors.modalOverlay }]}
        >
          <View style={[styles.centeredModalContent, { backgroundColor: themeColors.modalBg, width: '80%' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Unknown Player</Text>
              <TouchableOpacity onPress={() => setShowUnknownPlayerModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.formContent, { paddingHorizontal: 20, paddingVertical: 20 }]}>
              <Text style={[styles.label, { color: themeColors.text }]}>Initial Stack Size</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={unknownPlayerStack}
                onChangeText={setUnknownPlayerStack}
                placeholder="0"
                placeholderTextColor={themeColors.placeholder}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <View style={[styles.modalFooter, { backgroundColor: themeColors.modalFooterBg, borderTopColor: themeColors.border }]}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: themeColors.border }]}
                onPress={() => setShowUnknownPlayerModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleConfirmUnknownPlayer}
              >
                <Text style={styles.confirmButtonText}>Add Player</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Player Action Sheet Modal (Android) */}
      <Modal
        visible={showPlayerActionSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPlayerActionSheet(false)}
      >
        <TouchableOpacity 
          style={[styles.centeredModalOverlay, { backgroundColor: themeColors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowPlayerActionSheet(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.actionSheetContent, { backgroundColor: themeColors.modalBg }]}
          >
            {actionSheetSeat && table?.seats.find((s, i) => {
              const sNum = s.seatNumber ?? (typeof s.index === 'number' ? s.index + 1 : i + 1);
              return sNum === actionSheetSeat;
            }) && (() => {
              const seat = table.seats.find((s, i) => {
                const sNum = s.seatNumber ?? (typeof s.index === 'number' ? s.index + 1 : i + 1);
                return sNum === actionSheetSeat;
              })!;
              
              return (
                <>
                  <View style={[styles.actionSheetHeader, { borderBottomColor: themeColors.border }]}>
                    <View>
                      <Text style={[styles.actionSheetTitle, { color: themeColors.text }]}>
                        Seat {actionSheetSeat} - {seat.player?.name || 'Player'}
                      </Text>
                      <Text style={[styles.actionSheetSubtitle, { color: themeColors.subText }]}>
                        Stack: {seat.player?.stack || 0}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowPlayerActionSheet(false)}>
                      <Ionicons name="close" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.actionSheetOptions}>
                    <TouchableOpacity
                      style={[styles.actionSheetOption, { borderBottomColor: themeColors.border }]}
                      onPress={() => {
                        setShowPlayerActionSheet(false);
                        if (seat.playerId) {
                          router.push(`/(main)/sessions/player/${seat.playerId}`);
                        } else {
                          Alert.alert('Info', 'Cannot view details for unknown player');
                        }
                      }}
                    >
                      <Ionicons name="document-text-outline" size={24} color={themeColors.icon} />
                      <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>
                        Ranges & Notes
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionSheetOption, { borderBottomColor: themeColors.border }]}
                      onPress={() => {
                        setShowPlayerActionSheet(false);
                        setEditingPlayerId(seat.playerId || seat.player?.id || null);
                        setColorPickerSeat(actionSheetSeat);
                        setShowColorPicker(true);
                      }}
                    >
                      <Ionicons name="color-palette-outline" size={24} color={themeColors.icon} />
                      <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>
                        Set Color
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionSheetOption, { borderBottomColor: themeColors.border }]}
                      onPress={() => {
                        setShowPlayerActionSheet(false);
                        setEditingSeat(actionSheetSeat);
                        setStackAmount(seat.player?.stack?.toString() || '');
                        setShowStackEditor(true);
                      }}
                    >
                      <Ionicons name="cash-outline" size={24} color={themeColors.icon} />
                      <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>
                        Edit Stack
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionSheetOption, { borderBottomColor: themeColors.border }]}
                      onPress={() => {
                        setShowPlayerActionSheet(false);
                        updateButtonPosition(actionSheetSeat);
                      }}
                    >
                      <Ionicons name="radio-button-on-outline" size={24} color={themeColors.icon} />
                      <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>
                        Set as Button
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionSheetOption, { borderBottomColor: themeColors.border }]}
                      onPress={() => {
                        setShowPlayerActionSheet(false);
                        updateHeroSeat(table?.heroSeatIndex === actionSheetSeat ? undefined : actionSheetSeat);
                      }}
                    >
                      <Ionicons name="star-outline" size={24} color={themeColors.icon} />
                      <Text style={[styles.actionSheetOptionText, { color: themeColors.text }]}>
                        {table?.heroSeatIndex === actionSheetSeat ? 'Remove as Hero' : 'Set as Hero'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionSheetOption, { borderBottomColor: 'transparent' }]}
                      onPress={() => {
                        setShowPlayerActionSheet(false);
                        assignPlayerToSeat(actionSheetSeat, null);
                      }}
                    >
                      <Ionicons name="trash-outline" size={24} color="#e74c3c" />
                      <Text style={[styles.actionSheetOptionText, { color: '#e74c3c' }]}>
                        Remove Player
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              );
            })()}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* End Session Modal */}
      <Modal
        visible={showEndSessionModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEndSessionModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.centeredModalOverlay, { backgroundColor: themeColors.modalOverlay }]}
        >
          <View style={[styles.centeredModalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>End Session</Text>
              <TouchableOpacity onPress={() => setShowEndSessionModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.formContent}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.label, { color: themeColors.text }]}>Buy In Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={endSessionBuyIn}
                onChangeText={setEndSessionBuyIn}
                placeholder="0"
                placeholderTextColor={themeColors.placeholder}
                keyboardType="numeric"
              />

              <Text style={[styles.label, { color: themeColors.text }]}>Cash Out Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={cashOutAmount}
                onChangeText={setCashOutAmount}
                placeholder="0"
                placeholderTextColor={themeColors.placeholder}
                keyboardType="numeric"
                autoFocus
              />
              
              {/* Start Time Collapsible */}
              <TouchableOpacity 
                style={[styles.collapsibleHeader, { borderBottomColor: themeColors.border }]} 
                onPress={() => setIsStartTimeExpanded(!isStartTimeExpanded)}
              >
                <Text style={[styles.label, { color: themeColors.text }]}>Start Time</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.dateValue, { color: themeColors.subText }]}>
                    {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name={isStartTimeExpanded ? "chevron-up" : "chevron-down"} size={20} color={themeColors.icon} />
                </View>
              </TouchableOpacity>
              
              {isStartTimeExpanded && (
                <View style={styles.datePickerContainer}>
                  {Platform.OS === 'ios' ? (
                    <RNDateTimePicker
                      value={startTime}
                      mode="datetime"
                      display="spinner"
                      onChange={(event, date) => date && setStartTime(date)}
                      style={styles.datePicker}
                      textColor={themeColors.text}
                    />
                  ) : (
                    <View style={styles.androidPickerButtons}>
                      <TouchableOpacity style={[styles.androidPickerButton, { backgroundColor: themeColors.modalInputBg }]}>
                        <Text style={{ color: themeColors.text }}>{startTime.toLocaleString()}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* End Time Collapsible */}
              <TouchableOpacity 
                style={[styles.collapsibleHeader, { borderBottomColor: themeColors.border }]} 
                onPress={() => setIsEndTimeExpanded(!isEndTimeExpanded)}
              >
                <Text style={[styles.label, { color: themeColors.text }]}>End Time</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.dateValue, { color: themeColors.subText }]}>
                    {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name={isEndTimeExpanded ? "chevron-up" : "chevron-down"} size={20} color={themeColors.icon} />
                </View>
              </TouchableOpacity>

              {isEndTimeExpanded && (
                <View style={styles.datePickerContainer}>
                  {Platform.OS === 'ios' ? (
                    <RNDateTimePicker
                      value={endTime}
                      mode="datetime"
                      display="spinner"
                      onChange={(event, date) => date && setEndTime(date)}
                      style={styles.datePicker}
                      textColor={themeColors.text}
                    />
                  ) : (
                    <View style={styles.androidPickerButtons}>
                      <TouchableOpacity style={[styles.androidPickerButton, { backgroundColor: themeColors.modalInputBg }]}>
                        <Text style={{ color: themeColors.text }}>{endTime.toLocaleString()}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <Text style={[styles.label, { color: themeColors.text }]}>Pause Duration (minutes)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={pauseDuration}
                onChangeText={setPauseDuration}
                placeholder="0"
                placeholderTextColor={themeColors.placeholder}
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={[styles.modalFooter, { backgroundColor: themeColors.modalFooterBg, borderTopColor: themeColors.border }]}>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={confirmEndSession}
              >
                <Text style={styles.confirmButtonText}>Confirm End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Buy-in Modal */}
      <Modal
        visible={showEditBuyInModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowEditBuyInModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.centeredModalOverlay, { backgroundColor: themeColors.modalOverlay }]}
        >
          <View style={[styles.centeredModalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Buy-in</Text>
              <TouchableOpacity onPress={() => setShowEditBuyInModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formContent}>
              <Text style={[styles.label, { color: themeColors.text }]}>Buy-in Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={editBuyInAmount}
                onChangeText={setEditBuyInAmount}
                placeholder="0"
                placeholderTextColor={themeColors.placeholder}
                keyboardType="numeric"
                autoFocus
              />
              <View style={{ height: 20 }} />
            </View>

            <View style={[styles.modalFooter, { backgroundColor: themeColors.modalFooterBg, borderTopColor: themeColors.border }]}>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: '#2e7d32' }]}
                onPress={handleEditBuyIn}
              >
                <Text style={styles.confirmButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stack Editor Modal */}
      <Modal
        visible={showStackEditor}
        animationType="fade"
        transparent
        onRequestClose={() => setShowStackEditor(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.centeredModalOverlay, { backgroundColor: themeColors.modalOverlay }]}
        >
          <View style={[styles.centeredModalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Edit Stack</Text>
              <TouchableOpacity onPress={() => setShowStackEditor(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formContent}>
              <Text style={[styles.label, { color: themeColors.text }]}>Stack Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.modalInputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={stackAmount}
                onChangeText={setStackAmount}
                placeholder="0"
                placeholderTextColor={themeColors.placeholder}
                keyboardType="numeric"
                autoFocus
              />
              <View style={{ height: 20 }} />
            </View>

            <View style={[styles.modalFooter, { backgroundColor: themeColors.modalFooterBg, borderTopColor: themeColors.border }]}>
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleSaveStack}
              >
                <Text style={styles.confirmButtonText}>Save Stack</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={[styles.centeredModalOverlay, { backgroundColor: themeColors.modalOverlay }]}>
          <View style={[styles.centeredModalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Color</Text>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.formContent, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, paddingVertical: 20 }]}>
              {PLAYER_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.hex}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: color.hex,
                    borderWidth: 2,
                    borderColor: themeColors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={() => handleColorSelect(color.hex)}
                >
                  {color.name === 'Gray' && (
                    <Ionicons name="close" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      <ConfirmDialog
        visible={showNewTableConfirm}
        title="New Table"
        message="Are you sure you want to reset the table? This will clear all players and stacks."
        confirmText="Reset Table"
        confirmDestructive
        onConfirm={confirmNewTable}
        onCancel={() => setShowNewTableConfirm(false)}
      />
    </View>
  );
}
