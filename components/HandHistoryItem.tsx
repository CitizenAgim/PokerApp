import { PokerCard } from '@/components/PokerCard';
import { Colors } from '@/constants/theme';
import { useCurrentUser } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HandRecord } from '@/services/firebase/hands';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HandHistoryItemProps {
  hand: HandRecord;
  onPress: (hand: HandRecord) => void;
  onLongPress?: (hand: HandRecord) => void;
  isSelected?: boolean;
  isSelectionMode?: boolean;
}

export function HandHistoryItem({ hand, onPress, onLongPress, isSelected, isSelectionMode }: HandHistoryItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useCurrentUser();

  const themeColors = {
    selectedBackground: isDark ? 'rgba(33, 150, 243, 0.2)' : 'rgba(33, 150, 243, 0.1)',
    selectedBorder: '#2196f3',
    tint: '#2196f3',
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStreetLabel = (street: string) => {
    switch (street) {
      case 'PREFLOP': return 'Preflop';
      case 'FLOP': return 'Flop';
      case 'TURN': return 'Turn';
      case 'RIVER': return 'River';
      case 'SHOWDOWN': return 'Showdown';
      default: return street;
    }
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

  const heroCards = getHeroCardsArray(hand);

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: isSelected ? themeColors.selectedBackground : theme.card, 
          borderColor: isSelected ? themeColors.selectedBorder : theme.border,
          flexDirection: 'row',
          alignItems: 'center',
        }
      ]} 
      onPress={() => onPress(hand)}
      onLongPress={() => onLongPress?.(hand)}
      delayLongPress={500}
    >
      {isSelectionMode && (
        <View style={{ marginRight: 12 }}>
          <Ionicons 
            name={isSelected ? "checkbox" : "square-outline"} 
            size={24} 
            color={themeColors.tint} 
          />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.time, { color: theme.subText }]}>{formatTime(hand.timestamp)}</Text>
          <View style={[styles.streetBadge, { backgroundColor: theme.tabActiveBg }]}>
            <Text style={[styles.streetText, { color: theme.text }]}>{getStreetLabel(hand.street)}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.handRow}>
            {/* Hero Cards */}
            <View style={styles.heroCardsContainer}>
              <Text style={[styles.sectionLabel, { color: theme.subText }]}>Hero</Text>
              <View style={styles.cardsRow}>
                {heroCards.length > 0 ? (
                  heroCards.map((card, index) => (
                    <PokerCard key={index} card={card} style={index > 0 ? { marginLeft: -5, zIndex: index } : { zIndex: index }} />
                  ))
                ) : (
                  <Text style={{ color: theme.subText, fontSize: 12 }}>No cards</Text>
                )}
              </View>
            </View>

            {/* Board Cards */}
            <View style={styles.boardContainer}>
              <View style={styles.potInfo}>
                <Text style={[styles.potLabel, { color: theme.subText }]}>Pot: </Text>
                <Text style={[styles.potValue, { color: theme.text }]}>{hand.pot}</Text>
              </View>
              
              <View style={styles.cardsRow}>
                {hand.communityCards && hand.communityCards.length > 0 ? (
                  hand.communityCards.map((card, index) => (
                    <PokerCard key={index} card={card} style={{ marginRight: 4 }} />
                  ))
                ) : (
                  <Text style={{ color: theme.subText, fontSize: 12 }}>No board</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.winnerLabel, { color: theme.subText }]}>
            {hand.winners && hand.winners.length > 0 
              ? `${hand.winners.length} Winner${hand.winners.length > 1 ? 's' : ''}`
              : 'No Showdown'}
          </Text>
          { !isSelectionMode && <Ionicons name="chevron-forward" size={16} color={theme.subText} /> }
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
  },
  streetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  streetText: {
    fontSize: 10,
    fontWeight: '600',
  },
  content: {
    marginBottom: 8,
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
  potInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  potLabel: {
    fontSize: 12,
  },
  potValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    paddingTop: 8,
  },
  winnerLabel: {
    fontSize: 12,
  },
});
