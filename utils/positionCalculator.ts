import { Position } from '@/types/poker';

// ============================================
// POSITION CALCULATOR
// ============================================

/**
 * Calculate the position for a given seat based on button position
 * 
 * 9-handed table positions:
 * - Button (BTN): The dealer position
 * - Small Blind (SB): 1 seat left of button
 * - Big Blind (BB): 2 seats left of button
 * - UTG (Under the Gun): 3 seats left of button
 * - UTG+1: 4 seats left of button
 * - UTG+2: 5 seats left of button
 * - MP (Middle Position): 6 seats left of button
 * - MP+1: 7 seats left of button  
 * - CO (Cutoff): 8 seats left of button (1 right of button)
 */
export function calculatePosition(
  seatNumber: number,
  buttonSeat: number,
  totalSeats: number = 9
): Position {
  // Calculate how many seats away from the button (clockwise)
  const seatsFromButton = (seatNumber - buttonSeat + totalSeats) % totalSeats;
  
  // Map seat position to Position type
  // Button is seat 0 relative
  // SB is 1, BB is 2
  // UTG, UTG+1, UTG+2 are 3,4,5 (early)
  // MP, MP+1 are 6,7 (middle)
  // CO is 8 (late)
  
  if (seatsFromButton === 0) {
    // Button - Late position
    return 'late';
  } else if (seatsFromButton === 1 || seatsFromButton === 2) {
    // Small Blind or Big Blind
    return 'blinds';
  } else if (seatsFromButton >= 3 && seatsFromButton <= 5) {
    // UTG, UTG+1, UTG+2 - Early position
    return 'early';
  } else if (seatsFromButton === 6 || seatsFromButton === 7) {
    // MP, MP+1 - Middle position
    return 'middle';
  } else {
    // CO - Late position (also includes HJ in some interpretations)
    return 'late';
  }
}

/**
 * Get the detailed position name for display
 */
export function getPositionName(
  seatNumber: number,
  buttonSeat: number,
  totalSeats: number = 9
): string {
  const seatsFromButton = (seatNumber - buttonSeat + totalSeats) % totalSeats;
  
  const positionNames: Record<number, string> = {
    0: 'BTN',
    1: 'SB',
    2: 'BB',
    3: 'UTG',
    4: 'UTG+1',
    5: 'UTG+2',
    6: 'MP',
    7: 'HJ',
    8: 'CO',
  };
  
  return positionNames[seatsFromButton] || `Seat ${seatNumber}`;
}

/**
 * Get color for position (for UI)
 */
export function getPositionColor(position: Position): string {
  const colors: Record<Position, string> = {
    early: '#e74c3c',    // Red - tightest
    middle: '#f39c12',   // Orange - medium
    late: '#27ae60',     // Green - loosest
    blinds: '#3498db',   // Blue - special
  };
  
  return colors[position];
}

/**
 * Get position description
 */
export function getPositionDescription(position: Position): string {
  const descriptions: Record<Position, string> = {
    early: 'UTG, UTG+1, UTG+2 - Play tight, many players left to act',
    middle: 'MP, HJ - Medium range, balanced approach',
    late: 'CO, BTN - Wide range, positional advantage',
    blinds: 'SB, BB - Forced bets, defend or 3-bet',
  };
  
  return descriptions[position];
}

/**
 * Get all seats for a position
 */
export function getSeatsForPosition(
  buttonSeat: number,
  position: Position,
  totalSeats: number = 9
): number[] {
  const seats: number[] = [];
  
  for (let i = 1; i <= totalSeats; i++) {
    if (calculatePosition(i, buttonSeat, totalSeats) === position) {
      seats.push(i);
    }
  }
  
  return seats;
}
