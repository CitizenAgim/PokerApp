// ============================================
// POKER TYPES & INTERFACES
// ============================================

// Card ranks from highest to lowest
export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

// All ranks in order (index = ranking, 0 = highest)
export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// Hand types
export type HandType = 'pair' | 'suited' | 'offsuit';

// Represents a single starting hand in the 13x13 matrix
export interface Hand {
  id: string;          // e.g., "AKs", "QQ", "T9o"
  rank1: Rank;         // Higher or equal rank
  rank2: Rank;         // Lower or equal rank
  type: HandType;
  row: number;         // 0-12 (A=0, K=1, ... 2=12)
  col: number;         // 0-12
}

// Selection states for hands in a range
export type SelectionState = 
  | 'unselected'        // Not in range
  | 'auto-selected'     // Automatically selected (implied by a worse hand)
  | 'manual-selected'   // Manually selected by user
  | 'manual-unselected'; // Manually removed from auto-selection

// A range is a mapping of hand IDs to their selection state
export type Range = Record<string, SelectionState>;

// ============================================
// POSITION & ACTION TYPES
// ============================================

export type Position = 'early' | 'middle' | 'late' | 'blinds';

export type Action = 
  | 'open-raise'   // First to raise
  | 'call'         // Calling an open
  | '3bet'         // Re-raising an open
  | 'call-3bet'    // Calling a 3-bet
  | '4bet';        // Re-raising a 3-bet

export interface RangeCategory {
  position: Position;
  action: Action;
}

// All position-action combinations
export const RANGE_CATEGORIES: RangeCategory[] = [
  { position: 'early', action: 'open-raise' },
  { position: 'early', action: 'call' },
  { position: 'early', action: '3bet' },
  { position: 'middle', action: 'open-raise' },
  { position: 'middle', action: 'call' },
  { position: 'middle', action: '3bet' },
  { position: 'late', action: 'open-raise' },
  { position: 'late', action: 'call' },
  { position: 'late', action: '3bet' },
  { position: 'blinds', action: 'call' },
  { position: 'blinds', action: '3bet' },
];

// Helper to create range key from position and action
export function getRangeKey(position: Position, action: Action): string {
  return `${position}_${action}`;
}

// ============================================
// PLAYER TYPES
// ============================================

export interface NoteEntry {
  id: string;
  content: string;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
  photoUrl?: string;
  color?: string;         // Hex color code for player categorization
  notes?: string; // Deprecated, kept for backward compatibility
  notesList?: NoteEntry[];
  createdAt: number;      // Unix timestamp
  updatedAt: number;      // Unix timestamp
  createdBy: string;      // User ID who created this player
}

export interface PlayerRanges {
  playerId: string;
  ranges: Record<string, Range>;  // Key: "position_action"
  lastObserved: number;           // Unix timestamp
  handsObserved: number;          // Total hands observed
}

// ============================================
// SESSION & TABLE TYPES
// ============================================

export interface Session {
  id: string;
  name: string;
  location?: string;
  gameType?: string;      // e.g., "Texas Holdem", "PLO"
  smallBlind?: number;
  bigBlind?: number;
  thirdBlind?: number;
  ante?: number;
  buyIn?: number;
  currency?: string;      // e.g., "USD", "EUR", "GBP"
  cashOut?: number;       // Amount cashed out
  stakes?: string;        // e.g., "1/2", "2/5" (Derived or legacy)
  startTime: number;      // Unix timestamp
  endTime?: number;       // Unix timestamp
  duration?: number;      // Duration in minutes
  isActive: boolean;
  createdBy: string;      // User ID
  table?: Table;
}

export interface TablePlayer {
  id: string;
  name: string;
  photoUrl?: string;
  color?: string;
  isTemp: boolean; // True if the player is not saved to the global database
  stack?: number;
}

export interface Seat {
  index: number;       // 0-8
  seatNumber?: number; // 1-9
  player?: TablePlayer | null;
  playerId?: string | null;
}

export interface TableState {
  seats: Seat[];       // Fixed array of 9 seats
  heroSeatIndex: number; // Default to 4 (bottom center)
}

export interface Table {
  sessionId: string;
  buttonPosition: number; // Seat number with the button (1-9)
  seats: Seat[];          // Array of 9 seats
}

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  createdAt: number;      // Unix timestamp
}

// ============================================
// UTILITY TYPES
// ============================================

// For creating new entities (without id and timestamps)
export type CreatePlayer = Omit<Player, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateSession = Omit<Session, 'id' | 'startTime' | 'endTime' | 'isActive'>;

// For updating entities (all fields optional except id)
export type UpdatePlayer = Partial<Omit<Player, 'id' | 'createdAt' | 'createdBy'>> & { id: string };

// ============================================
// HAND RECORDING TYPES
// ============================================

export interface HandAction {
  playerId: string;
  type: 'bet' | 'call' | 'raise' | 'fold' | 'check';
  amount?: number;
  street: 'preflop' | 'flop' | 'turn' | 'river';
}

export interface HandRecord {
  id: string;
  sessionId?: string;
  timestamp: number;
  buttonPosition: number;
  seats: Seat[];
  board: string[];
  pot: number;
  actions: HandAction[];
  winners: string[];
  notes?: string;
}
