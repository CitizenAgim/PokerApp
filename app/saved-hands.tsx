import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCurrentUser, useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUserHands, HandRecord } from '@/services/firebase/hands';
import { formatDate } from '@/utils/text';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SavedHandsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useCurrentUser();
  const { dateFormat } = useSettings();
  
  const [hands, setHands] = useState<HandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (authLoading) return;

    const fetchHands = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        if (!user.id) {
          console.error('User ID is missing');
          return;
        }
        const userHands = await getUserHands(user.id);
        setHands(userHands);
      } catch (error) {
        console.error('Failed to fetch hands:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHands();
  }, [user, authLoading]);
  
  // We can reuse some theme logic or define local styles
  const themeColors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2d2d2d' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    subText: isDark ? '#a0a0a0' : '#666666',
    border: isDark ? '#404040' : '#e0e0e0',
    tint: '#2196f3',
  };

  const getWinnerName = (hand: HandRecord) => {
    if (!hand.winners || hand.winners.length === 0) return 'Unknown';
    if (hand.winners.length > 1) return 'Split Pot';
    
    const winnerSeatNum = hand.winners[0];
    
    // Try to find seat by seatNumber, or by index
    const seat = hand.seats.find(s => 
      (s.seatNumber === winnerSeatNum) || 
      (s.index !== undefined && s.index + 1 === winnerSeatNum)
    );
    
    if (seat?.player?.name) return seat.player.name;
    
    // Fallback if name is missing but we have ID
    if (seat?.playerId) return `Player ${seat.playerId.slice(0, 4)}...`;
    
    return `Seat ${winnerSeatNum}`;
  };

  const getHeroCards = (hand: HandRecord) => {
    if (!hand.handCards) return 'Unknown';
    
    // Find seat with current user's ID
    const heroSeat = hand.seats.find(s => s.playerId === user?.id);
    
    if (heroSeat) {
      const seatNum = heroSeat.seatNumber ?? (heroSeat.index !== undefined ? heroSeat.index + 1 : undefined);
      if (seatNum !== undefined) {
        const cards = hand.handCards[seatNum];
        if (cards && cards.length > 0) return cards.join(' ');
      }
    }
    
    return 'Unknown';
  };

  const renderHandItem = ({ item }: { item: HandRecord }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
      onPress={() => {
        // Navigate to hand details (to be implemented)
        // router.push(`/saved-hands/${item.id}`);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.dateText, { color: themeColors.subText }]}>
          {formatDate(item.timestamp, dateFormat)}
        </Text>
        {/* Blinds are not directly in HandRecord, would need session info or store it in hand */}
        {/* <Text style={[styles.blindsText, { color: themeColors.subText }]}>{item.blinds}</Text> */}
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: themeColors.subText }]}>Pot:</Text>
          <Text style={[styles.value, { color: themeColors.text }]}>${item.pot}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: themeColors.subText }]}>Winner:</Text>
          <Text style={[styles.value, { color: themeColors.text }]}>{getWinnerName(item)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: themeColors.subText }]}>Hand:</Text>
          <Text style={[styles.value, { color: themeColors.text }]}>{getHeroCards(item)}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Ionicons name="chevron-forward" size={20} color={themeColors.subText} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>Saved Hands</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.tint} />
        </View>
      ) : (
        <FlatList
          data={hands}
          renderItem={renderHandItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ color: themeColors.subText }}>No saved hands found.</Text>
            </View>
          }
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
