import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PokerCardProps {
  card?: string;
  style?: any;
  width?: number;
  height?: number;
}

export const PokerCard = ({ card, style, width = 30, height = 42 }: PokerCardProps) => {
  if (!card) {
    return <View style={[styles.pokerCard, styles.pokerCardEmpty, { width, height }, style]} />;
  }
  
  const rank = card.slice(0, -1);
  const suitId = card.slice(-1);
  const isRed = suitId === 'h' || suitId === 'd';
  const suitSymbol = suitId === 's' ? '♠' : suitId === 'h' ? '♥' : suitId === 'd' ? '♦' : '♣';
  
  return (
    <View style={[styles.pokerCard, { width, height }, style]}>
      <Text style={[styles.pokerCardText, { color: isRed ? '#e74c3c' : '#000' }]}>{rank}</Text>
      <Text style={[styles.pokerCardSuit, { color: isRed ? '#e74c3c' : '#000' }]}>{suitSymbol}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pokerCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  pokerCardEmpty: {
    backgroundColor: '#eee',
    borderStyle: 'dashed',
  },
  pokerCardText: {
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 15,
  },
  pokerCardSuit: {
    fontSize: 13,
    lineHeight: 15,
  },
});
