import { db } from '@/config/firebase';
import { PlayerRanges, Range } from '@/types/poker';
import {
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
} from 'firebase/firestore';

// ============================================
// COLLECTION REFERENCE
// ============================================

const COLLECTION_NAME = 'playerRanges';

// ============================================
// TYPE CONVERTERS
// ============================================

interface FirestorePlayerRanges {
  playerId: string;
  ranges: Record<string, Range>;
  lastObserved: Timestamp;
  handsObserved: number;
}

function toPlayerRanges(data: FirestorePlayerRanges): PlayerRanges {
  return {
    playerId: data.playerId,
    ranges: data.ranges || {},
    lastObserved: data.lastObserved?.toMillis() || Date.now(),
    handsObserved: data.handsObserved || 0,
  };
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get ranges for a player
 */
export async function getPlayerRanges(playerId: string): Promise<PlayerRanges | null> {
  try {
    const rangesDoc = await getDoc(doc(db, COLLECTION_NAME, playerId));
    
    if (!rangesDoc.exists()) {
      return null;
    }
    
    return toPlayerRanges(rangesDoc.data() as FirestorePlayerRanges);
  } catch (error) {
    if (!isOfflineError(error)) {
      console.error('Error fetching player ranges:', error);
    }
    throw error;
  }
}

/**
 * Create or update player ranges
 */
export async function savePlayerRanges(playerRanges: PlayerRanges, userId: string): Promise<void> {
  try {
    const rangesRef = doc(db, COLLECTION_NAME, playerRanges.playerId);
    
    await setDoc(rangesRef, {
      playerId: playerRanges.playerId,
      ranges: playerRanges.ranges,
      lastObserved: serverTimestamp(),
      handsObserved: playerRanges.handsObserved,
      createdBy: userId,
    }, { merge: true });
  } catch (error) {
    if (!isOfflineError(error)) {
      console.error('Error saving player ranges:', error);
    }
    throw error;
  }
}

function isOfflineError(error: any): boolean {
  return (
    error?.code === 'unavailable' ||
    error?.message?.includes('offline') ||
    error?.message?.includes('network')
  );
}

/**
 * Update a specific range for a player
 */
export async function updatePlayerRange(
  playerId: string,
  rangeKey: string,  // e.g., "early_open-raise"
  range: Range,
  userId: string
): Promise<void> {
  try {
    const rangesRef = doc(db, COLLECTION_NAME, playerId);
    const rangesDoc = await getDoc(rangesRef);
    
    if (rangesDoc.exists()) {
      // Update existing document
      await updateDoc(rangesRef, {
        [`ranges.${rangeKey}`]: range,
        lastObserved: serverTimestamp(),
        handsObserved: (rangesDoc.data().handsObserved || 0) + 1,
      });
    } else {
      // Create new document
      await setDoc(rangesRef, {
        playerId,
        ranges: { [rangeKey]: range },
        lastObserved: serverTimestamp(),
        handsObserved: 1,
        createdBy: userId,
      });
    }
  } catch (error) {
    if (!isOfflineError(error)) {
      console.error('Error updating player range:', error);
    }
    throw error;
  }
}

/**
 * Delete all ranges for a player
 */
export async function deletePlayerRanges(playerId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, playerId));
  } catch (error) {
    console.error('Error deleting player ranges:', error);
    throw error;
  }
}

/**
 * Clear a specific range
 */
export async function clearPlayerRange(
  playerId: string,
  rangeKey: string
): Promise<void> {
  try {
    const rangesRef = doc(db, COLLECTION_NAME, playerId);
    const rangesDoc = await getDoc(rangesRef);
    
    if (rangesDoc.exists()) {
      const ranges = rangesDoc.data().ranges || {};
      delete ranges[rangeKey];
      
      await updateDoc(rangesRef, {
        ranges,
        lastObserved: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error clearing player range:', error);
    throw error;
  }
}

/**
 * Get range key from position and action
 */
export function getRangeKey(position: string, action: string): string {
  return `${position}_${action}`;
}
