import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mock data for saved hands
const MOCK_SAVED_HANDS = [
  {
    id: '1',
    date: '2023-10-27 14:30',
    pot: 150,
    winner: 'Hero',
    blinds: '1/2',
    cards: ['As', 'Kd'],
  },
  {
    id: '2',
    date: '2023-10-26 20:15',
    pot: 420,
    winner: 'Villain 1',
    blinds: '2/5',
    cards: ['Jh', 'Jd'],
  },
  {
    id: '3',
    date: '2023-10-25 18:45',
    pot: 85,
    winner: 'Hero',
    blinds: '1/2',
    cards: ['7c', '8c'],
  },
];

export default function SavedHandsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  
  // We can reuse some theme logic or define local styles
  const themeColors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2d2d2d' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    subText: isDark ? '#a0a0a0' : '#666666',
    border: isDark ? '#404040' : '#e0e0e0',
    tint: '#2196f3',
  };

  const renderHandItem = ({ item }: { item: typeof MOCK_SAVED_HANDS[0] }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
      onPress={() => {
        // Navigate to hand details (to be implemented)
        // router.push(`/saved-hands/${item.id}`);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.dateText, { color: themeColors.subText }]}>{item.date}</Text>
        <Text style={[styles.blindsText, { color: themeColors.subText }]}>{item.blinds}</Text>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: themeColors.subText }]}>Pot:</Text>
          <Text style={[styles.value, { color: themeColors.text }]}>${item.pot}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: themeColors.subText }]}>Winner:</Text>
          <Text style={[styles.value, { color: themeColors.text }]}>{item.winner}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: themeColors.subText }]}>Hand:</Text>
          <Text style={[styles.value, { color: themeColors.text }]}>{item.cards.join(' ')}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Ionicons name="chevron-forward" size={20} color={themeColors.subText} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>Saved Hands</ThemedText>
        <View style={{ width: 24 }} /> {/* Spacer for alignment */}
      </View>

      <FlatList
        data={MOCK_SAVED_HANDS}
        renderItem={renderHandItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: themeColors.subText }}>No saved hands found.</Text>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeader: {
    position: 'absolute',
    top: 12,
    right: 16,
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
  },
  blindsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    width: 60,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardFooter: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
});
