import { Hand, HandType, Rank, RANKS } from '@/types/poker';

// ============================================
// HAND MATRIX GENERATION
// ============================================

/**
 * Generates the 13x13 hand matrix
 * - Diagonal: Pocket pairs (AA, KK, QQ, ...)
 * - Above diagonal: Suited hands (AKs, AQs, ...)
 * - Below diagonal: Offsuit hands (AKo, AQo, ...)
 */
function generateHandMatrix(): Hand[][] {
  const matrix: Hand[][] = [];

  for (let row = 0; row < 13; row++) {
    const rowHands: Hand[] = [];
    
    for (let col = 0; col < 13; col++) {
      const rank1 = RANKS[row];  // Row rank (first card shown in row header)
      const rank2 = RANKS[col];  // Col rank (second card shown in col header)
      
      let type: HandType;
      let id: string;
      
      if (row === col) {
        // Diagonal = pocket pairs
        type = 'pair';
        id = `${rank1}${rank2}`;
      } else if (col > row) {
        // Above diagonal = suited (higher rank first)
        type = 'suited';
        id = `${rank1}${rank2}s`;
      } else {
        // Below diagonal = offsuit (higher rank first, which is rank2 since col < row)
        type = 'offsuit';
        id = `${rank2}${rank1}o`;
      }
      
      rowHands.push({
        id,
        rank1: row <= col ? rank1 : rank2,
        rank2: row <= col ? rank2 : rank1,
        type,
        row,
        col,
      });
    }
    
    matrix.push(rowHands);
  }
  
  return matrix;
}

// Pre-generated 13x13 matrix
export const HAND_MATRIX: Hand[][] = generateHandMatrix();

// Flat list of all 169 unique hands
export const ALL_HANDS: Hand[] = HAND_MATRIX.flat();

// Map for quick hand lookup by ID
export const HAND_MAP: Record<string, Hand> = ALL_HANDS.reduce((acc, hand) => {
  acc[hand.id] = hand;
  return acc;
}, {} as Record<string, Hand>);

// ============================================
// HAND DISPLAY HELPERS
// ============================================

/**
 * Get display label for a hand cell
 * For the grid, we display:
 * - Pairs: "AA", "KK", etc.
 * - Suited: "AKs", "AQs", etc.
 * - Offsuit: "AKo", "AQo", etc.
 */
export function getHandLabel(row: number, col: number): string {
  const hand = HAND_MATRIX[row][col];
  return hand.id;
}

/**
 * Get the hand at a specific grid position
 */
export function getHandAt(row: number, col: number): Hand {
  return HAND_MATRIX[row][col];
}

/**
 * Get hand by ID
 */
export function getHandById(id: string): Hand | undefined {
  return HAND_MAP[id];
}

// ============================================
// HAND CATEGORIZATION
// ============================================

// Premium hands (top tier)
export const PREMIUM_HANDS = ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo'];

// Strong hands
export const STRONG_HANDS = ['TT', '99', 'AQs', 'AQo', 'AJs', 'KQs'];

// Get all pocket pairs
export function getPocketPairs(): Hand[] {
  return ALL_HANDS.filter(h => h.type === 'pair');
}

// Get all suited hands
export function getSuitedHands(): Hand[] {
  return ALL_HANDS.filter(h => h.type === 'suited');
}

// Get all offsuit hands
export function getOffsuitHands(): Hand[] {
  return ALL_HANDS.filter(h => h.type === 'offsuit');
}

// Get all hands of a specific high card (e.g., all Ax hands)
export function getHandsWithHighCard(rank: Rank): Hand[] {
  const rankIndex = RANKS.indexOf(rank);
  return ALL_HANDS.filter(h => h.row === rankIndex || h.col === rankIndex);
}

// ============================================
// GRID LABELS
// ============================================

// Row/Column headers for the grid
export const GRID_HEADERS: Rank[] = RANKS;

// Get row header (left side of grid)
export function getRowHeader(row: number): Rank {
  return RANKS[row];
}

// Get column header (top of grid)
export function getColumnHeader(col: number): Rank {
  return RANKS[col];
}
