/**
 * Firebase Players Service - Subcollection Structure
 * Path: /users/{userId}/players/{playerId}
 * 
 * Players are stored as subcollections under each user for:
 * - Automatic scoping (no need to filter by createdBy)
 * - Simpler security rules (path-based)
 * - Better cost efficiency at scale
 * - Easy sharing support via isShared flag
 */

import { db } from '@/config/firebase';
import { CreatePlayer, NoteEntry, Player, Range, UpdatePlayer } from '@/types/poker';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

// ============================================
// COLLECTION HELPERS
// ============================================

/**
 * Get the players collection reference for a user
 */
function getPlayersCollection(userId: string) {
  return collection(db, 'users', userId, 'players');
}

/**
 * Get a player document reference
 */
function getPlayerDoc(userId: string, playerId: string) {
  return doc(db, 'users', userId, 'players', playerId);
}

// ============================================
// TYPE CONVERTERS
// ============================================

interface FirestorePlayer {
  name: string;
  color?: string;
  locations?: string[];
  notes?: string;
  notesList?: NoteEntry[];
  ranges?: Record<string, Range>;  // Embedded ranges
  isShared?: boolean;              // Sharing flag
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function toPlayer(id: string, data: FirestorePlayer): Player & { ranges?: Record<string, Range>; isShared?: boolean } {
  return {
    id,
    name: data.name,
    color: data.color,
    locations: data.locations || [],
    notes: data.notes,
    notesList: data.notesList || [],
    ranges: data.ranges || {},
    isShared: data.isShared || false,
    createdBy: '', // Not needed in subcollection model - derived from path
    createdAt: data.createdAt?.toMillis() || Date.now(),
    updatedAt: data.updatedAt?.toMillis() || Date.now(),
  };
}

function toFirestoreData(player: CreatePlayer | UpdatePlayer): Partial<FirestorePlayer> {
  const data: Record<string, unknown> = {};
  
  if ('name' in player && player.name !== undefined) data.name = player.name;
  if ('color' in player && player.color !== undefined) data.color = player.color;
  if ('locations' in player && player.locations !== undefined) data.locations = player.locations;
  if ('notes' in player && player.notes !== undefined) data.notes = player.notes;
  if ('notesList' in player && player.notesList !== undefined) data.notesList = player.notesList;
  
  return data as Partial<FirestorePlayer>;
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all players for a user
 */
export async function getPlayers(userId: string): Promise<(Player & { ranges?: Record<string, Range>; isShared?: boolean })[]> {
  if (!userId) return [];
  
  try {
    const playersRef = getPlayersCollection(userId);
    const q = query(playersRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => 
      toPlayer(doc.id, doc.data() as FirestorePlayer)
    );
  } catch (error) {
    console.error('Error fetching players:', error);
    return [];
  }
}

/**
 * Get a single player by ID
 */
export async function getPlayer(
  userId: string, 
  playerId: string
): Promise<(Player & { ranges?: Record<string, Range>; isShared?: boolean }) | null> {
  try {
    const playerDoc = await getDoc(getPlayerDoc(userId, playerId));
    
    if (!playerDoc.exists()) {
      return null;
    }
    
    return toPlayer(playerDoc.id, playerDoc.data() as FirestorePlayer);
  } catch (error) {
    console.error('Error fetching player:', error);
    throw error;
  }
}

/**
 * Create a new player
 */
export async function createPlayer(
  userId: string,
  player: CreatePlayer,
  playerId?: string
): Promise<Player & { ranges?: Record<string, Range>; isShared?: boolean }> {
  try {
    const playersRef = getPlayersCollection(userId);
    const id = playerId || doc(playersRef).id;
    const playerRef = getPlayerDoc(userId, id);
    
    const data = {
      ...toFirestoreData(player),
      ranges: {},           // Initialize empty ranges
      isShared: false,      // Default to not shared
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(playerRef, data);
    
    return {
      id,
      name: player.name,
      color: player.color,
      notesList: player.notesList || [],
      ranges: {},
      isShared: false,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('Error creating player:', error);
    throw error;
  }
}

/**
 * Update an existing player
 */
export async function updatePlayer(
  userId: string,
  player: UpdatePlayer
): Promise<void> {
  try {
    const playerRef = getPlayerDoc(userId, player.id);
    
    const data = {
      ...toFirestoreData(player),
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(playerRef, data);
  } catch (error) {
    console.error('Error updating player:', error);
    throw error;
  }
}

/**
 * Delete a player
 */
export async function deletePlayer(userId: string, playerId: string): Promise<void> {
  try {
    await deleteDoc(getPlayerDoc(userId, playerId));
  } catch (error) {
    console.error('Error deleting player:', error);
    throw error;
  }
}

// ============================================
// RANGES OPERATIONS (embedded in player doc)
// ============================================

/**
 * Sanitize a range for storage (sparse storage optimization)
 * Removes all 'unselected' keys to reduce document size by ~85%
 */
function sanitizeRangeForStorage(range: Range): Range {
  const sanitized: Range = {};
  
  for (const [hand, state] of Object.entries(range)) {
    // Only store non-unselected hands (sparse storage)
    if (state !== 'unselected') {
      sanitized[hand] = state;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize all ranges for storage
 */
function sanitizeRangesForStorage(ranges: Record<string, Range>): Record<string, Range> {
  const sanitized: Record<string, Range> = {};
  
  for (const [key, range] of Object.entries(ranges)) {
    sanitized[key] = sanitizeRangeForStorage(range);
  }
  
  return sanitized;
}

/**
 * Update all ranges for a player
 */
export async function updatePlayerRanges(
  userId: string,
  playerId: string,
  ranges: Record<string, Range>
): Promise<void> {
  try {
    const playerRef = getPlayerDoc(userId, playerId);
    
    // Sanitize ranges before saving (sparse storage optimization)
    const sanitizedRanges = sanitizeRangesForStorage(ranges);
    
    await updateDoc(playerRef, {
      ranges: sanitizedRanges,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating player ranges:', error);
    throw error;
  }
}

/**
 * Update a specific range for a player
 */
export async function updatePlayerRange(
  userId: string,
  playerId: string,
  rangeKey: string,
  range: Range
): Promise<void> {
  try {
    const playerRef = getPlayerDoc(userId, playerId);
    
    // Sanitize range before saving (sparse storage optimization)
    const sanitizedRange = sanitizeRangeForStorage(range);
    
    await updateDoc(playerRef, {
      [`ranges.${rangeKey}`]: sanitizedRange,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating player range:', error);
    throw error;
  }
}

/**
 * Get ranges for a player
 */
export async function getPlayerRanges(
  userId: string,
  playerId: string
): Promise<Record<string, Range> | null> {
  try {
    const player = await getPlayer(userId, playerId);
    return player?.ranges || null;
  } catch (error) {
    console.error('Error getting player ranges:', error);
    throw error;
  }
}

// ============================================
// SHARING OPERATIONS
// ============================================

/**
 * Toggle player sharing
 */
export async function togglePlayerSharing(
  userId: string,
  playerId: string,
  isShared: boolean
): Promise<void> {
  try {
    const playerRef = getPlayerDoc(userId, playerId);
    
    await updateDoc(playerRef, {
      isShared,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error toggling player sharing:', error);
    throw error;
  }
}

/**
 * Get range key from position and action
 */
export function getRangeKey(position: string, action: string): string {
  return `${position}_${action}`;
}
