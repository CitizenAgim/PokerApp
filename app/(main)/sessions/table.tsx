import { PokerTable } from '@/components/table/PokerTable';
import { usePlayers } from '@/hooks/usePlayer';
import { Player, Seat, TablePlayer } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CurrentTableScreen() {
  const router = useRouter();
  const { players, createPlayer } = usePlayers();
  
  // Local state for now (will move to global/context later)
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIndex, setSelectedSeatIndex] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Player selection form
  const [searchQuery, setSearchQuery] = useState('');

  const handleSeatPress = (index: number) => {
    setSelectedSeatIndex(index);
    const seat = seats.find(s => s.index === index);
    
    if (seat?.player) {
      // Show options to remove/edit
      Alert.alert(
        seat.player.name,
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Player Details',
            onPress: () => {
              if (!seat.player?.isTemp) {
                router.push(`/(main)/players/${seat.player?.id}`);
              } else {
                Alert.alert('Info', 'Temporary players do not have a details page.');
              }
            }
          },
          { 
            text: 'Remove Player', 
            style: 'destructive',
            onPress: () => removePlayer(index)
          }
        ]
      );
    } else {
      // Show add player modal
      setSearchQuery('');
      setShowModal(true);
    }
  };

  const addPlayerToSeat = (player: TablePlayer) => {
    if (selectedSeatIndex === null) return;

    setSeats(prev => {
      const newSeats = [...prev];
      const existingIndex = newSeats.findIndex(s => s.index === selectedSeatIndex);
      
      if (existingIndex >= 0) {
        newSeats[existingIndex] = { index: selectedSeatIndex, player };
      } else {
        newSeats.push({ index: selectedSeatIndex, player });
      }
      
      return newSeats;
    });

    setShowModal(false);
  };

  const handleAddTempPlayer = () => {
    if (!searchQuery.trim()) return;
    
    const newPlayer: TablePlayer = {
      id: `temp_${Date.now()}`,
      name: searchQuery.trim(),
      isTemp: true,
    };
    
    addPlayerToSeat(newPlayer);
  };

  const handleCreateNewPlayer = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const newPlayer = await createPlayer({ name: searchQuery.trim() });
      
      const tablePlayer: TablePlayer = {
        id: newPlayer.id,
        name: newPlayer.name,
        photoUrl: newPlayer.photoUrl,
        isTemp: false,
      };
      
      addPlayerToSeat(tablePlayer);
    } catch (error) {
      Alert.alert('Error', 'Failed to create new player');
    }
  };

  const handleSelectExistingPlayer = (player: Player) => {
    const tablePlayer: TablePlayer = {
      id: player.id,
      name: player.name,
      photoUrl: player.photoUrl,
      isTemp: false,
    };
    
    addPlayerToSeat(tablePlayer);
  };

  const removePlayer = (index: number) => {
    setSeats(prev => prev.filter(s => s.index !== index));
  };

  // Filter players based on search query
  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    // Exclude players already seated
    !seats.some(s => s.player?.id === p.id)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Current Table</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tableContainer}>
        <PokerTable 
          seats={seats} 
          onSeatPress={handleSeatPress}
        />
      </View>

      {/* Add Player Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add Player to Seat {selectedSeatIndex !== null ? selectedSeatIndex + 1 : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Player Name</Text>
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search or enter new name..."
              autoFocus
            />

            {/* Filtered List */}
            {searchQuery.length > 0 && filteredPlayers.length > 0 && (
              <View style={styles.listContainer}>
                <Text style={styles.listHeader}>Existing Players</Text>
                <FlatList
                  data={filteredPlayers}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={styles.playerItem}
                      onPress={() => handleSelectExistingPlayer(item)}
                    >
                      {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={styles.playerAvatar} />
                      ) : (
                        <View style={styles.playerAvatarPlaceholder}>
                          <Text style={styles.playerAvatarText}>
                            {item.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.playerName}>{item.name}</Text>
                      <Ionicons name="add-circle-outline" size={24} color="#0a7ea4" />
                    </TouchableOpacity>
                  )}
                  style={styles.list}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.addButton, !searchQuery.trim() && styles.disabledButton]} 
                onPress={handleAddTempPlayer}
                disabled={!searchQuery.trim()}
              >
                <Text style={styles.addText}>
                  {filteredPlayers.length > 0 && filteredPlayers.some(p => p.name.toLowerCase() === searchQuery.toLowerCase())
                    ? "Select Player" 
                    : "Add as Temporary Player"}
                </Text>
              </TouchableOpacity>
            </View>

            {searchQuery.trim().length > 0 && !filteredPlayers.some(p => p.name.toLowerCase() === searchQuery.toLowerCase()) && (
              <TouchableOpacity 
                style={styles.createButton} 
                onPress={handleCreateNewPlayer}
              >
                <Text style={styles.createText}>Create New Player</Text>
              </TouchableOpacity>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tableContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  listContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  listHeader: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  list: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  playerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playerAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
  },
  addButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  addText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  createButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0a7ea4',
    alignItems: 'center',
  },
  createText: {
    color: '#0a7ea4',
    fontWeight: '600',
    fontSize: 16,
  },
});
