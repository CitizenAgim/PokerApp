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

  const getHeroCards = (hand: HandRecord) => {
    if (!hand.handCards) return 'Unknown';
    
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
      // Navigate to hand details (to be implemented)
      // router.push('/saved-hands/' + id);
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
          <View style={styles.cardHeader}>
            <Text style={[styles.dateText, { color: themeColors.subText }]}>
              {formatDate(item.timestamp, dateFormat)}
            </Text>
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
    padding: 16,
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
  cardHeader: {
    position: 'absolute',
    top: 0,
    right: 0,
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
  },
  cardBody: {
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
