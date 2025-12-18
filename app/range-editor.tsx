import { PositionSelector, RangeGrid, RangeStats } from '@/components/poker';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Action, Position, Range } from '@/types/poker';
import { createEmptyRange } from '@/utils/handRanking';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getThemeColors, styles } from '@/styles/range-editor.styles';

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
  const themeColors = getThemeColors(isDark);
  
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
