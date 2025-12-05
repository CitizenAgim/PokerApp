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
  
  const newRange = { ...range };
  const currentState = range[handId] || 'unselected';
  
  if (currentState === 'manual-selected' || currentState === 'auto-selected') {
    newRange[handId] = 'unselected';
  } else {
    newRange[handId] = 'manual-selected';
  }
  
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
