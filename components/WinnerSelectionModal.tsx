import { Seat } from '@/types/poker';
import { SidePot } from '@/utils/hand-recording/types';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

interface WinnerSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (results: { potIndex: number, winnerSeats: number[] }[]) => void;
  seats: Seat[];
  sidePots: SidePot[];
  themeColors: any;
}

export function WinnerSelectionModal({ 
  visible, 
  onClose, 
  onConfirm, 
  seats, 
  sidePots,
  themeColors 
}: WinnerSelectionModalProps) {
  const [selections, setSelections] = useState<Record<number, number[]>>({});

  useEffect(() => {
    if (visible) {
      setSelections({});
    }
  }, [visible]);

  const toggleWinner = (potIndex: number, seatNumber: number) => {
    setSelections(prev => {
      const current = prev[potIndex] || [];
      if (current.includes(seatNumber)) {
        return { ...prev, [potIndex]: current.filter(s => s !== seatNumber) };
      } else {
        return { ...prev, [potIndex]: [...current, seatNumber] };
      }
    });
  };

  const handleConfirm = () => {
    const results = Object.entries(selections).map(([index, winners]) => ({
      potIndex: parseInt(index),
      winnerSeats: winners
    }));
    
    // Validate that every pot has at least one winner
    if (sidePots.some((_, i) => !selections[i] || selections[i].length === 0)) {
        // Alert or just return? Let's just return for now, maybe show error in UI
        return;
    }
    
    onConfirm(results);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.content, { backgroundColor: themeColors.card }]}>
          <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
            <ThemedText style={[styles.title, { color: themeColors.text }]}>Select Winners</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <ThemedText style={{ color: themeColors.subText }}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            {sidePots.map((pot, index) => (
              <View key={index} style={[styles.potSection, { borderBottomColor: themeColors.border }]}>
                <ThemedText style={[styles.potTitle, { color: themeColors.text }]}>
                  {index === 0 && sidePots.length === 1 ? 'Main Pot' : 
                   index === 0 ? 'Main Pot' : `Side Pot ${index}`} 
                  : {pot.amount}
                </ThemedText>
                
                <View style={styles.playerGrid}>
                  {pot.eligibleSeats.map(seatNum => {
                    const seat = seats.find(s => (s.seatNumber ?? (s.index + 1)) === seatNum);
                    const isSelected = (selections[index] || []).includes(seatNum);
                    
                    return (
                      <TouchableOpacity
                        key={seatNum}
                        style={[
                          styles.playerButton,
                          { 
                            backgroundColor: isSelected ? '#2196f3' : themeColors.background,
                            borderColor: isSelected ? '#2196f3' : themeColors.border
                          }
                        ]}
                        onPress={() => toggleWinner(index, seatNum)}
                      >
                        <ThemedText style={{ color: isSelected ? '#fff' : themeColors.text }}>
                          {seat?.player?.name || `Seat ${seatNum}`}
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.confirmButton, { backgroundColor: '#2196f3' }]}
              onPress={handleConfirm}
            >
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Confirm Winners</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 12,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  potSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  potTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  footer: {
    padding: 16,
  },
  confirmButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
});
