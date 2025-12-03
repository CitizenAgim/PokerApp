import { HAND_MAP, HAND_MATRIX } from '@/constants/hands';
import { Hand, Range, RANKS, SelectionState } from '@/types/poker';

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
 * Check if hand1 is "better" than hand2
 * 
 * For same type hands:
 * - Pairs: AA > KK > QQ > ... > 22
 * - Suited/Offsuit with same high card: AKs > AQs > AJs > ...
 * 
 * This is used for auto-selection logic
 */
export function isHandBetter(hand1: Hand, hand2: Hand): boolean {
  // Different types are not directly comparable for auto-selection
  if (hand1.type !== hand2.type) {
    return false;
  }
  
  if (hand1.type === 'pair') {
    // For pairs, lower row index = better (AA is row 0)
    return hand1.row < hand2.row;
  }
  
  // For suited/offsuit hands
  // First compare the high card (row)
  if (hand1.row !== hand2.row) {
    return hand1.row < hand2.row;
  }
  
  // Same high card, compare kicker (col for suited, row for offsuit display)
  // For suited hands (above diagonal): lower col = better kicker
  // For offsuit hands (below diagonal): lower row = better kicker
  if (hand1.type === 'suited') {
    return hand1.col < hand2.col;
  } else {
    // Offsuit: the "kicker" is determined by position in the row
    return hand1.col < hand2.col;
  }
}

// ============================================
// AUTO-SELECTION LOGIC
// ============================================

/**
 * Get all hands that should be auto-selected when a hand is selected
 * 
 * Logic:
 * - If you select K2s, you're saying the player plays K2s
 * - This implies they also play K3s, K4s, K5s... KAs (all better Kx suited)
 * - Similarly for offsuit and pairs
 * 
 * @param selectedHand - The hand that was manually selected
 * @returns Array of hand IDs that should be auto-selected
 */
export function getAutoSelectHands(selectedHand: Hand): string[] {
  const handsToAutoSelect: string[] = [];
  
  if (selectedHand.type === 'pair') {
    // For pairs: select all higher pairs
    // If player plays 77, they likely play 88, 99, TT, JJ, QQ, KK, AA
    for (let row = 0; row < selectedHand.row; row++) {
      const betterPair = HAND_MATRIX[row][row];
      handsToAutoSelect.push(betterPair.id);
    }
  } else if (selectedHand.type === 'suited') {
    // For suited hands: select all better suited hands with same high card
    // If player plays K2s, they likely play K3s, K4s... KAs
    // Suited hands are above diagonal: row < col
    // Same row (high card), iterate through lower columns (better kickers)
    for (let col = selectedHand.row + 1; col < selectedHand.col; col++) {
      const betterSuited = HAND_MATRIX[selectedHand.row][col];
      handsToAutoSelect.push(betterSuited.id);
    }

    // Also select better suited hands with same gap (e.g. 89s -> 9Ts, JTs...)
    let r = selectedHand.row - 1;
    let c = selectedHand.col - 1;
    while (r >= 0 && c >= 0) {
      const betterGapHand = HAND_MATRIX[r][c];
      handsToAutoSelect.push(betterGapHand.id);
      r--;
      c--;
    }
  } else {
    // For offsuit hands: select all better offsuit hands with same high card
    // If player plays K2o, they likely play K3o, K4o... KQo
    // Offsuit hands are below diagonal: row > col
    // Same column (high card in display), iterate through lower rows
    for (let row = selectedHand.col + 1; row < selectedHand.row; row++) {
      const betterOffsuit = HAND_MATRIX[row][selectedHand.col];
      handsToAutoSelect.push(betterOffsuit.id);
    }

    // Also select better offsuit hands with same gap (e.g. 89o -> 9To, JTo...)
    let r = selectedHand.row - 1;
    let c = selectedHand.col - 1;
    while (r >= 0 && c >= 0) {
      // Offsuit hands are below diagonal, so we need to check bounds carefully
      // But since we decrement both, we move up the diagonal parallel to main diagonal
      // Just need to ensure we don't cross into suited territory (which shouldn't happen if we start offsuit)
      // Actually, offsuit is row > col. If we decrement both, row > col is maintained.
      // Until c < 0.
      const betterGapHand = HAND_MATRIX[r][c];
      handsToAutoSelect.push(betterGapHand.id);
      r--;
      c--;
    }
  }
  
  return handsToAutoSelect;
}

/**
 * Get all hands that should be auto-deselected when a hand is deselected
 * 
 * Inverse of auto-select:
 * - If you deselect K5s, all worse hands (K4s, K3s, K2s) should also be deselected
 */
export function getAutoDeselectHands(deselectedHand: Hand): string[] {
  const handsToAutoDeselect: string[] = [];
  
  if (deselectedHand.type === 'pair') {
    // Deselect all lower pairs
    for (let row = deselectedHand.row + 1; row < 13; row++) {
      const worsePair = HAND_MATRIX[row][row];
      handsToAutoDeselect.push(worsePair.id);
    }
  } else if (deselectedHand.type === 'suited') {
    // Deselect all worse suited hands with same high card
    for (let col = deselectedHand.col + 1; col < 13; col++) {
      const worseSuited = HAND_MATRIX[deselectedHand.row][col];
      handsToAutoDeselect.push(worseSuited.id);
    }

    // Also deselect worse suited hands with same gap (e.g. 9Ts -> 89s, 78s...)
    let r = deselectedHand.row + 1;
    let c = deselectedHand.col + 1;
    while (r < 13 && c < 13) {
      const worseGapHand = HAND_MATRIX[r][c];
      handsToAutoDeselect.push(worseGapHand.id);
      r++;
      c++;
    }
  } else {
    // Deselect all worse offsuit hands with same high card
    for (let row = deselectedHand.row + 1; row < 13; row++) {
      const worseOffsuit = HAND_MATRIX[row][deselectedHand.col];
      handsToAutoDeselect.push(worseOffsuit.id);
    }

    // Also deselect worse offsuit hands with same gap (e.g. 9To -> 89o, 78o...)
    let r = deselectedHand.row + 1;
    let c = deselectedHand.col + 1;
    while (r < 13 && c < 13) {
      const worseGapHand = HAND_MATRIX[r][c];
      handsToAutoDeselect.push(worseGapHand.id);
      r++;
      c++;
    }
  }
  
  return handsToAutoDeselect;
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
 * Toggle a hand in the range with auto-selection logic
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
  
  if (currentState === 'unselected' || currentState === 'manual-unselected') {
    // Selecting the hand
    newRange[handId] = 'manual-selected';
    
    // Auto-select better hands
    const autoSelectHands = getAutoSelectHands(hand);
    autoSelectHands.forEach(id => {
      const state = newRange[id];
      if (state === 'unselected') {
        newRange[id] = 'auto-selected';
      }
      // Don't change manual-selected or manual-unselected
    });
  } else {
    // Deselecting the hand
    if (currentState === 'auto-selected') {
      // If it was auto-selected, mark as manually unselected
      newRange[handId] = 'manual-unselected';
    } else {
      // If it was manual-selected, just unselect
      newRange[handId] = 'unselected';
      
      // Auto-deselect worse hands that were auto-selected
      const autoDeselectHands = getAutoDeselectHands(hand);
      autoDeselectHands.forEach(id => {
        if (newRange[id] === 'auto-selected') {
          newRange[id] = 'unselected';
        }
      });
    }
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
