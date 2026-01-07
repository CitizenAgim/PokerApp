import { Seat } from '@/types/poker';
import { HandState } from './types';
export { HandState };

export const initialState: HandState = {
  seats: [],
  bets: {},
  pot: 0,
  sidePots: [],
  street: 'preflop',
  currentActionSeat: null,
  currentBet: 0,
  minRaise: 0,
  foldedSeats: new Set<number>(),
  handCards: {},
  originalHandCards: {}, // Preserved for saving (not cleared on fold)
  communityCards: ['', '', '', '', ''],
  buttonPosition: 1,
  isHandStarted: false,
  activeCardSeat: null,
  isPickingBoard: false,
  straddleCount: 0,
  isMississippiActive: false,
  smallBlind: 0,
  bigBlind: 0,
  actedSeats: new Set<number>(),
  actions: [],
  isHandComplete: false,
  winners: [],
};

export const getNextSeat = (currentSeatNum: number, activeSeats: Seat[], foldedSeats: Set<number>): number | null => {
  let next = currentSeatNum;
  let loopCount = 0;
  do {
      next = (next % 9) + 1;
      const isActive = activeSeats.some(s => (s.seatNumber ?? (s.index + 1)) === next);
      const isFolded = foldedSeats.has(next);
      if (isActive && !isFolded) return next;
      loopCount++;
  } while (next !== currentSeatNum && loopCount < 10);
  return null;
};

export const startHand = (state: HandState): HandState => {
  const activeSeats = state.seats.filter(s => s.player || s.playerId);
  if (activeSeats.length < 2) return state;
  
  // Preserve original hand cards for saving (before any folds remove cards)
  const newState = { 
    ...state, 
    isHandStarted: true, 
    actedSeats: new Set<number>(),
    originalHandCards: { ...state.handCards } // Snapshot of cards at hand start
  };
  
  // Determine positions
  const occupiedSeats = activeSeats.sort((a, b) => {
    const seatA = a.seatNumber ?? (a.index + 1);
    const seatB = b.seatNumber ?? (b.index + 1);
    return seatA - seatB;
  });

  let sbSeatNum = -1;
  let bbSeatNum = -1;

  if (occupiedSeats.length >= 2) {
    let nextIndex = occupiedSeats.findIndex(s => {
      const sNum = s.seatNumber ?? (s.index + 1);
      return sNum > state.buttonPosition;
    });
    
    if (nextIndex === -1) nextIndex = 0;
    
    const sbSeat = occupiedSeats[nextIndex];
    sbSeatNum = sbSeat.seatNumber ?? (sbSeat.index + 1);
    
    let bbIndex = (nextIndex + 1) % occupiedSeats.length;
    const bbSeat = occupiedSeats[bbIndex];
    bbSeatNum = bbSeat.seatNumber ?? (bbSeat.index + 1);
  }

  const initialBets = { ...state.bets };
  let newSeats = [...state.seats];
  const newActions = [...state.actions];

  // Post SB
  if (sbSeatNum !== -1 && !initialBets[sbSeatNum]) {
    const sbSeat = newSeats.find(s => (s.seatNumber ?? (s.index + 1)) === sbSeatNum);
    // Always post SB regardless of stack - stack is indicative only
    const actualSb = state.smallBlind;

    initialBets[sbSeatNum] = actualSb;
    // Only deduct from stack if stack exists
    newSeats = newSeats.map(s => {
        const sNum = s.seatNumber ?? (s.index + 1);
        if (sNum === sbSeatNum && s.player && s.player.stack !== undefined && s.player.stack > 0) {
            return { ...s, player: { ...s.player, stack: Math.max(0, s.player.stack - actualSb) } };
        }
        return s;
    });
    
    newActions.push({
        seatNumber: sbSeatNum,
        type: 'post-blind',
        amount: actualSb,
        street: 'preflop',
        timestamp: Date.now()
    });
  }

  // Post BB
  if (bbSeatNum !== -1 && !initialBets[bbSeatNum]) {
    const bbSeat = newSeats.find(s => (s.seatNumber ?? (s.index + 1)) === bbSeatNum);
    // Always post BB regardless of stack - stack is indicative only
    const actualBb = state.bigBlind;

    initialBets[bbSeatNum] = actualBb;
    // Only deduct from stack if stack exists
    newSeats = newSeats.map(s => {
        const sNum = s.seatNumber ?? (s.index + 1);
        if (sNum === bbSeatNum && s.player && s.player.stack !== undefined && s.player.stack > 0) {
            return { ...s, player: { ...s.player, stack: Math.max(0, s.player.stack - actualBb) } };
        }
        return s;
    });

    newActions.push({
        seatNumber: bbSeatNum,
        type: 'post-blind',
        amount: actualBb,
        street: 'preflop',
        timestamp: Date.now()
    });
  }

  newState.seats = newSeats;
  newState.bets = initialBets;
  newState.actions = newActions;
  
  let firstActorSeatNum: number;
  if (activeSeats.length === 2) {
      firstActorSeatNum = state.buttonPosition;
  } else if (state.isMississippiActive) {
      // Mississippi: Action starts left of button (SB)
      const next = getNextSeat(state.buttonPosition, activeSeats, newState.foldedSeats);
      firstActorSeatNum = next ?? state.buttonPosition;
  } else {
      let curr = state.buttonPosition;
      let next = getNextSeat(curr, activeSeats, newState.foldedSeats);
      if (next) curr = next; // SB
      next = getNextSeat(curr, activeSeats, newState.foldedSeats);
      if (next) curr = next; // BB
      next = getNextSeat(curr, activeSeats, newState.foldedSeats);
      if (next) curr = next; // UTG
      
      // Handle standard straddles if any (UTG, UTG+1...)
      for (let i = 0; i < state.straddleCount; i++) {
          next = getNextSeat(curr, activeSeats, newState.foldedSeats);
          if (next) curr = next;
      }

      firstActorSeatNum = curr;
  }
  
  newState.currentActionSeat = firstActorSeatNum;
  
  const maxBet = Math.max(state.bigBlind, ...Object.values(initialBets));
  newState.currentBet = maxBet;
  newState.minRaise = state.bigBlind;

  return newState;
};

