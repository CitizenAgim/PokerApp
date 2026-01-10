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

// ============================================
// PLAYER LINKS TYPES & INTERFACES
// ============================================

/**
 * Status of a player link
 * - pending: Link created, waiting for recipient to select their player
 * - active: Both parties have linked players, syncing enabled
 */
export type PlayerLinkStatus = 'pending' | 'active';

/**
 * Represents a bidirectional link between two users' player profiles.
 * When active, both users can sync ranges from each other's linked player.
 * 
 * User A creates the link → User B accepts and selects their player
 * Once active, both can pull updates from the other's player.
 */
export interface PlayerLink {
  id: string;
  status: PlayerLinkStatus;
  
  // User A (link creator)
  userAId: string;
  userAName: string;
  userAPlayerId: string;
  userAPlayerName: string;
  userALastSyncedVersion: number;  // Last version User A synced from User B
  
  // User B (link acceptor)
  userBId: string;
  userBName: string;
  userBPlayerId: string | null;     // Null until accepted
  userBPlayerName: string | null;   // Null until accepted
  userBLastSyncedVersion: number;   // Last version User B synced from User A
  
  createdAt: number;
  acceptedAt: number | null;
}

/**
 * Data required to create a new player link
 */
export interface CreatePlayerLink {
  userAId: string;
  userAName: string;
  userAPlayerId: string;
  userAPlayerName: string;
  userBId: string;
  userBName: string;
}

/**
 * Data required to accept a player link
 */
export interface AcceptPlayerLink {
  userBPlayerId: string;
  userBPlayerName: string;
}

/**
 * Player link with computed properties for the current user's perspective
 */
export interface PlayerLinkView {
  link: PlayerLink;
  isUserA: boolean;               // True if current user is User A (creator)
  myPlayerId: string;
  myPlayerName: string;
  theirUserId: string;
  theirUserName: string;
  theirPlayerId: string | null;
  theirPlayerName: string | null;
  myLastSyncedVersion: number;
  theirRangeVersion: number | null;  // Fetched separately, null if not loaded
  hasUpdates: boolean | null;        // True if theirRangeVersion > myLastSyncedVersion
}

/**
 * Summary of updates available from linked players
 */
export interface LinkUpdatesSummary {
  linkId: string;
  theirPlayerName: string;
  theirUserName: string;
  updatesAvailable: number;  // Number of new range updates (theirVersion - myLastSynced)
}

/**
 * Result of syncing ranges from a linked player
 */
export interface SyncRangesResult {
  added: number;       // Number of ranges added (empty slots filled)
  skipped: number;     // Number of ranges skipped (user already has observations)
  newVersion: number;  // The version that was synced
  rangeKeysAdded: string[];
  rangeKeysSkipped: string[];
}

// Player links configuration
export const PLAYER_LINKS_CONFIG = {
  MAX_LINKS_PER_PLAYER: 250,
  CACHE_TTL_MS: 5 * 60 * 1000,  // 5 minutes
} as const;

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
