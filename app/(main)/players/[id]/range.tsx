import { PositionSelector, RangeGrid, RangeStats } from '@/components/poker';
import { usePlayer, useRange } from '@/hooks';
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
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlayerRangeScreen() {
  const { id, position: initPosition, action: initAction } = useLocalSearchParams<{
    id: string;
    position?: string;
    action?: string;
  }>();
  const router = useRouter();
  const { player, loading: playerLoading } = usePlayer(id);
  
  const position = (initPosition as Position) || 'early';
  const action = (initAction as Action) || 'open-raise';
  
  const {
    range,
    loading,
    saving,
    setRange,
    save,
    clear,
  } = useRange(id, position, action);

  const handlePositionChange = (newPosition: Position, newAction: Action) => {
    // Navigate to new position/action (saves current first)
    save().then(() => {
      router.setParams({ position: newPosition, action: newAction });
    });
  };

  const handleSave = async () => {
    try {
      await save();
      Alert.alert('Saved!', 'Range saved successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save range');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Range',
      'Are you sure you want to clear this range?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clear,
        },
      ]
    );
  };

  if (loading || playerLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Player Info */}
        <View style={styles.playerHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {player?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.playerName}>{player?.name || 'Unknown'}</Text>
        </View>

        {/* Position & Action Selector */}
        <PositionSelector
          selectedPosition={position}
          selectedAction={action}
          onSelectionChange={handlePositionChange}
        />

        {/* Range Statistics */}
        <RangeStats range={range} showDetails={true} />

        {/* Range Grid */}
        <View style={styles.gridContainer}>
          <RangeGrid
            range={range}
            onRangeChange={setRange}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
          >
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save Range</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to use:</Text>
          <Text style={styles.instructionText}>
            • Tap a hand to select/deselect it
          </Text>
          <Text style={styles.instructionText}>
            • Better hands are auto-selected (lighter color)
          </Text>
          <Text style={styles.instructionText}>
            • Switch positions/actions using the tabs above
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  gridContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e74c3c',
    gap: 8,
  },
  clearButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#0a7ea4',
    borderRadius: 10,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    gap: 4,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    color: '#1976d2',
  },
});
