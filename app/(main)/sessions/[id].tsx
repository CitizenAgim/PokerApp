import { useCurrentSession, usePlayers, useSession, useSettings } from '@/hooks';
import { Seat } from '@/types/poker';
import { getPositionName } from '@/utils/positionCalculator';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Vertical Table Layout
const TABLE_WIDTH = 220;
const TABLE_HEIGHT = 380;
const RX = TABLE_WIDTH / 2;
const RY = TABLE_HEIGHT / 2;
const SEAT_OFFSET = 35;
const SEAT_SIZE = 60;

// Calculate seat position (index 0-8)
// We want Seat 1 to be at the bottom center (90 degrees)
// But let's follow the standard poker table numbering if possible, or just distribute evenly.
// Let's align with PokerTable.tsx which starts at 210 degrees for index 0.
// But here we want Seat 1 to be Bottom Center to match previous logic? 
// Previous logic: Seat 1 (bottom center).
// Let's keep Seat 1 at Bottom Center (90 degrees).
// 9 seats, 40 degrees apart.
// Seat 1: 90
// Seat 2: 130
// Seat 3: 170
// Seat 4: 210
// Seat 5: 250 (Top)
// Seat 6: 290
// Seat 7: 330
// Seat 8: 370 (10)
// Seat 9: 50
const getSeatPosition = (seatNumber: number) => {
  // seatNumber is 1-9
  // We want Seat 1 at 90 degrees (Bottom)
  // Increasing seat number goes clockwise (increasing angle in standard math? No, usually clockwise is decreasing in math, but let's see).
  // Screen coords: y is down.
  // 0 deg = Right. 90 deg = Bottom. 180 deg = Left. 270 deg = Top.
  
  // Let's place Seat 1 at Bottom (90).
  // Seat 2 at Bottom Left (130).
  // Seat 3 at Left (170).
  // ...
  const angleDeg = 90 + (seatNumber - 1) * 40;
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
  const positionName = getPositionName(seat.seatNumber, buttonPosition);

  const showPhoto = player?.photoUrl && !ninjaMode;
  const { x, y } = getSeatPosition(seat.seatNumber);

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
          <Text style={styles.seatNumber}>Seat {seat.seatNumber}</Text>
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

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, table, loading, updateButtonPosition, assignPlayerToSeat, endSession, getPositionForSeat } = useSession(id);
  const { clearSession } = useCurrentSession();
  const { players } = usePlayers();
  
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [heroSeat, setHeroSeat] = useState<number | undefined>(undefined);

  // Players not already at the table
  const availablePlayers = useMemo(() => {
    if (!table) return players;
    const seatedPlayerIds = new Set(
      table.seats
        .filter(s => s.playerId)
        .map(s => s.playerId)
    );
    return players.filter(p => !seatedPlayerIds.has(p.id));
  }, [players, table]);

  const handleSeatPress = (seatNumber: number) => {
    if (!table) return;
    
    const seat = table.seats.find(s => s.seatNumber === seatNumber);
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
      setShowPlayerPicker(true);
    }
  };

  const handleAssignPlayer = async (playerId: string) => {
    if (selectedSeat === null) return;
    
    await assignPlayerToSeat(selectedSeat, playerId);
    setShowPlayerPicker(false);
    setSelectedSeat(null);
  };

  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            await endSession();
            await clearSession();
            router.back();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (!session || !table) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  const occupiedSeats = table.seats.filter(s => s.playerId).length;

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
          
          {/* Seats */}
          {table.seats.map((seat) => (
            <SeatView
              key={seat.seatNumber}
              seat={seat}
              isButton={seat.seatNumber === table.buttonPosition}
              isHero={seat.seatNumber === heroSeat}
              onPress={() => handleSeatPress(seat.seatNumber)}
              buttonPosition={table.buttonPosition}
            />
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(main)/players/new')}>
          <Ionicons name="person-add" size={20} color="#0a7ea4" />
          <Text style={styles.actionText}>Add Player</Text>
        </TouchableOpacity>
        
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Assign Player to Seat {selectedSeat}
              </Text>
              <TouchableOpacity onPress={() => setShowPlayerPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.playerList}>
              {availablePlayers.length === 0 ? (
                <View style={styles.emptyPlayers}>
                  <Text style={styles.emptyPlayersText}>
                    No available players
                  </Text>
                  <TouchableOpacity
                    style={styles.addPlayerButton}
                    onPress={() => {
                      setShowPlayerPicker(false);
                      router.push('/(main)/players/new');
                    }}
                  >
                    <Text style={styles.addPlayerButtonText}>
                      Add New Player
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                availablePlayers.map(player => (
                  <TouchableOpacity
                    key={player.id}
                    style={styles.playerOption}
                    onPress={() => handleAssignPlayer(player.id)}
                  >
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerInitial}>
                        {player.name.charAt(0).toUpperCase()}
                      </Text>
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
        </View>
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
  playerList: {
    padding: 16,
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
});
