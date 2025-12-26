import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HandRecord } from '@/services/firebase/hands';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface HandHistoryItemProps {
  hand: HandRecord;
  onPress: (hand: HandRecord) => void;
}

export function HandHistoryItem({ hand, onPress }: HandHistoryItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

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

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]} 
      onPress={() => onPress(hand)}
    >
      <View style={styles.header}>
        <Text style={[styles.time, { color: theme.subText }]}>{formatTime(hand.timestamp)}</Text>
        <View style={[styles.streetBadge, { backgroundColor: theme.tabActiveBg }]}>
          <Text style={[styles.streetText, { color: theme.text }]}>{getStreetLabel(hand.street)}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.potInfo}>
          <Text style={[styles.potLabel, { color: theme.subText }]}>Pot</Text>
          <Text style={[styles.potValue, { color: theme.text }]}>{hand.pot}</Text>
        </View>

        {hand.communityCards && hand.communityCards.length > 0 && (
          <View style={styles.cardsContainer}>
            {hand.communityCards.map((card, index) => (
              <View key={index} style={[styles.card, { backgroundColor: '#fff', borderColor: theme.border }]}>
                <Text style={styles.cardText}>{card}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.winnerLabel, { color: theme.subText }]}>
          {hand.winners && hand.winners.length > 0 
            ? `${hand.winners.length} Winner${hand.winners.length > 1 ? 's' : ''}`
            : 'No Showdown'}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.subText} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  potInfo: {
    flex: 1,
  },
  potLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  potValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  card: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 24,
    alignItems: 'center',
  },
  cardText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc', // This should probably be themed too, but using a generic gray for now
    paddingTop: 8,
  },
  winnerLabel: {
    fontSize: 12,
  },
});
