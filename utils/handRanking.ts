import { HAND_MAP, HAND_MATRIX } from '@/constants/hands';
import { Range, RANKS, SelectionState } from '@/types/poker';

// ============================================
// HAND RANKING & COMPARISON
// ============================================

/**
 * Get the rank index (0 = A, 12 = 2)
 * Lower index = higher rank
 */
export function getRankIndex(rank: string): number {
  return RANKS.indexOf(rank as typeof RANKS[number]);
}

/**
 * Compare two ranks
 * Returns negative if rank1 > rank2, positive if rank1 < rank2, 0 if equal
 */
export function compareRanks(rank1: string, rank2: string): number {
  return getRankIndex(rank1) - getRankIndex(rank2);
}

/**
 * Get all hands that are "better" than the given hand
 * - Pairs: Higher pairs (e.g. 88 -> 99, TT...)
 * - Suited: Same high card, higher kicker (e.g. A8s -> A9s, ATs...)
 * - Offsuit: Same high card, higher kicker (e.g. A8o -> A9o, ATo...)
 */
export function getBetterHands(handId: string): string[] {
  const hand = HAND_MAP[handId];
  if (!hand) return [];

  const betterHands: string[] = [];
  const { rank1, rank2, type } = hand;
  const rank1Idx = getRankIndex(rank1);
  const rank2Idx = getRankIndex(rank2);

  if (type === 'pair') {
    // For pairs, any pair with higher rank is better
    // rank1Idx is the index (0=A, 12=2). Lower index is better.
    // We want pairs with index < rank1Idx
    for (let i = 0; i < rank1Idx; i++) {
      const rank = RANKS[i];
      betterHands.push(`${rank}${rank}`);
    }
  } else {
    // For non-pairs, we want same high card (rank1), but better kicker (rank2)
    // Better kicker means lower index than rank2Idx
    // But kicker must still be lower than rank1 (otherwise it becomes a pair or swaps order)
    // Actually, rank1 is always the high card.
    // So we iterate rank2 from rank2Idx-1 down to rank1Idx+1
    for (let i = rank2Idx - 1; i > rank1Idx; i--) {
      const kicker = RANKS[i];
      betterHands.push(`${rank1}${kicker}${type === 'suited' ? 's' : 'o'}`);
    }
  }

  return betterHands;
}

/**
 * Update auto-selected hands based on manual selections
 */
export function updateAutoSelections(range: Range): Range {
  const newRange = { ...range };
  
  // 1. Reset all auto-selected hands to unselected
  // We preserve manual-selected and manual-unselected
  Object.keys(newRange).forEach(id => {
    if (newRange[id] === 'auto-selected') {
      delete newRange[id]; // or 'unselected'
    }
  });

  // 2. Find all manual-selected hands
  const manualHands = Object.entries(newRange)
    .filter(([_, state]) => state === 'manual-selected')
    .map(([id]) => id);

  // 3. Propagate to better hands
  manualHands.forEach(handId => {
    const betterHands = getBetterHands(handId);
    betterHands.forEach(betterId => {
      // Only update if not manually set
      if (!newRange[betterId] || newRange[betterId] === 'unselected') {
        newRange[betterId] = 'auto-selected';
      }
    });
  });

  return newRange;
}

// ============================================
// RANGE MANIPULATION
// ============================================

/**
 * Create an empty range (all hands unselected)
 */
export function createEmptyRange(): Range {
  const range: Range = {};
  HAND_MATRIX.flat().forEach(hand => {
    range[hand.id] = 'unselected';
  });
  return range;
}

/**
 * Toggle a hand in the range (simple toggle, no auto-selection)
 * 
 * @param range - Current range state
 * @param handId - Hand to toggle
 * @returns New range state
 */
export function toggleHandInRange(range: Range, handId: string): Range {
  const hand = HAND_MAP[handId];
  if (!hand) return range;
  
  let newRange = { ...range };
  const currentState = range[handId] || 'unselected';
  
  // State transitions:
  // Unselected -> Manual-Selected
  // Manual-Selected -> Unselected
  // Auto-Selected -> Manual-Unselected
  // Manual-Unselected -> Manual-Selected
  
  if (currentState === 'manual-selected') {
    newRange[handId] = 'unselected';
  } else if (currentState === 'auto-selected') {
    newRange[handId] = 'manual-unselected';
  } else if (currentState === 'manual-unselected') {
    newRange[handId] = 'manual-selected';
  } else {
    newRange[handId] = 'manual-selected';
  }
  
  // After state change, re-calculate auto-selections
  newRange = updateAutoSelections(newRange);
  
  return newRange;
}

/**
 * Check if a hand is selected (either manually or auto)
 */
export function isHandSelected(range: Range, handId: string): boolean {
  const state = range[handId];
  return state === 'manual-selected' || state === 'auto-selected';
}

/**
 * Get the selection state of a hand
 */
export function getHandState(range: Range, handId: string): SelectionState {
  return range[handId] || 'unselected';
}

/**
 * Count selected hands in a range
 */
export function countSelectedHands(range: Range): number {
  return Object.values(range).filter(
    state => state === 'manual-selected' || state === 'auto-selected'
  ).length;
}

/**
 * Count selected combos in a range (weighted)
 */
export function countSelectedCombos(range: Range): number {
  let combos = 0;
  Object.entries(range).forEach(([handId, state]) => {
    if (state === 'manual-selected' || state === 'auto-selected') {
      const hand = HAND_MAP[handId];
      if (hand) {
        combos += hand.type === 'pair' ? 6 : hand.type === 'suited' ? 4 : 12;
      }
    }
  });
  return combos;
}

/**
 * Calculate percentage of hands selected (weighted by combos)
 * Returns a number with 1 decimal place (e.g. 15.4)
 */
export function getSelectionPercentage(range: Range): number {
  const combos = countSelectedCombos(range);
  // Total combos = 1326
  return Math.round((combos / 1326) * 1000) / 10;
}

// ============================================
// RANGE PRESETS
// ============================================

/**
 * Create a range from a list of hand IDs
 */
export function createRangeFromHands(handIds: string[]): Range {
  const range = createEmptyRange();
  
  handIds.forEach(id => {
    const hand = HAND_MAP[id];
    if (hand) {
      range[id] = 'manual-selected';
    }
  });
  
  return range;
}

/**
 * Get all selected hand IDs from a range
 */
export function getSelectedHandIds(range: Range): string[] {
  return Object.entries(range)
    .filter(([_, state]) => state === 'manual-selected' || state === 'auto-selected')
    .map(([id]) => id);
}

/**
 * Common presets for reference
 */
export const RANGE_PRESETS = {
  // Very tight range (~5%)
  ultraTight: ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo'],
  
  // Tight range (~10%)
  tight: ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'KQs'],
  
  // Standard opening range (~15%)
  standard: [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
    'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs',
    'KQs', 'KQo', 'KJs', 'QJs', 'JTs',
  ],
  
  // Loose range (~25%)
  loose: [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66',
    'AKs', 'AKo', 'AQs', 'AQo', 'AJs', 'AJo', 'ATs', 'ATo', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'KQs', 'KQo', 'KJs', 'KJo', 'KTs', 'K9s',
    'QJs', 'QJo', 'QTs', 'Q9s',
    'JTs', 'JTo', 'J9s',
    'T9s', 'T8s',
    '98s', '87s', '76s', '65s', '54s',
  ],
};
