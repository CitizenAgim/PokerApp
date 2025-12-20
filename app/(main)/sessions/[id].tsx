import { PokerTable } from '@/components/table/PokerTable';
import { useCurrentSession, usePlayers, useSession, useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/sessions/[id].styles';
import { resizeImage } from '@/utils/image';
import { Ionicons } from '@expo/vector-icons';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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

// Force refresh
export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, table, loading, updateButtonPosition, assignPlayerToSeat, updateSeatStack, endSession, updateSessionDetails } = useSession(id);
  const { clearSession } = useCurrentSession();
  const { players, createPlayer } = usePlayers();
  const { ninjaMode } = useSettings();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme colors
  const themeColors = getThemeColors(isDark);
  
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false);
  const [heroSeat, setHeroSeat] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stack Editor State
  const [showStackEditor, setShowStackEditor] = useState(false);
  const [editingSeat, setEditingSeat] = useState<number | null>(null);
  const [stackAmount, setStackAmount] = useState('');

  // Create Player State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNotes, setNewPlayerNotes] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState<string | undefined>(undefined);
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);

  // Edit Buy-in State
  const [showEditBuyInModal, setShowEditBuyInModal] = useState(false);
  const [editBuyInAmount, setEditBuyInAmount] = useState('');

  // End Session State
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [endSessionBuyIn, setEndSessionBuyIn] = useState('');
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

  // Result View State
  const [activeTab, setActiveTab] = useState<'overview' | 'graph'>('overview');

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
    
    return filtered;
  }, [players, table, searchQuery]);

  const handleSeatPress = (seatNumber: number) => {
    if (!table) return;
    
    const seat = table.seats.find((s, i) => {
      const sNum = s.seatNumber ?? (typeof s.index === 'number' ? s.index + 1 : i + 1);
      return sNum === seatNumber;
    });
    if (!seat) return;
    
    if (seat.playerId || seat.player) {
      // Show options for occupied seat
      Alert.alert(
        `Seat ${seatNumber} - ${seat.player?.name || 'Player'}`,
        `Stack: ${seat.player?.stack || 0}`,
        [
          {
            text: 'Edit Stack',
            onPress: () => {
              setEditingSeat(seatNumber);
              setStackAmount(seat.player?.stack?.toString() || '');
              setShowStackEditor(true);
            }
          },
          {
            text: 'View Range',
            onPress: () => seat.playerId ? router.push(`/(main)/players/${seat.playerId}/range`) : Alert.alert('Info', 'Cannot view range for unknown player'),
          },
          {
            text: 'Set as Button',
            onPress: () => updateButtonPosition(seatNumber),
          },
          {
            text: heroSeat === seatNumber ? 'Remove as Hero' : 'Set as Hero',
            onPress: () => setHeroSeat(heroSeat === seatNumber ? undefined : seatNumber),
          },
          {
            text: 'Remove Player',
            style: 'destructive',
            onPress: () => assignPlayerToSeat(seatNumber, null),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // Assign player to empty seat
      setSelectedSeat(seatNumber);
      setSearchQuery('');
      setShowPlayerPicker(true);
    }
  };

  const handleAssignUnknownPlayer = async () => {
    if (selectedSeat === null) return;
    
    // Prompt for stack size first
    Alert.prompt(
      'Unknown Player',
      'Enter initial stack size:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Add Player',
          onPress: async (stack?: string) => {
            const initialStack = stack ? parseFloat(stack) : 0;
            if (isNaN(initialStack)) {
              Alert.alert('Error', 'Invalid stack size');
              return;
            }
            
            await assignPlayerToSeat(selectedSeat, null, initialStack, {
              name: 'Unknown',
              isTemp: true,
            });
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

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const resizedUri = await resizeImage(result.assets[0].uri);
      setNewPlayerPhoto(resizedUri);
    }
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
        photoUrl: newPlayerPhoto,
      });
      
      setShowCreatePlayerModal(false);
      setNewPlayerName('');
      setNewPlayerNotes('');
      setNewPlayerPhoto(undefined);
      
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

  const handleEndSession = () => {
    if (session) {
      setStartTime(new Date(session.startTime));
      setEndSessionBuyIn(session.buyIn?.toString() || '');
    }
    setEndTime(new Date());
    setCashOutAmount('');
    setIsStartTimeExpanded(false);
    setIsEndTimeExpanded(false);
    setShowEndSessionModal(true);
  };

  const confirmEndSession = async () => {
    try {
      const cashOut = cashOutAmount ? parseFloat(cashOutAmount) : 0;
      const buyIn = endSessionBuyIn ? parseFloat(endSessionBuyIn) : (session?.buyIn || 0);
      
      if (endTime < startTime) {
        Alert.alert('Error', 'End time cannot be earlier than start time');
        return;
      }

      await endSession(cashOut, endTime.getTime(), startTime.getTime(), buyIn);
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
            {new Date(session.startTime).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
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
            style={[styles.tabButton, activeTab === 'graph' && [styles.activeTabButton, { backgroundColor: themeColors.tabActiveBg }]]} 
            onPress={() => setActiveTab('graph')}
          >
            <Text style={[styles.tabText, { color: themeColors.subText }, activeTab === 'graph' && styles.activeTabText]}>Graph</Text>
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
          <View style={[styles.graphContainer, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.placeholderText, { color: themeColors.subText }]}>Graph View Coming Soon</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Back to Sessions</Text>
        </TouchableOpacity>

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

  const occupiedSeats = table.seats ? table.seats.filter(s => s.playerId).length : 0;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
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
        <View style={styles.headerStats}>
          <Text style={styles.statsNumber}>{occupiedSeats}/9</Text>
          <Text style={[styles.statsLabel, { color: themeColors.subText }]}>Players</Text>
        </View>
      </View>

      {/* Table View */}
      <PokerTable
        seats={table.seats}
        players={players}
        buttonPosition={table.buttonPosition}
        heroSeat={heroSeat}
        onSeatPress={handleSeatPress}
        themeColors={themeColors}
        isNinjaMode={ninjaMode}
        currency={session.currency}
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
          style={[styles.actionButton, { backgroundColor: isDark ? '#1b3a24' : '#e8f5e9' }]}
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
                      {player.photoUrl ? (
                        <Image source={{ uri: player.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                      ) : (
                        <Text style={styles.playerInitial}>
                          {player.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
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
                <TouchableOpacity onPress={handlePickImage}>
                  {newPlayerPhoto ? (
                    <Image source={{ uri: newPlayerPhoto }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {newPlayerName ? newPlayerName.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
                  <Ionicons name="camera" size={20} color="#0a7ea4" />
                  <Text style={styles.photoButtonText}>{newPlayerPhoto ? 'Change Photo' : 'Add Photo'}</Text>
                </TouchableOpacity>
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
    </View>
  );
}
