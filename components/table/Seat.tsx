import { TablePlayer } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SeatProps {
  player?: TablePlayer | null;
  onPress: () => void;
  isActive?: boolean;
  style?: any;
}

export function Seat({ player, onPress, isActive, style }: SeatProps) {
  if (!player) {
    return (
      <TouchableOpacity 
        style={[styles.seatContainer, styles.emptySeat, style]} 
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={24} color="#rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.seatContainer, styles.occupiedSeat, isActive && styles.activeSeat, style]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      {player.photoUrl ? (
        <Image source={{ uri: player.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {player.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.nameTag}>
        <Text style={styles.nameText} numberOfLines={1}>
          {player.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  seatContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  emptySeat: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  occupiedSeat: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  activeSeat: {
    borderColor: '#f1c40f',
    borderWidth: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  nameTag: {
    position: 'absolute',
    bottom: -16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    maxWidth: 80,
  },
  nameText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
