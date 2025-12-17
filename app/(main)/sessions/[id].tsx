import { useCurrentSession, usePlayers, useSession, useSettings } from '@/hooks';
import { Seat } from '@/types/poker';
import { resizeImage } from '@/utils/image';
import { getPositionName } from '@/utils/positionCalculator';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Vertical Table Layout
const TABLE_WIDTH = 200;
const TABLE_HEIGHT = 340;
const RX = TABLE_WIDTH / 2;
const RY = TABLE_HEIGHT / 2;
const SEAT_OFFSET = 30;
const SEAT_SIZE = 60;

// Dealer Position (Between Seat 9 and Seat 1)
const DEALER_ANGLE = 180;
const DEALER_RAD = (DEALER_ANGLE * Math.PI) / 180;
const DEALER_X = (RX + SEAT_OFFSET) * Math.cos(DEALER_RAD);
const DEALER_Y = (RY + SEAT_OFFSET) * Math.sin(DEALER_RAD);

// Calculate seat position (index 0-8)
// Distribute 9 seats + dealer evenly (10 slots of 36 degrees)
// Dealer is at 180 degrees (Left)
// Seat 1 starts at 216 degrees
const getSeatPosition = (seatNumber: number) => {
  const safeSeatNum = (typeof seatNumber === 'number' && !isNaN(seatNumber)) ? seatNumber : 1;
  const angleDeg = 180 + safeSeatNum * 36;
  const angleRad = (angleDeg * Math.PI) / 180;
  
  const x = (RX + SEAT_OFFSET) * Math.cos(angleRad);
  const y = (RY + SEAT_OFFSET) * Math.sin(angleRad);
  
  return { x, y };
};

interface SeatViewProps {
  seat: Seat;
  isButton: boolean;
  isHero: boolean;
  onPress: () => void;
}

interface SeatViewComponentProps extends SeatViewProps {
  buttonPosition: number;
}

