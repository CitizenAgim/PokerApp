import { usePlayer, usePlayers, usePlayerRanges } from '@/hooks';
import { Action, Position } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const POSITIONS: { id: Position; label: string; color: string }[] = [
  { id: 'early', label: 'Early', color: '#e74c3c' },
  { id: 'middle', label: 'Middle', color: '#f39c12' },
  { id: 'late', label: 'Late', color: '#27ae60' },
  { id: 'blinds', label: 'Blinds', color: '#3498db' },
];

const ACTIONS: { id: Action; label: string }[] = [
  { id: 'open-raise', label: 'Open Raise' },
  { id: 'call', label: 'Call' },
  { id: '3bet', label: '3-Bet' },
  { id: 'call-3bet', label: 'Call 3-Bet' },
  { id: '4bet', label: '4-Bet' },
];

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { player, loading, error } = usePlayer(id);
  const { deletePlayer } = usePlayers();
  const { ranges } = usePlayerRanges(id);

  const handleDelete = () => {
    Alert.alert(
      'Delete Player',
      `Are you sure you want to delete ${player?.name}? This will also delete all their ranges.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePlayer(id);
            router.back();
          },
        },
      ]
    );
  };

  const handleEditRange = (position: Position, action: Action) => {
    router.push(`/(main)/players/${id}/range?position=${position}&action=${action}`);
  };

  const getRangePercentage = (position: Position, action: Action): number => {
    const key = `${position}_${action}`;
    const range = ranges?.ranges[key];
    if (!range) return 0;
    
    const selected = Object.values(range).filter(
      s => s === 'manual-selected' || s === 'auto-selected'
    ).length;
    return Math.round((selected / 169) * 100);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (error || !player) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorText}>Player not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Player Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {player.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.playerName}>{player.name}</Text>
        {player.notes && (
          <Text style={styles.playerNotes}>{player.notes}</Text>
        )}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="pencil" size={18} color="#0a7ea4" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color="#e74c3c" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ranges Overview */}
      <View style={styles.rangesSection}>
        <Text style={styles.sectionTitle}>Hand Ranges</Text>
        
        {POSITIONS.map(pos => (
          <View key={pos.id} style={styles.positionCard}>
            <View style={styles.positionHeader}>
              <View style={[styles.positionDot, { backgroundColor: pos.color }]} />
              <Text style={styles.positionLabel}>{pos.label}</Text>
            </View>
            
            <View style={styles.actionsGrid}>
              {ACTIONS.map(action => {
                const percentage = getRangePercentage(pos.id, action.id);
                const hasRange = percentage > 0;
                
                return (
                  <TouchableOpacity
                    key={action.id}
                    style={[
                      styles.actionCell,
                      hasRange && styles.actionCellActive,
                    ]}
                    onPress={() => handleEditRange(pos.id, action.id)}
                  >
                    <Text style={[
                      styles.actionLabel,
                      hasRange && styles.actionLabelActive,
                    ]}>
                      {action.label}
                    </Text>
                    <Text style={[
                      styles.actionPercentage,
                      hasRange && styles.actionPercentageActive,
                    ]}>
                      {percentage}%
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {ranges?.handsObserved || 0}
            </Text>
            <Text style={styles.statLabel}>Hands Observed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {ranges ? Object.keys(ranges.ranges).length : 0}
            </Text>
            <Text style={styles.statLabel}>Ranges Set</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 40,
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  playerNotes: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
  },
  editButtonText: {
    color: '#0a7ea4',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffebee',
    borderRadius: 20,
  },
  deleteButtonText: {
    color: '#e74c3c',
    fontWeight: '500',
  },
  rangesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  positionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  positionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  positionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  positionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  actionCellActive: {
    backgroundColor: '#e8f5e9',
  },
  actionLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionLabelActive: {
    color: '#2e7d32',
  },
  actionPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginTop: 2,
  },
  actionPercentageActive: {
    color: '#2e7d32',
  },
  statsSection: {
    padding: 20,
    paddingTop: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});
