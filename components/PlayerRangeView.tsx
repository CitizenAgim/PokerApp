import { PositionSelector, RangeGrid, RangeStats } from '@/components/poker';
import { usePlayer, useRange } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/players/[id]/range.styles';
import { Action, Position } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlayerRangeView() {
  const { id, position: initPosition, action: initAction } = useLocalSearchParams<{
    id: string;
    position?: string;
    action?: string;
  }>();
  const router = useRouter();
  const { player, loading: playerLoading } = usePlayer(id);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  // Theme colors
  const themeColors = getThemeColors(isDark);
  
  const position = (initPosition as Position) || 'early';
  const action = (initAction as Action) || 'open-raise';
  
  const {
    range,
    loading,
    saving,
    setRange,
    save,
    clear,
    undo,
    canUndo,
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
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingBottom: insets.bottom }]}>
      
      {/* Custom Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: insets.top,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: themeColors.card,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border,
      }}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ padding: 8, marginLeft: -8 }}
        >
           <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        
        <Text style={{ fontSize: 18, fontWeight: '600', color: themeColors.text }}>
           Range Editor
        </Text>

        <TouchableOpacity
              onPress={undo}
              disabled={!canUndo}
              style={{ opacity: canUndo ? 1 : 0.5, padding: 8, marginRight: -8 }}
            >
              <Ionicons name="arrow-undo-outline" size={24} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Player Info */}
        <View style={[styles.playerHeader, { backgroundColor: themeColors.card }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {player?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={[styles.playerName, { color: themeColors.text }]}>{player?.name || 'Unknown'}</Text>
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
        <View style={[styles.gridContainer, { backgroundColor: themeColors.card }]}>
          <RangeGrid
            range={range}
            onRangeChange={setRange}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: themeColors.clearButtonBg }]}
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
        <View style={[styles.instructions, { backgroundColor: themeColors.instructionsBg }]}>
          <Text style={[styles.instructionTitle, { color: themeColors.instructionTitle }]}>How to use:</Text>
          <Text style={[styles.instructionText, { color: themeColors.instructionText }]}>
            • Tap a hand to select/deselect it
          </Text>
          <Text style={[styles.instructionText, { color: themeColors.instructionText }]}>
            • Better hands are auto-selected (lighter color)
          </Text>
          <Text style={[styles.instructionText, { color: themeColors.instructionText }]}>
            • Switch positions/actions using the tabs above
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
