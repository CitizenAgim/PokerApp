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
 * User-scoped player link stored in /users/{userId}/playerLinks/{linkId}
 * Each link is stored in BOTH users' subcollections for fast queries.
 * Uses perspective-based fields (myPlayer, theirPlayer) instead of userA/userB.
 */
export interface UserPlayerLink {
  id: string;
  status: PlayerLinkStatus;
  
  // Perspective flag
  isInitiator: boolean;              // true if this user created the link
  
  // My side (the user whose subcollection this is in)
  myPlayerId: string | null;         // null for pending links received
  myPlayerName: string | null;
  myLastSyncedVersion: number;
  
  // Their side (the linked friend)
  theirUserId: string;
  theirUserName: string;
  theirPlayerId: string | null;      // null for pending links sent
  theirPlayerName: string | null;
  
  // Timestamps
  createdAt: number;
  acceptedAt: number | null;
}

/**
 * @deprecated Use UserPlayerLink instead. Kept for backwards compatibility.
 * 
 * Represents a bidirectional link between two users' player profiles.
 * When active, both users can sync ranges from each other's linked player.
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
  initiatorUserId: string;
  initiatorUserName: string;
  initiatorPlayerId: string;
  initiatorPlayerName: string;
  recipientUserId: string;
  recipientUserName: string;
}

/**
 * Data required to accept a player link
 */
export interface AcceptPlayerLink {
  recipientPlayerId: string;
  recipientPlayerName: string;
}

/**
 * Player link with computed properties for the current user's perspective
 * @deprecated Use UserPlayerLink directly instead
 */
export interface PlayerLinkView {
  link: UserPlayerLink;
  isInitiator: boolean;           // True if current user created the link
  myPlayerId: string | null;
  myPlayerName: string | null;
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
  MAX_LINKS_PER_USER: 100,              // Maximum links per user (reduced from 250)
  CACHE_TTL_MS: 5 * 60 * 1000,          // 5 minutes cache for version checks
  UPDATE_CHECK_BATCH_SIZE: 10,          // Batch size for parallel update checks
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
