import { PositionSelector, RangeGrid, RangeStats } from '@/components/poker';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Action, Position, Range } from '@/types/poker';
import { createEmptyRange } from '@/utils/handRanking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ============================================
// RANGE EDITOR SCREEN
// ============================================

export default function RangeEditorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // State
  const [position, setPosition] = useState<Position>('early');
  const [action, setAction] = useState<Action>('open-raise');
  const [range, setRange] = useState<Range>(createEmptyRange());
  const [playerName, setPlayerName] = useState('New Player');

  // Theme colors
  const themeColors = {
    background: isDark ? '#000' : '#FFFFFF',
    text: isDark ? '#fff' : '#333',
    subText: isDark ? '#aaa' : '#666',
    border: isDark ? '#333' : '#E0E0E0',
    card: isDark ? '#1c1c1e' : '#F5F5F5',
    instructionBg: isDark ? '#1c1c1e' : '#F5F5F5',
    primary: '#0a7ea4',
  };
  
  // Handlers
  const handleSelectionChange = (newPosition: Position, newAction: Action) => {
    setPosition(newPosition);
    setAction(newAction);
    // In real app, would load saved range for this position/action combo
  };
  
  const handleRangeChange = (newRange: Range) => {
    setRange(newRange);
  };
  
  const handleClearRange = () => {
    Alert.alert(
      'Clear Range',
      'Are you sure you want to clear all selections?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => setRange(createEmptyRange()),
        },
      ]
    );
  };
  
  const handleSaveRange = () => {
    // TODO: Implement save functionality
    Alert.alert('Saved!', 'Range saved successfully.');
  };
  
  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={[styles.backText, { color: themeColors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeColors.text }]}>Range Editor</Text>
        <TouchableOpacity onPress={handleSaveRange} style={styles.saveButton}>
          <Text style={[styles.saveText, { color: themeColors.primary }]}>Save</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Player Name */}
        <View style={styles.playerHeader}>
          <Text style={[styles.playerName, { color: themeColors.text }]}>{playerName}</Text>
        </View>
        
        {/* Position & Action Selector */}
        <PositionSelector
          selectedPosition={position}
          selectedAction={action}
          onSelectionChange={handleSelectionChange}
        />
        
        {/* Range Statistics */}
        <RangeStats range={range} showDetails={true} />
        
        {/* Range Grid */}
        <View style={styles.gridContainer}>
          <RangeGrid
            range={range}
            onRangeChange={handleRangeChange}
          />
        </View>
        
        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearRange}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
        
        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: themeColors.instructionBg }]}>
          <Text style={[styles.instructionTitle, { color: themeColors.text }]}>How to use:</Text>
          <Text style={[styles.instructionText, { color: themeColors.subText }]}>
            • Tap a hand to select/deselect it
          </Text>
          <Text style={[styles.instructionText, { color: themeColors.subText }]}>
            • Better hands are auto-selected (green)
          </Text>
          <Text style={[styles.instructionText, { color: themeColors.subText }]}>
            • Manually selected hands are dark green
          </Text>
          <Text style={[styles.instructionText, { color: themeColors.subText }]}>
            • Excluded hands are orange
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#0a7ea4',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  playerHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  gridContainer: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FF5722',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    gap: 4,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
  },
});
