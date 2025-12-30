import { PokerTable } from '@/components/table/PokerTable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCurrentUser, usePlayers } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHandReplay } from '@/hooks/useHandReplay';
import { getHandById, HandRecord } from '@/services/firebase/hands';
import { getThemeColors, styles } from '@/styles/hand-replay.styles';
import { Seat } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HandReplayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  const insets = useSafeAreaInsets();
  
  const { user, loading: userLoading } = useCurrentUser();
  const { players } = usePlayers();
  
  const [hand, setHand] = useState<HandRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch hand data
  useEffect(() => {
    const fetchHand = async () => {
      if (!id || !user?.id) return;
      
      try {
        setLoading(true);
        const fetchedHand = await getHandById(id, user.id);
        if (fetchedHand) {
          setHand(fetchedHand);
        } else {
          setError('Hand not found');
        }
      } catch (err) {
        console.error('Error fetching hand:', err);
        setError('Failed to load hand');
      } finally {
        setLoading(false);
      }
    };
    
    if (!userLoading) {
      fetchHand();
    }
  }, [id, user?.id, userLoading]);
  
  if (loading || userLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border, paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>Hand Replay</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.tint} />
        </View>
      </ThemedView>
    );
  }
  
  if (error || !hand) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border, paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>Hand Replay</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.subText }]}>
            {error || 'Hand not found'}
          </Text>
        </View>
      </ThemedView>
    );
  }
  
  return <HandReplayContent hand={hand} />;
}

