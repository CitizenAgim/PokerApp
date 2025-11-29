import { Position } from '@/types/poker';

// ============================================
// POSITION DEFINITIONS
// ============================================

export interface PositionInfo {
  id: Position;
  name: string;
  shortName: string;
  color: string;
  description: string;
}

export const POSITIONS: Record<Position, PositionInfo> = {
  early: {
    id: 'early',
    name: 'Early Position',
    shortName: 'EP',
    color: '#e74c3c', // Red - tightest range
    description: 'UTG, UTG+1, UTG+2 - Play tight, many players to act behind',
  },
  middle: {
    id: 'middle',
    name: 'Middle Position',
    shortName: 'MP',
    color: '#f39c12', // Orange - medium range
    description: 'MP, MP+1 - Slightly wider range than early position',
  },
  late: {
    id: 'late',
    name: 'Late Position',
    shortName: 'LP',
    color: '#27ae60', // Green - widest range
    description: 'HJ, CO, BTN - Widest ranges, positional advantage',
  },
  blinds: {
    id: 'blinds',
    name: 'Blinds',
    shortName: 'BL',
    color: '#3498db', // Blue - defensive
    description: 'SB, BB - Defending ranges, already invested',
  },
};

// ============================================
// 9-HANDED SEAT POSITIONS
// ============================================

export interface SeatPosition {
  seat: number;        // 1-9
  name: string;        // Full name
  shortName: string;   // Abbreviation
  category: Position;  // Which category it falls into
}

/**
 * Get seat positions relative to button
 * Button is always seat 1 in this mapping
 */
export const SEAT_POSITIONS: SeatPosition[] = [
  { seat: 1, name: 'Button', shortName: 'BTN', category: 'late' },
  { seat: 2, name: 'Small Blind', shortName: 'SB', category: 'blinds' },
  { seat: 3, name: 'Big Blind', shortName: 'BB', category: 'blinds' },
  { seat: 4, name: 'Under the Gun', shortName: 'UTG', category: 'early' },
  { seat: 5, name: 'UTG+1', shortName: 'UTG+1', category: 'early' },
  { seat: 6, name: 'UTG+2', shortName: 'UTG+2', category: 'early' },
  { seat: 7, name: 'Middle Position', shortName: 'MP', category: 'middle' },
  { seat: 8, name: 'Hijack', shortName: 'HJ', category: 'middle' },
  { seat: 9, name: 'Cutoff', shortName: 'CO', category: 'late' },
];

// ============================================
// POSITION CALCULATION
// ============================================

/**
 * Calculate the position category for a seat based on button location
 * 
 * @param seatNumber - The seat number (1-9)
 * @param buttonSeat - The seat with the button (1-9)
 * @param totalSeats - Total seats at table (default 9)
 * @returns Position category
 */
export function calculatePosition(
  seatNumber: number,
  buttonSeat: number,
  totalSeats: number = 9
): Position {
  // Calculate positions clockwise from button
  const positionsFromButton = ((seatNumber - buttonSeat) % totalSeats + totalSeats) % totalSeats;
  
  // 9-handed position mapping:
  // 0 = Button (late)
  // 1 = SB (blinds)
  // 2 = BB (blinds)
  // 3 = UTG (early)
  // 4 = UTG+1 (early)
  // 5 = UTG+2 (early)
  // 6 = MP (middle)
  // 7 = HJ (middle)
  // 8 = CO (late)
  
  if (positionsFromButton === 0) return 'late';     // Button
  if (positionsFromButton <= 2) return 'blinds';    // SB, BB
  if (positionsFromButton <= 5) return 'early';     // UTG, UTG+1, UTG+2
  if (positionsFromButton <= 7) return 'middle';    // MP, HJ
  return 'late';                                     // CO
}

/**
 * Get the position name for a seat based on button location
 */
export function getPositionName(
  seatNumber: number,
  buttonSeat: number,
  totalSeats: number = 9
): string {
  const positionsFromButton = ((seatNumber - buttonSeat) % totalSeats + totalSeats) % totalSeats;
  
  const positionNames = [
    'Button',
    'Small Blind',
    'Big Blind',
    'UTG',
    'UTG+1',
    'UTG+2',
    'MP',
    'Hijack',
    'Cutoff',
  ];
  
  return positionNames[positionsFromButton] || 'Unknown';
}

/**
 * Get short position name
 */
export function getPositionShortName(
  seatNumber: number,
  buttonSeat: number,
  totalSeats: number = 9
): string {
  const positionsFromButton = ((seatNumber - buttonSeat) % totalSeats + totalSeats) % totalSeats;
  
  const shortNames = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO'];
  
  return shortNames[positionsFromButton] || '?';
}

// ============================================
// POSITION COLORS FOR UI
// ============================================

export function getPositionColor(position: Position): string {
  return POSITIONS[position].color;
}

// ============================================
// FEWER PLAYERS ADJUSTMENTS
// ============================================

/**
 * Adjust positions for tables with fewer than 9 players
 * Removes early positions first as table gets shorter
 */
export function getActivePositions(playerCount: number): Position[] {
  if (playerCount >= 7) {
    return ['early', 'middle', 'late', 'blinds'];
  } else if (playerCount >= 5) {
    return ['middle', 'late', 'blinds'];
  } else {
    return ['late', 'blinds'];
  }
}