function SeatView({ seat, isButton, isHero, onPress, buttonPosition }: SeatViewComponentProps) {
  const { players } = usePlayers();
  const { ninjaMode } = useSettings();
  const player = players.find(p => p.id === seat.playerId);
  const seatNum = seat.seatNumber ?? (typeof seat.index === 'number' ? seat.index + 1 : 1);
  const positionName = getPositionName(seatNum, buttonPosition);

  const showPhoto = player?.photoUrl && !ninjaMode;
  const { x, y } = getSeatPosition(seatNum);

  return (
    <TouchableOpacity
      style={[
        styles.seat,
        {
          transform: [
            { translateX: x },
            { translateY: y },
          ],
        },
        player && styles.seatOccupied,
        isHero && styles.seatHero,
      ]}
      onPress={onPress}
    >
      {player ? (
        <>
          {showPhoto && (
            <>
              <Image 
                source={{ uri: player.photoUrl }} 
                style={[StyleSheet.absoluteFill, { borderRadius: SEAT_SIZE / 2 }]} 
              />
              <View style={styles.seatOverlay} />
            </>
          )}
          <Text style={[styles.seatPlayerName, showPhoto && styles.seatTextLight]} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.seatPosition, showPhoto && styles.seatTextLight]}>
            {positionName}
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="add" size={20} color="#999" />
          <Text style={styles.seatNumber}>Seat {seatNum}</Text>
        </>
      )}
      
      {/* Button indicator */}
      {isButton && (
        <View style={styles.buttonIndicator}>
          <Text style={styles.buttonText}>D</Text>
        </View>
      )}
      
      {/* Hero indicator */}
      {isHero && (
        <View style={styles.heroIndicator}>
          <Text style={styles.heroText}>★</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Force refresh
export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, table, loading, updateButtonPosition, assignPlayerToSeat, endSession, getPositionForSeat, updateSessionDetails } = useSession(id);
  const { clearSession } = useCurrentSession();
  const { players, createPlayer } = usePlayers();
  
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [showCreatePlayerModal, setShowCreatePlayerModal] = useState(false);
  const [heroSeat, setHeroSeat] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Player State
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerNotes, setNewPlayerNotes] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState<string | undefined>(undefined);
  const [isCreatingPlayer, setIsCreatingPlayer] = useState(false);

  // Rebuy State
  const [showRebuyModal, setShowRebuyModal] = useState(false);
  const [rebuyAmount, setRebuyAmount] = useState('');

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
    
    if (seat.playerId) {
      // Show options for occupied seat
      Alert.alert(
        `Seat ${seatNumber}`,
        undefined,
        [
          {
            text: 'View Range',
            onPress: () => router.push(`/(main)/players/${seat.playerId}/range`),
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

  const handleAssignPlayer = async (playerId: string) => {
    if (selectedSeat === null) return;
    
    await assignPlayerToSeat(selectedSeat, playerId);
    setShowPlayerPicker(false);
    setSelectedSeat(null);
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

  const handleRebuy = async () => {
    if (!rebuyAmount) return;
    const amount = parseFloat(rebuyAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const currentBuyIn = session?.buyIn || 0;
      await updateSessionDetails({
        buyIn: currentBuyIn + amount
      });
      setShowRebuyModal(false);
      setRebuyAmount('');
    } catch (error) {
      Alert.alert('Error', 'Failed to add rebuy');
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Session not found</Text>
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
      <View style={styles.container}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Session Result</Text>
          <Text style={styles.summaryDate}>
            {new Date(session.startTime).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <TouchableOpacity onPress={handleEditSession} style={styles.editButton}>
            <Ionicons name="pencil" size={16} color="#0a7ea4" />
            <Text style={styles.editButtonText}>Edit Session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Total Profit/Loss</Text>
            <Text style={[styles.resultAmount, isProfit ? styles.profitText : styles.lossText]}>
              {isProfit ? '+' : ''}{profit}
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Buy In</Text>
              <Text style={styles.statValue}>{buyIn}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Cash Out</Text>
              <Text style={styles.statValue}>{cashOut}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{durationStr}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Stakes</Text>
              <Text style={styles.statValue}>{session.stakes || '-'}</Text>
            </View>
          </View>

          {session.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.locationText}>{session.location}</Text>
            </View>
          )}
        </View>

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
            style={styles.centeredModalOverlay}
          >
            <View style={styles.centeredModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Session</Text>
                <TouchableOpacity onPress={() => setShowEditSessionModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.formContent}>
                <Text style={styles.label}>Buy In</Text>
                <TextInput
                  style={styles.input}
                  value={editBuyIn}
                  onChangeText={setEditBuyIn}
                  placeholder="0"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Cash Out</Text>
                <TextInput
                  style={styles.input}
                  value={editCashOut}
                  onChangeText={setEditCashOut}
                  placeholder="0"
                  keyboardType="numeric"
                />
                
                <Text style={styles.label}>Start Time</Text>
                <View style={styles.datePickerContainer}>
                  {Platform.OS === 'ios' ? (
                    <RNDateTimePicker
                      value={editStartTime}
                      mode="datetime"
                      display="spinner"
                      onChange={(event, date) => date && setEditStartTime(date)}
                      style={styles.datePicker}
                      textColor="#000000"
                    />
                  ) : (
                    <View style={styles.androidPickerButtons}>
                      <TouchableOpacity style={styles.androidPickerButton}>
                        <Text>{editStartTime.toLocaleString()}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Text style={styles.label}>End Time</Text>
                <View style={styles.datePickerContainer}>
                  {Platform.OS === 'ios' ? (
                    <RNDateTimePicker
                      value={editEndTime}
                      mode="datetime"
                      display="spinner"
                      onChange={(event, date) => date && setEditEndTime(date)}
                      style={styles.datePicker}
                      textColor="#000000"
                    />
                  ) : (
                    <View style={styles.androidPickerButtons}>
                      <TouchableOpacity style={styles.androidPickerButton}>
                        <Text>{editEndTime.toLocaleString()}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>

              <View style={styles.modalFooter}>
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
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Table data not found</Text>
      </View>
    );
  }

  const occupiedSeats = table.seats ? table.seats.filter(s => s.playerId).length : 0;

  return (
    <View style={styles.container}>
      {/* Session Info Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.sessionName}>{session.name}</Text>
          <View style={styles.headerMeta}>
            {session.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location" size={14} color="#666" />
                <Text style={styles.metaText}>{session.location}</Text>
              </View>
            )}
            {session.stakes && (
              <View style={styles.metaItem}>
                <Ionicons name="cash" size={14} color="#666" />
                <Text style={styles.metaText}>{session.stakes}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="wallet" size={14} color="#666" />
              <Text style={styles.metaText}>Buy-in: {session.buyIn || 0}</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.statsNumber}>{occupiedSeats}/9</Text>
          <Text style={styles.statsLabel}>Players</Text>
        </View>
      </View>

      {/* Table View */}
      <View style={styles.tableContainer}>
        <View style={styles.table}>
          {/* Table felt */}
          <View style={styles.tableFelt}>
            <Text style={styles.tableText}>
              Tap seat to assign player
            </Text>
          </View>
          
          {/* Dealer */}
          <View style={[styles.dealer, {
            transform: [
              { translateX: DEALER_X },
              { translateY: DEALER_Y },
            ]
          }]}>
            <MaterialCommunityIcons name="account-tie" size={32} color="#333" />
            <Text style={styles.dealerText}>Dealer</Text>
          </View>
          
          {/* Seats */}
          {table.seats && table.seats.map((seat, i) => {
            const seatNum = seat.seatNumber ?? (typeof seat.index === 'number' ? seat.index + 1 : i + 1);
            return (
              <SeatView
                key={seatNum}
                seat={seat}
                isButton={seatNum === table.buttonPosition}
                isHero={seatNum === heroSeat}
                onPress={() => handleSeatPress(seatNum)}
                buttonPosition={table.buttonPosition}
              />
            );
          })}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            const nextButton = (table.buttonPosition % 9) + 1;
            updateButtonPosition(nextButton);
          }}
        >
          <Ionicons name="arrow-forward-circle" size={20} color="#0a7ea4" />
          <Text style={styles.actionText}>Move Button</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#e8f5e9' }]}
          onPress={() => setShowRebuyModal(true)}
        >
          <Ionicons name="add-circle" size={20} color="#2e7d32" />
          <Text style={[styles.actionText, { color: '#2e7d32' }]}>Rebuy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.actionButtonDanger]}
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
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign Player to Seat {selectedSeat}
              </Text>
              <TouchableOpacity onPress={() => setShowPlayerPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search players..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.createPlayerRow}
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

            <ScrollView style={styles.playerList} keyboardShouldPersistTaps="handled">
              {availablePlayers.length === 0 ? (
                <View style={styles.emptyPlayers}>
                  <Text style={styles.emptyPlayersText}>
                    No players found matching "{searchQuery}"
                  </Text>
                </View>
              ) : (
                availablePlayers.map(player => (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.playerOption}
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
                      <Text style={styles.playerName}>{player.name}</Text>
                      {player.notes && (
                        <Text style={styles.playerNotes} numberOfLines={1}>
                          {player.notes}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
          style={styles.centeredModalOverlay}
        >
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Player</Text>
              <TouchableOpacity onPress={() => setShowCreatePlayerModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
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

              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={newPlayerName}
                onChangeText={setNewPlayerName}
                placeholder="Enter player name"
                autoFocus
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newPlayerNotes}
                onChangeText={setNewPlayerNotes}
                placeholder="Add notes..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
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
          style={styles.centeredModalOverlay}
        >
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>End Session</Text>
              <TouchableOpacity onPress={() => setShowEndSessionModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.formContent}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Buy In Amount</Text>
              <TextInput
                style={styles.input}
                value={endSessionBuyIn}
                onChangeText={setEndSessionBuyIn}
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Cash Out Amount</Text>
              <TextInput
                style={styles.input}
                value={cashOutAmount}
                onChangeText={setCashOutAmount}
                placeholder="0"
                keyboardType="numeric"
                autoFocus
              />
              
              {/* Start Time Collapsible */}
              <TouchableOpacity 
                style={styles.collapsibleHeader} 
                onPress={() => setIsStartTimeExpanded(!isStartTimeExpanded)}
              >
                <Text style={styles.label}>Start Time</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.dateValue}>
                    {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name={isStartTimeExpanded ? "chevron-up" : "chevron-down"} size={20} color="#666" />
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
                      textColor="#000000"
                    />
                  ) : (
                    <View style={styles.androidPickerButtons}>
                      <TouchableOpacity style={styles.androidPickerButton}>
                        <Text>{startTime.toLocaleString()}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* End Time Collapsible */}
              <TouchableOpacity 
                style={styles.collapsibleHeader} 
                onPress={() => setIsEndTimeExpanded(!isEndTimeExpanded)}
              >
                <Text style={styles.label}>End Time</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.dateValue}>
                    {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Ionicons name={isEndTimeExpanded ? "chevron-up" : "chevron-down"} size={20} color="#666" />
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
                      textColor="#000000"
                    />
                  ) : (
                    <View style={styles.androidPickerButtons}>
                      <TouchableOpacity style={styles.androidPickerButton}>
                        <Text>{endTime.toLocaleString()}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
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

      {/* Rebuy Modal */}
      <Modal
        visible={showRebuyModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRebuyModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.centeredModalOverlay}
        >
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Rebuy</Text>
              <TouchableOpacity onPress={() => setShowRebuyModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formContent}>
              <Text style={styles.label}>Amount to Add</Text>
              <TextInput
                style={styles.input}
                value={rebuyAmount}
                onChangeText={setRebuyAmount}
                placeholder="0"
                keyboardType="numeric"
                autoFocus
              />
              <View style={{ height: 20 }} />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.confirmButton, { backgroundColor: '#2e7d32' }]}
                onPress={handleRebuy}
              >
                <Text style={styles.confirmButtonText}>Confirm Rebuy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  headerStats: {
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
  },
  tableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 450, // Ensure enough space
  },
  table: {
    width: TABLE_WIDTH,
    height: TABLE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableFelt: {
    width: '100%',
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 150, // Oval approximation
    borderWidth: 15,
    borderColor: '#3e2723', // Wood rail
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tableText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    width: '60%',
  },
  seat: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30, // -SEAT_SIZE / 2
    marginLeft: -30, // -SEAT_SIZE / 2
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  seatOccupied: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  seatHero: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  seatPlayerName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    zIndex: 1,
  },
  seatPosition: {
    fontSize: 9,
    color: '#666',
    zIndex: 1,
  },
  seatTextLight: {
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  seatOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: SEAT_SIZE / 2,
  },
  seatNumber: {
    fontSize: 8,
    color: '#999',
  },
  buttonIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
  },
  heroIndicator: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    fontSize: 12,
    color: '#fff',
  },
  dealer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dealerText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    marginTop: -4,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    gap: 6,
  },
  actionButtonDanger: {
    backgroundColor: '#fef2f2',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  actionTextDanger: {
    color: '#e74c3c',
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
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  centeredModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '80%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  playerList: {
    padding: 16,
    paddingTop: 8,
  },
  emptyPlayers: {
    alignItems: 'center',
    padding: 32,
  },
  emptyPlayersText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  addPlayerButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
  },
  addPlayerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 8,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  playerNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  formContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    // marginTop: 24, // Removed margin top as it's now in footer
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  datePicker: {
    height: 120,
    width: '100%',
  },
  androidPickerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  androidPickerButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  summaryHeader: {
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  summaryDate: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  summaryCard: {
    margin: 20,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultAmount: {
    fontSize: 48,
    fontWeight: '700',
  },
  profitText: {
    color: '#27ae60',
  },
  lossText: {
    color: '#e74c3c',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  statItem: {
    width: '45%',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    padding: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  createPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  createPlayerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  createPlayerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  photoButtonText: {
    color: '#0a7ea4',
    fontWeight: '500',
    fontSize: 14,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  textArea: {
    minHeight: 80,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: 8,
  },
  dateValue: {
    fontSize: 14,
    color: '#666',
  },
});
