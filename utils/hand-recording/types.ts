import { Seat } from '@/types/poker';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export interface SidePot {
  amount: number;
  eligibleSeats: number[];
}

export interface HandAction {
  seatNumber: number;
  type: 'bet' | 'call' | 'check' | 'fold' | 'post-blind' | 'win';
  amount?: number;
  street: Street;
  timestamp: number;
}

export interface HandState {
  seats: Seat[];
  bets: Record<number, number>;
  pot: number;
  sidePots: SidePot[];
  street: Street;
  currentActionSeat: number | null;
  currentBet: number;
  minRaise: number;
  foldedSeats: Set<number>;
  handCards: Record<number, string[]>;
  communityCards: string[];
  buttonPosition: number;
  heroSeat?: number; // Seat number of the hero
  isHandStarted: boolean;
  activeCardSeat: number | null;
  isPickingBoard: boolean;
  straddleCount: number;
  isMississippiActive: boolean;
  smallBlind: number;
  bigBlind: number;
  actedSeats: Set<number>;
  actions: HandAction[];
  isHandComplete: boolean;
  winners: number[]; // Seat numbers of winners
}
