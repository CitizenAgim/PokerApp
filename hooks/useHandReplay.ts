import { HandRecord } from '@/services/firebase/hands';
import { Seat } from '@/types/poker';
import { HandAction, Street } from '@/utils/hand-recording/types';
import { useCallback, useMemo, useState } from 'react';

export interface ReplayState {
  currentActionIndex: number; // -1 = initial state (blinds posted), 0+ = after action[index]
  currentStreet: Street;
  visibleCommunityCards: string[];
  currentPot: number;
  currentBets: Record<number, number>;
  currentStacks: Record<number, number>;
  foldedSeats: Set<number>;
  activeSeat: number | null;
  lastAction: HandAction | null;
  isComplete: boolean;
}

function getVisibleCommunityCards(allCards: string[], street: Street): string[] {
  const cards = allCards.filter(c => c && c !== '');
  switch (street) {
    case 'preflop':
      return [];
    case 'flop':
      return cards.slice(0, 3);
    case 'turn':
      return cards.slice(0, 4);
    case 'river':
      return cards.slice(0, 5);
    default:
      return [];
  }
}

function getInitialStacks(seats: Seat[]): Record<number, number> {
  const stacks: Record<number, number> = {};
  seats.forEach(seat => {
    const seatNum = seat.seatNumber ?? (seat.index !== undefined ? seat.index + 1 : 0);
    if (seatNum > 0 && (seat.player || seat.playerId)) {
      // Get the stack at end of hand + add back what they put in the pot
      stacks[seatNum] = seat.player?.stack ?? 0;
    }
  });
  return stacks;
}

function reconstructInitialStacks(
  seats: Seat[], 
  actions: HandAction[],
  finalPot: number
): Record<number, number> {
  // Start with final stacks
  const stacks = getInitialStacks(seats);
  
  // Add back all the bets each player made
  actions.forEach(action => {
    if (action.amount && action.type !== 'win') {
      stacks[action.seatNumber] = (stacks[action.seatNumber] || 0) + action.amount;
    }
  });
  
  return stacks;
}

function getPlayerName(seats: Seat[], seatNumber: number, heroSeat?: number): string {
  const seat = seats.find(s => {
    const sNum = s.seatNumber ?? (s.index !== undefined ? s.index + 1 : 0);
    return sNum === seatNumber;
  });
  
  if (seatNumber === heroSeat) {
    return 'Hero';
  }
  
  if (seat?.player?.name) {
    return seat.player.name;
  }
  
  return `Seat ${seatNumber}`;
}

export function formatAction(
  action: HandAction, 
  seats: Seat[],
  heroSeat?: number
): string {
  const playerName = getPlayerName(seats, action.seatNumber, heroSeat);
  
  switch (action.type) {
    case 'fold':
      return `${playerName} folds`;
    case 'check':
      return `${playerName} checks`;
    case 'call':
      return `${playerName} calls ${action.amount || ''}`;
    case 'bet':
      return `${playerName} bets ${action.amount || ''}`;
    case 'post-blind':
      return `${playerName} posts ${action.amount || ''}`;
    case 'win':
      return `${playerName} wins ${action.amount || ''}`;
    default:
      return `${playerName} acts`;
  }
}

function getInitialState(hand: HandRecord): ReplayState {
  // Reconstruct initial stacks by adding back all bets to final stacks
  const initialStacks = reconstructInitialStacks(hand.seats, hand.actions, hand.pot);
  
  return {
    currentActionIndex: -1,
    currentStreet: 'preflop',
    visibleCommunityCards: [],
    currentPot: 0,
    currentBets: {},
    currentStacks: initialStacks,
    foldedSeats: new Set(),
    activeSeat: null,
    lastAction: null,
    isComplete: false,
  };
}