export const fold = (state: HandState): HandState => {
  if (state.currentActionSeat === null) return state;
  
  const newState = { ...state };
  
  // Remove cards
  const newHandCards = { ...state.handCards };
  delete newHandCards[state.currentActionSeat];
  newState.handCards = newHandCards;
  
  // Add to folded
  newState.foldedSeats = new Set(state.foldedSeats);
  newState.foldedSeats.add(state.currentActionSeat);
  
  newState.actions = [...state.actions, {
      seatNumber: state.currentActionSeat,
      type: 'fold',
      street: state.street,
      timestamp: Date.now()
  }];
  
  // Move to next
  const activeSeats = state.seats.filter(s => s.player || s.playerId);
  const nextSeat = getNextSeat(state.currentActionSeat, activeSeats, newState.foldedSeats);
  newState.currentActionSeat = nextSeat;
  
  // Check if round complete (e.g. everyone else folded, or action moves)
  // If everyone else folded, hand ends. We should check that.
  const remaining = activeSeats.filter(s => !newState.foldedSeats.has(s.seatNumber ?? (s.index + 1)));
  if (remaining.length === 1) {
      // Hand ends, winner takes pot
      newState.isHandComplete = true;
      const winnerSeat = remaining[0].seatNumber ?? (remaining[0].index + 1);
      newState.winners = [winnerSeat];
      
      newState.actions = [...newState.actions, {
          seatNumber: winnerSeat,
          type: 'win',
          amount: newState.pot,
          street: newState.street,
          timestamp: Date.now()
      }];
      
      return newState;
  }

  return withRoundCheck(newState);
};

export const check = (state: HandState): HandState => {
  if (state.currentActionSeat === null) return state;
  const myBet = state.bets[state.currentActionSeat] || 0;
  if (state.currentBet > myBet) return state; // Invalid check
  
  const newState = { ...state };
  
  // Mark as acted
  newState.actedSeats = new Set(state.actedSeats);
  newState.actedSeats.add(state.currentActionSeat);

  newState.actions = [...state.actions, {
      seatNumber: state.currentActionSeat,
      type: 'check',
      street: state.street,
      timestamp: Date.now()
  }];

  const activeSeats = state.seats.filter(s => s.player || s.playerId);
  const nextSeat = getNextSeat(state.currentActionSeat, activeSeats, newState.foldedSeats);
  newState.currentActionSeat = nextSeat;
  
  return withRoundCheck(newState);
};

