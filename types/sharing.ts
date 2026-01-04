// ============================================
// RANGE SHARING TYPES & INTERFACES
// ============================================

import { Range } from './poker';

/**
 * Represents a range share between two users.
 * Shares are deleted after accept/decline/dismiss - no status tracking needed.
 */
export interface RangeShare {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  playerName: string;              // Name of the player whose ranges are being shared
  ranges: Record<string, Range>;   // The actual range data (sparse storage)
  rangeKeys: string[];             // List of range keys for preview (e.g., ["early_open-raise", "late_3bet"])
  rangeCount: number;              // Number of defined ranges (for quick display)
  createdAt: number;
}

/**
 * Data required to create a new range share
 */
export type CreateRangeShare = Omit<RangeShare, 'id' | 'createdAt'>;

/**
 * Summary of pending shares per friend (for badges)
 */
export interface PendingSharesSummary {
  friendId: string;
  friendName: string;
  count: number;
}

/**
 * Result of importing ranges to an existing player
 */
export interface ImportRangesResult {
  added: number;      // Number of ranges added (empty slots filled)
  skipped: number;    // Number of ranges skipped (user already has observations)
  rangeKeysAdded: string[];
  rangeKeysSkipped: string[];
}

// Range sharing configuration
export const RANGE_SHARING_CONFIG = {
  MAX_PENDING_SHARES_PER_USER: 20,
} as const;