function applyAction(
  state: ReplayState, 
  action: HandAction,
  allCommunityCards: string[]
): ReplayState {
  const newState = { ...state };
  newState.currentBets = { ...state.currentBets };
  newState.currentStacks = { ...state.currentStacks };
  newState.foldedSeats = new Set(state.foldedSeats);
  
  // Update street if changed
  if (action.street !== state.currentStreet) {
    newState.currentStreet = action.street;
    newState.visibleCommunityCards = getVisibleCommunityCards(allCommunityCards, action.street);
    
    // On street change, move bets to pot and reset bets
    const totalBets = Object.values(newState.currentBets).reduce((a, b) => a + b, 0);
    newState.currentPot += totalBets;
    newState.currentBets = {};
  }
  
  // Apply the action
  switch (action.type) {
    case 'fold':
      newState.foldedSeats.add(action.seatNumber);
      break;
    case 'check':
      // No change
      break;
    case 'call':
    case 'bet':
    case 'post-blind':
      if (action.amount) {
        const currentBet = newState.currentBets[action.seatNumber] || 0;
        const additionalBet = action.amount - currentBet;
        newState.currentBets[action.seatNumber] = action.amount;
        newState.currentStacks[action.seatNumber] = (newState.currentStacks[action.seatNumber] || 0) - additionalBet;
      }
      break;
    case 'win':
      if (action.amount) {
        newState.currentStacks[action.seatNumber] = (newState.currentStacks[action.seatNumber] || 0) + action.amount;
        newState.currentPot = 0;
      }
      break;
  }
  
  newState.lastAction = action;
  newState.activeSeat = action.seatNumber;
  
  return newState;
}

function revertAction(
  state: ReplayState,
  action: HandAction,
  prevState: ReplayState
): ReplayState {
  // Simply return the previous state (we'll rebuild from scratch for simplicity)
  return prevState;
}

export function useHandReplay(hand: HandRecord) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showVillainCards, setShowVillainCards] = useState(false);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  
  // Precompute all states from index -1 to actions.length - 1
  const allStates = useMemo(() => {
    const states: ReplayState[] = [];
    let state = getInitialState(hand);
    states.push(state); // Index -1 maps to states[0]
    
    hand.actions.forEach((action, i) => {
      state = applyAction(state, action, hand.communityCards);
      states.push(state); // Index i maps to states[i+1]
    });
    
    // Mark final state as complete
    if (states.length > 0) {
      states[states.length - 1] = {
        ...states[states.length - 1],
        isComplete: true,
      };
    }
    
    return states;
  }, [hand]);
  
  // Current state based on index
  const state = allStates[currentIndex + 1] || allStates[0];
  
  const totalActions = hand.actions.length;
  
  const nextAction = useCallback(() => {
    if (currentIndex < totalActions - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      
      // Show winner overlay at the end
      if (newIndex === totalActions - 1) {
        setShowWinnerOverlay(true);
      }
    }
  }, [currentIndex, totalActions]);
  
  const prevAction = useCallback(() => {
    if (currentIndex >= 0) {
      setCurrentIndex(currentIndex - 1);
      setShowWinnerOverlay(false);
    }
  }, [currentIndex]);
  
  const goToStart = useCallback(() => {
    setCurrentIndex(-1);
    setShowWinnerOverlay(false);
  }, []);
  
  const goToEnd = useCallback(() => {
    setCurrentIndex(totalActions - 1);
    setShowWinnerOverlay(true);
  }, [totalActions]);
  
  const toggleVillainCards = useCallback(() => {
    setShowVillainCards(prev => !prev);
  }, []);
  
  const dismissWinnerOverlay = useCallback(() => {
    setShowWinnerOverlay(false);
  }, []);
  
  const currentAction = currentIndex >= 0 ? hand.actions[currentIndex] : null;
  const actionText = currentAction 
    ? formatAction(currentAction, hand.seats, hand.heroSeat)
    : 'Start of hand';
  
  return {
    state,
    currentIndex,
    totalActions,
    showVillainCards,
    showWinnerOverlay,
    actionText,
    currentAction,
    hand,
    nextAction,
    prevAction,
    goToStart,
    goToEnd,
    toggleVillainCards,
    dismissWinnerOverlay,
    canGoNext: currentIndex < totalActions - 1,
    canGoPrev: currentIndex >= 0,
    progress: `${currentIndex + 2} / ${totalActions + 1}`,
  };
}