export const call = (state: HandState): HandState => {
  if (state.currentActionSeat === null) return state;
  const seat = state.seats.find(s => (s.seatNumber ?? (s.index + 1)) === state.currentActionSeat);
  if (!seat || !seat.player) return state;

  const newState = { ...state };
  
  const currentPlayerBet = state.bets[state.currentActionSeat] || 0;
  const amountToCall = state.currentBet;
  const amountNeeded = amountToCall - currentPlayerBet;
  
  // No stack restrictions - deduct from stack if available, otherwise just record the bet
  const stack = seat.player.stack || 0;
  const actualDeduction = stack > 0 ? Math.min(amountNeeded, stack) : 0;
  const finalBet = amountToCall; // Always match the current bet

  newState.seats = state.seats.map(s => {
      const sNum = s.seatNumber ?? (s.index + 1);
      if (sNum === state.currentActionSeat && s.player && s.player.stack !== undefined && s.player.stack > 0) {
          return { ...s, player: { ...s.player, stack: Math.max(0, s.player.stack - actualDeduction) } };
      }
      return s;
  });
  
  newState.bets = { ...state.bets, [state.currentActionSeat]: finalBet };
  
  newState.actions = [...state.actions, {
      seatNumber: state.currentActionSeat,
      type: 'call',
      amount: amountNeeded,
      street: state.street,
      timestamp: Date.now()
  }];
  
  // Mark as acted
  newState.actedSeats = new Set(state.actedSeats);
  newState.actedSeats.add(state.currentActionSeat);

  const activeSeats = state.seats.filter(s => s.player || s.playerId);
  const nextSeat = getNextSeat(state.currentActionSeat, activeSeats, newState.foldedSeats);
  newState.currentActionSeat = nextSeat;
  
  return withRoundCheck(newState);
};

export const bet = (state: HandState, amount: number, isAllIn: boolean = false): HandState => {
  if (state.currentActionSeat === null) return state;
  const seat = state.seats.find(s => (s.seatNumber ?? (s.index + 1)) === state.currentActionSeat);
  if (!seat || !seat.player) return state;

  const newState = { ...state };

  if (amount > state.currentBet) {
      const raiseDiff = amount - state.currentBet;
      newState.minRaise = raiseDiff;
      
      // Re-open action for everyone else
      // Only the raiser has acted at this new level
      newState.actedSeats = new Set<number>();
  }

  const currentPlayerBet = state.bets[state.currentActionSeat] || 0;
  const amountToDeduct = amount - currentPlayerBet;
  const currentStack = seat.player.stack || 0;

  // Silent stack adjustment for all-in or over-bet:
  // If amount exceeds remaining stack, treat entered amount as their actual remaining stack
  let adjustedStack = currentStack;
  if (isAllIn || amountToDeduct > currentStack) {
      // Silently adjust their original stack so it makes sense
      // Their "original stack" = amountToDeduct (what they're betting now) + currentPlayerBet (already in pot this hand)
      adjustedStack = amountToDeduct; // This will become 0 after deduction
  }

  newState.seats = state.seats.map(s => {
      const sNum = s.seatNumber ?? (s.index + 1);
      if (sNum === state.currentActionSeat && s.player) {
          const stackToDeduct = Math.min(amountToDeduct, adjustedStack);
          const newStack = isAllIn || amountToDeduct > currentStack 
              ? 0  // All-in or over-bet: stack goes to 0
              : Math.max(0, currentStack - amountToDeduct);
          return { ...s, player: { ...s.player, stack: newStack } };
      }
      return s;
  });

  newState.bets = { ...state.bets, [state.currentActionSeat]: amount };
  newState.currentBet = amount;
  
  newState.actions = [...state.actions, {
      seatNumber: state.currentActionSeat,
      type: isAllIn ? 'all-in' : 'bet',
      amount: amountToDeduct,
      street: state.street,
      timestamp: Date.now()
  }];
  
  // Mark as acted
  if (!newState.actedSeats) newState.actedSeats = new Set<number>(); // Safety
  newState.actedSeats.add(state.currentActionSeat);
  
  const activeSeats = state.seats.filter(s => s.player || s.playerId);
  const nextSeat = getNextSeat(state.currentActionSeat, activeSeats, newState.foldedSeats);
  newState.currentActionSeat = nextSeat;
  
  return withRoundCheck(newState);
};

export const checkRoundComplete = (state: HandState): boolean => {
  const activeSeats = state.seats.filter(s => (s.player || s.playerId) && !state.foldedSeats.has(s.seatNumber ?? (s.index + 1)));
  
  // If only one player left, round is technically complete (hand ends)
  if (activeSeats.length <= 1) return true;

  // Check if everyone has acted
  const allActed = activeSeats.every(s => {
    const sNum = s.seatNumber ?? (s.index + 1);
    const stack = s.player?.stack || 0;
    // If all-in, they don't need to act again unless reopened? 
    // Actually, if they are all-in, they are "done" for the street usually.
    if (stack === 0) return true;
    return state.actedSeats.has(sNum);
  });

  if (!allActed) return false;

  // Check if everyone matches the current bet
  const allMatched = activeSeats.every(s => {
    const sNum = s.seatNumber ?? (s.index + 1);
    const bet = state.bets[sNum] || 0;
    const stack = s.player?.stack || 0;
    return bet === state.currentBet || stack === 0;
  });

  return allMatched;
};

