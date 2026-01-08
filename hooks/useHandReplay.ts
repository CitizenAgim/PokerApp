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

function findFirstActionAfterBlinds(actions: HandAction[]): number {
  // Find the first action that isn't a post-blind
  // This should be UTG or the player left of the last straddle
  for (let i = 0; i < actions.length; i++) {
    if (actions[i].type !== 'post-blind') {
      return i;
    }
  }
  return 0; // Fallback to first action if all are blinds (shouldn't happen)
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

function getStateAfterBlinds(hand: HandRecord): ReplayState {
  // Start with initial state
  let state = getInitialState(hand);
  
  // Apply all post-blind actions to get to the state where action begins
  for (const action of hand.actions) {
    if (action.type !== 'post-blind') {
      break;
    }
    state = applyAction(state, action, hand.communityCards);
  }
  
  // Clear the lastAction and activeSeat since we want to show
  // the state as "Blinds posted" rather than showing the last blind
  state.lastAction = null;
  state.activeSeat = null;
  
  return state;
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
        // action.amount is the INCREMENTAL amount added to the pot
        // So we ADD it to the current bet, not replace
        const currentBet = newState.currentBets[action.seatNumber] || 0;
        newState.currentBets[action.seatNumber] = currentBet + action.amount;
        newState.currentStacks[action.seatNumber] = (newState.currentStacks[action.seatNumber] || 0) - action.amount;
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
  // Find index of first non-blind action
  const firstActionIndex = useMemo(() => findFirstActionAfterBlinds(hand.actions), [hand.actions]);
  
  const [currentIndex, setCurrentIndex] = useState(firstActionIndex - 1);
  const [showVillainCards, setShowVillainCards] = useState(false);
  
  // Precompute all states
  // State at index i represents the state AFTER action[i] has been applied
  // Index -1 represents state after blinds are posted (start of real action)
  const allStates = useMemo(() => {
    const states: ReplayState[] = [];
    
    // Start with state after blinds
    const stateAfterBlinds = getStateAfterBlinds(hand);
    states.push(stateAfterBlinds); // This maps to index (firstActionIndex - 1)
    
    // Apply remaining actions (non-blind actions)
    let state = stateAfterBlinds;
    for (let i = firstActionIndex; i < hand.actions.length; i++) {
      state = applyAction(state, hand.actions[i], hand.communityCards);
      states.push(state);
    }
    
    // Mark final state as complete
    if (states.length > 0) {
      states[states.length - 1] = {
        ...states[states.length - 1],
        isComplete: true,
      };
    }
    
    return states;
  }, [hand, firstActionIndex]);
  
  // Map currentIndex to states array index
  // currentIndex = firstActionIndex - 1 maps to states[0]
  // currentIndex = firstActionIndex maps to states[1]
  // etc.
  const stateArrayIndex = currentIndex - (firstActionIndex - 1);
  const state = allStates[stateArrayIndex] || allStates[0];
  
  const totalActions = hand.actions.length;
  const minIndex = firstActionIndex - 1; // Start position (after blinds)
  
  const nextAction = useCallback(() => {
    if (currentIndex < totalActions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, totalActions]);
  
  const prevAction = useCallback(() => {
    if (currentIndex > minIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex, minIndex]);
  
  const goToStart = useCallback(() => {
    setCurrentIndex(minIndex);
  }, [minIndex]);
  
  const goToEnd = useCallback(() => {
    setCurrentIndex(totalActions - 1);
  }, [totalActions]);
  
  const toggleVillainCards = useCallback(() => {
    setShowVillainCards(prev => !prev);
  }, []);

  const jumpToStreet = useCallback((street: Street) => {
    if (street === 'preflop') {
      setCurrentIndex(minIndex);
      return;
    }
    
    const index = hand.actions.findIndex(a => a.street === street);
    if (index !== -1 && index >= firstActionIndex) {
      setCurrentIndex(index);
    }
  }, [hand.actions, minIndex, firstActionIndex]);
  
  const currentAction = currentIndex >= firstActionIndex ? hand.actions[currentIndex] : null;
  const actionText = currentAction 
    ? formatAction(currentAction, hand.seats, hand.heroSeat)
    : 'Blinds posted';
  
  // Calculate progress: show relative to meaningful actions
  const actionsAfterBlinds = totalActions - firstActionIndex;
  const currentProgress = currentIndex - minIndex; // 0 means at start
  
  return {
    state,
    currentIndex,
    totalActions,
    showVillainCards,
    actionText,
    currentAction,
    hand,
    nextAction,
    prevAction,
    goToStart,
    goToEnd,
    jumpToStreet,
    toggleVillainCards,
    canGoNext: currentIndex < totalActions - 1,
    canGoPrev: currentIndex > minIndex,
    progress: `${currentProgress + 1} / ${actionsAfterBlinds + 1}`,
  };
}
