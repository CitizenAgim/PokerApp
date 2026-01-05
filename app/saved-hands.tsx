import { PokerCard } from '@/components/PokerCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCurrentUser, useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteHandRecords, getUserHandsPaginated, HandRecord } from '@/services/firebase/hands';
import { formatDate } from '@/utils/text';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);
  const [selectedHandIds, setSelectedHandIds] = useState<Set<string>>(new Set());
  
  const isSelectionMode = selectedHandIds.size > 0;

  const fetchHands = async (isLoadMore = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      }
      
      const result = await getUserHandsPaginated(
        user.id, 
        50, 
        isLoadMore ? lastTimestamp ?? undefined : undefined
      );
      
      if (isLoadMore) {
        setHands(prev => [...prev, ...result.hands]);
      } else {
        setHands(result.hands);
      }
      
      setHasMore(result.hasMore);
      setLastTimestamp(result.lastTimestamp);
    } catch (error) {
      console.error('Failed to fetch hands:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchHands();
  }, [user, authLoading]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchHands(true);
    }
  };
  
  const themeColors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    card: isDark ? '#2d2d2d' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    subText: isDark ? '#a0a0a0' : '#666666',
    border: isDark ? '#404040' : '#e0e0e0',
    tint: '#2196f3',
    selectedBackground: isDark ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.1)',
    selectedBorder: '#2196f3',
  };

  const getWinnerName = (hand: HandRecord) => {
    if (!hand.winners || hand.winners.length === 0) return 'Unknown';
    if (hand.winners.length > 1) return 'Split Pot';
    
    const winnerSeatNum = hand.winners[0];
    
    const seat = hand.seats.find(s => 
      (s.seatNumber === winnerSeatNum) || 
      (s.index !== undefined && s.index + 1 === winnerSeatNum)
    );
    
    if (seat?.player?.name) return seat.player.name;
    if (seat?.playerId) return 'Player ' + seat.playerId.slice(0, 4) + '...';
    
    return 'Seat ' + winnerSeatNum;
  };

  const getHeroCardsArray = (hand: HandRecord): string[] => {
    if (!hand.handCards) return [];
    
    // Use heroSeat directly if available (new format)
    if (hand.heroSeat !== undefined) {
      return hand.handCards[hand.heroSeat] || [];
    }
    
    // Fallback for old records: try to find hero by playerId
    const heroSeat = hand.seats.find(s => s.playerId === user?.id);
    if (heroSeat) {
      const seatNum = heroSeat.seatNumber ?? (heroSeat.index !== undefined ? heroSeat.index + 1 : undefined);
      if (seatNum !== undefined) {
        return hand.handCards[seatNum] || [];
      }
    }
    
    return [];
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedHandIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedHandIds(newSelection);
  };

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      const newSelection = new Set<string>();
      newSelection.add(id);
      setSelectedHandIds(newSelection);
    }
  };

  const handlePress = (id: string) => {
    if (isSelectionMode) {
      toggleSelection(id);
    } else {
      // Navigate to hand replay
      router.push(`/hand-replay/${id}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Hands',
      'Are you sure you want to delete ' + selectedHandIds.size + ' hand' + (selectedHandIds.size > 1 ? 's' : '') + '?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const handsToDelete = hands.filter(h => selectedHandIds.has(h.id));
              await deleteHandRecords(handsToDelete);
              
              // Update local state
              setHands(prev => prev.filter(h => !selectedHandIds.has(h.id)));
              setSelectedHandIds(new Set());
            } catch (error) {
              console.error('Failed to delete hands:', error);
              Alert.alert('Error', 'Failed to delete hands. Please try again.');
            }
          },
        },
      ]
    );
  };

  const cancelSelection = () => {
    setSelectedHandIds(new Set());
  };

  const renderHandItem = ({ item }: { item: HandRecord }) => {
    const isSelected = selectedHandIds.has(item.id);
    const heroCards = getHeroCardsArray(item);
    
    return (
      <TouchableOpacity 
        style={[
          styles.card, 
          { 
            backgroundColor: isSelected ? themeColors.selectedBackground : themeColors.card, 
            borderColor: isSelected ? themeColors.selectedBorder : themeColors.border 
          }
        ]}
        onPress={() => handlePress(item.id)}
        onLongPress={() => handleLongPress(item.id)}
        delayLongPress={500}
        testID={'hand-item-' + item.id}
      >
        {isSelectionMode && (
          <View style={styles.selectionIndicator}>
            <Ionicons 
              name={isSelected ? "checkbox" : "square-outline"} 
              size={24} 
              color={themeColors.tint} 
            />
          </View>
        )}
        
        <View style={styles.cardContent}>
          {/* Session info row */}
          {(item.sessionName || item.stakes || item.location) && (
            <View style={styles.sessionInfoRow}>
              {item.sessionName && (
                <Text style={[styles.sessionNameText, { color: themeColors.tint }]} numberOfLines={1}>
                  {item.sessionName}
                </Text>
              )}
              {item.stakes && (
                <Text style={[styles.stakesText, { color: themeColors.subText }]}>
                  {item.stakes}
                </Text>
              )}
              {item.location && (
                <Text style={[styles.locationText, { color: themeColors.subText }]} numberOfLines={1}>
                  @ {item.location}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.handRow}>
            {/* Hero Cards */}
            <View style={styles.heroCardsContainer}>
              <Text style={[styles.sectionLabel, { color: themeColors.subText }]}>Hero</Text>
              <View style={styles.cardsRow}>
                {heroCards.length > 0 ? (
                  heroCards.map((card, index) => (
                    <PokerCard key={index} card={card} style={index > 0 ? { marginLeft: -5, zIndex: index } : { zIndex: index }} />
                  ))
                ) : (
                  <Text style={{ color: themeColors.subText, fontSize: 12 }}>No cards</Text>
                )}
              </View>
            </View>

            {/* Board Cards */}
            <View style={styles.boardContainer}>
              <View style={styles.headerRow}>
                 <Text style={[styles.potText, { color: themeColors.text }]}>Pot: {item.pot}</Text>
                 <Text style={[styles.dateText, { color: themeColors.subText }]}> • {formatDate(item.timestamp, dateFormat)}</Text>
              </View>
              
              <View style={styles.cardsRow}>
                {item.communityCards && item.communityCards.length > 0 ? (
                  item.communityCards.map((card, index) => (
                    <PokerCard key={index} card={card} style={{ marginRight: 4 }} />
                  ))
                ) : (
                  <Text style={{ color: themeColors.subText, fontSize: 12 }}>No board</Text>
                )}
              </View>
            </View>
          </View>
        </View>
        
        {!isSelectionMode && (
          <View style={styles.cardFooter}>
            <Ionicons name="chevron-forward" size={20} color={themeColors.subText} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity onPress={cancelSelection} style={styles.headerButton}>
              <Text style={{ color: themeColors.tint, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>
              {selectedHandIds.size} Selected
            </ThemedText>
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Text style={{ color: '#ff3b30', fontSize: 16, fontWeight: '600' }}>
                Delete ({selectedHandIds.size})
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>Saved Hands</ThemedText>
            <View style={{ width: 24 }} />
          </>
        )}
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
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={themeColors.tint} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ color: themeColors.subText }}>No saved hands found.</Text>
            </View>
          }
        />
      )}

      {/* FAB - Record New Hand */}
      {!isSelectionMode && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => router.push('/record-hand')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
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
    height: 56,
  },
  backButton: {
    padding: 4,
  },
  headerButton: {
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
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionIndicator: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  handRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCardsContainer: {
    alignItems: 'center',
    marginRight: 24,
    minWidth: 60,
  },
  boardContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
  },
  sectionLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  sessionNameText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stakesText: {
    fontSize: 11,
  },
  locationText: {
    fontSize: 11,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  potText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  dateText: {
    fontSize: 12,
  },
  cardFooter: {
    justifyContent: 'center',
    paddingLeft: 8,
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196f3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