export const advanceStreet = (state: HandState): HandState => {
  const newState = { ...state };
  
  // --- Side Pot Logic ---
  const activeSeats = state.seats.filter(s => s.player || s.playerId);
  const bets = { ...state.bets };
  
  // Identify all unique bet amounts > 0
  const uniqueBets = Array.from(new Set(Object.values(bets).filter(b => b > 0))).sort((a, b) => a - b);
  
  let lastLevel = 0;
  const newSidePots = [...(state.sidePots || [])];

  uniqueBets.forEach(level => {
      const contribution = level - lastLevel;
      let chunkAmount = 0;
      const contributors: number[] = [];
      
      activeSeats.forEach(s => {
          const sNum = s.seatNumber ?? (s.index + 1);
          const bet = bets[sNum] || 0;
          
          // How much of this level did this player contribute?
          const amount = Math.max(0, Math.min(bet, level) - lastLevel);
          chunkAmount += amount;
          
          // Eligibility: Not folded AND bet >= level
          if (!state.foldedSeats.has(sNum) && bet >= level) {
              contributors.push(sNum);
          }
      });
      
      if (chunkAmount > 0) {
          // Find existing pot with same contributors
          contributors.sort((a, b) => a - b);
          
          const existingPotIndex = newSidePots.findIndex(p => {
              const pSeats = [...p.eligibleSeats].sort((a, b) => a - b);
              return JSON.stringify(pSeats) === JSON.stringify(contributors);
          });
          
          if (existingPotIndex !== -1) {
              newSidePots[existingPotIndex].amount += chunkAmount;
          } else {
              newSidePots.push({
                  amount: chunkAmount,
                  eligibleSeats: contributors
              });
          }
      }
      
      lastLevel = level;
  });
  
  newState.sidePots = newSidePots;
  
  // Update Total Pot (for display)
  const totalBets = Object.values(newState.bets).reduce((a, b) => a + b, 0);
  newState.pot += totalBets;
  
  // Clear bets
  newState.bets = {};
  newState.currentBet = 0;
  newState.minRaise = state.bigBlind;
  newState.actedSeats = new Set<number>();
  
  // Advance street
  switch (state.street) {
      case 'preflop': newState.street = 'flop'; break;
      case 'flop': newState.street = 'turn'; break;
      case 'turn': newState.street = 'river'; break;
      case 'river': 
          newState.isHandComplete = true;
          // Showdown logic or prompt would happen here or in UI
          return newState;
  }
  
  // Reset action to first active player after button
  const firstActor = getNextSeat(state.buttonPosition, activeSeats, newState.foldedSeats);
  newState.currentActionSeat = firstActor;
  
  newState.isPickingBoard = true;
  
  return newState;
};

export const distributePot = (state: HandState, potResults: { potIndex: number, winnerSeats: number[] }[]): HandState => {
  const newState = { ...state };
  const newSeats = [...state.seats];
  
  potResults.forEach(result => {
      const pot = newState.sidePots[result.potIndex];
      if (!pot) return;
      
      const winAmount = Math.floor(pot.amount / result.winnerSeats.length);
      // Handle remainder? For now, ignore cents/remainder or give to first.
      // Let's just split evenly.
      
      result.winnerSeats.forEach(seatNum => {
          const seatIndex = newSeats.findIndex(s => (s.seatNumber ?? (s.index + 1)) === seatNum);
          if (seatIndex !== -1 && newSeats[seatIndex].player) {
              const player = newSeats[seatIndex].player!;
              newSeats[seatIndex] = {
                  ...newSeats[seatIndex],
                  player: {
                      ...player,
                      stack: (player.stack || 0) + winAmount
                  }
              };
          }
      });
  });
  
  newState.seats = newSeats;
  newState.winners = [...new Set(potResults.flatMap(r => r.winnerSeats))];
  
  return newState;
};

const withRoundCheck = (state: HandState): HandState => {
  if (checkRoundComplete(state)) {
    return advanceStreet(state);
  }
  return state;
};