function HandReplayContent({ hand }: { hand: HandRecord }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  const insets = useSafeAreaInsets();
  const { players } = usePlayers();
  
  const {
    state,
    currentIndex,
    totalActions,
    showVillainCards,
    showWinnerOverlay,
    actionText,
    progress,
    nextAction,
    prevAction,
    goToStart,
    goToEnd,
    jumpToStreet,
    toggleVillainCards,
    dismissWinnerOverlay,
    canGoNext,
    canGoPrev,
  } = useHandReplay(hand);
  
  // Build seats with current state
  const replaySeats: Seat[] = hand.seats.map(seat => {
    const seatNum = seat.seatNumber ?? (seat.index !== undefined ? seat.index + 1 : 0);
    return {
      ...seat,
      player: seat.player ? {
        ...seat.player,
        stack: state.currentStacks[seatNum] ?? seat.player.stack ?? 0,
      } : undefined,
    };
  });
  
  // Build hand cards to show
  const visibleHandCards: Record<number, string[]> = {};
  if (hand.handCards) {
    Object.entries(hand.handCards).forEach(([seatStr, cards]) => {
      const seatNum = parseInt(seatStr);
      if (seatNum === hand.heroSeat) {
        // Always show hero's cards
        visibleHandCards[seatNum] = cards;
      } else if (showVillainCards) {
        // Show villain cards if toggle is on
        visibleHandCards[seatNum] = cards;
      } else if (state.isComplete) {
        // Show at showdown
        visibleHandCards[seatNum] = cards;
      }
      // Otherwise hide villain cards
    });
  }
  
  // Get winner info
  const getWinnerInfo = () => {
    if (!hand.winners || hand.winners.length === 0) return null;
    
    const winnerNames = hand.winners.map(seatNum => {
      if (seatNum === hand.heroSeat) return 'Hero';
      const seat = hand.seats.find(s => {
        const sNum = s.seatNumber ?? (s.index !== undefined ? s.index + 1 : 0);
        return sNum === seatNum;
      });
      return seat?.player?.name || `Seat ${seatNum}`;
    });
    
    return {
      names: winnerNames,
      pot: hand.pot,
    };
  };
  
  const winnerInfo = getWinnerInfo();
  
  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>Hand Replay</ThemedText>
        
        {/* Toggle Villain Cards */}
        <TouchableOpacity 
          style={styles.toggleContainer}
          onPress={toggleVillainCards}
        >
          <Text style={[styles.toggleText, { color: themeColors.subText }]}>
            {showVillainCards ? 'Hide Cards' : 'Show Cards'}
          </Text>
          <Ionicons 
            name={showVillainCards ? "eye-off" : "eye"} 
            size={20} 
            color={themeColors.tint} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Session Info */}
      {(hand.sessionName || hand.stakes) && (
        <View style={[styles.sessionInfo, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
          <Text style={[styles.sessionInfoText, { color: themeColors.subText }]}>
            {[hand.sessionName, hand.stakes, hand.location].filter(Boolean).join(' • ')}
          </Text>
        </View>
      )}
      
      {/* Street Progress Bar */}
      <View style={[styles.streetProgressContainer, { backgroundColor: themeColors.background }]}>
        {['preflop', 'flop', 'turn', 'river'].map((street, index, arr) => {
          const isActive = state.currentStreet === street;
          const isPast = ['preflop', 'flop', 'turn', 'river'].indexOf(state.currentStreet) > index;
          
          return (
            <TouchableOpacity 
              key={street} 
              style={styles.streetStep}
              onPress={() => jumpToStreet(street as any)}
            >
              <View style={[
                styles.streetDot, 
                { backgroundColor: isActive || isPast ? themeColors.tint : themeColors.subText, opacity: isActive || isPast ? 1 : 0.3 }
              ]} />
              <Text style={[
                styles.streetLabel, 
                { color: isActive ? themeColors.tint : themeColors.subText, opacity: isActive ? 1 : (isPast ? 0.7 : 0.3) }
              ]}>
                {street}
              </Text>
              {index < arr.length - 1 && (
                <View style={[
                  styles.streetLine, 
                  { backgroundColor: isPast ? themeColors.tint : themeColors.subText, opacity: isPast ? 0.5 : 0.1 }
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Poker Table */}
      <View style={styles.content}>
        <PokerTable
          seats={replaySeats}
          players={players}
          buttonPosition={hand.buttonPosition}
          heroSeat={hand.heroSeat}
          activeSeat={state.activeSeat}
          onSeatPress={() => {}} // No interaction in replay
          themeColors={{
            ...themeColors,
            seatBg: isDark ? '#2c2c2e' : '#fff',
            seatBorder: isDark ? '#444' : '#ddd',
            seatOccupiedBg: isDark ? '#1a2a3a' : '#e3f2fd',
            seatOccupiedBorder: isDark ? '#0d47a1' : '#2196f3',
            seatHeroBg: isDark ? '#3a2a1a' : '#fff3e0',
            seatHeroBorder: isDark ? '#e65100' : '#ff9800',
          }}
          showCards={true}
          handCards={visibleHandCards}
          communityCards={state.visibleCommunityCards.length > 0 
            ? [...state.visibleCommunityCards, ...Array(5 - state.visibleCommunityCards.length).fill('')]
            : ['', '', '', '', '']}
          foldedSeats={state.foldedSeats}
          pot={state.currentPot + Object.values(state.currentBets).reduce((a, b) => a + b, 0)}
          street={state.currentStreet}
          bets={state.currentBets}
        />
      </View>
      
      {/* Action Display & Controls */}
      <View style={{ backgroundColor: themeColors.card, borderTopWidth: 1, borderTopColor: themeColors.border }}>
        <View style={styles.actionDisplay}>
          <Text style={[styles.actionText, { color: themeColors.text }]}>
            {actionText}
          </Text>
          <Text style={[styles.actionSubtext, { color: themeColors.subText }]}>
            Step {progress}
          </Text>
        </View>
        
        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.controlButtonSmall, { backgroundColor: canGoPrev ? themeColors.actionButtonBg : themeColors.actionButtonDisabledBg }]}
            onPress={goToStart}
            disabled={!canGoPrev}
          >
            <Ionicons name="play-skip-back" size={20} color={canGoPrev ? themeColors.tint : themeColors.subText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: canGoPrev ? themeColors.actionButtonBg : themeColors.actionButtonDisabledBg }]}
            onPress={prevAction}
            disabled={!canGoPrev}
          >
            <Ionicons name="play-back" size={28} color={canGoPrev ? themeColors.tint : themeColors.subText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: canGoNext ? themeColors.tint : themeColors.actionButtonDisabledBg }]}
            onPress={nextAction}
            disabled={!canGoNext}
          >
            <Ionicons name="play-forward" size={28} color={canGoNext ? '#fff' : themeColors.subText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButtonSmall, { backgroundColor: canGoNext ? themeColors.actionButtonBg : themeColors.actionButtonDisabledBg }]}
            onPress={goToEnd}
            disabled={!canGoNext}
          >
            <Ionicons name="play-skip-forward" size={20} color={canGoNext ? themeColors.tint : themeColors.subText} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Winner Overlay */}
      {showWinnerOverlay && winnerInfo && (
        <View style={styles.winnerOverlay}>
          <View style={[styles.winnerCard, { backgroundColor: themeColors.card }]}>
            <Ionicons name="trophy" size={48} color={themeColors.warning} />
            <Text style={[styles.winnerTitle, { color: themeColors.text }]}>Winner!</Text>
            <Text style={[styles.winnerName, { color: themeColors.text }]}>
              {winnerInfo.names.join(', ')}
            </Text>
            <Text style={[styles.winnerAmount, { color: themeColors.success }]}>
              Pot: {winnerInfo.pot}
            </Text>
            <TouchableOpacity 
              style={[styles.dismissButton, { backgroundColor: themeColors.tint }]}
              onPress={dismissWinnerOverlay}
            >
              <Text style={styles.dismissButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ThemedView>
  );
}
