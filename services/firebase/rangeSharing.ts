/**
 * Firebase Range Sharing Service
 * 
 * Handles sharing player ranges between friends.
 * 
 * Collection: rangeShares/{shareId}
 * 
 * Privacy Note: Only ranges are shared, NOT notes.
 * This ensures GDPR compliance and adherence to App Store guidelines.
 */

import { db } from '@/config/firebase';
import { Range } from '@/types/poker';
import {
  PendingSharesSummary,
  RangeShare
} from '@/types/sharing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { getFriend } from './friends';

// ============================================
// TYPE CONVERTERS
// ============================================

interface FirestoreRangeShare {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  playerName: string;
  ranges: Record<string, Range>;
  rangeKeys: string[];
  rangeCount: number;
  createdAt: Timestamp;
}

function toRangeShare(id: string, data: FirestoreRangeShare): RangeShare {
  return {
    id,
    fromUserId: data.fromUserId,
    fromUserName: data.fromUserName,
    toUserId: data.toUserId,
    toUserName: data.toUserName,
    playerName: data.playerName,
    ranges: data.ranges || {},
    rangeKeys: data.rangeKeys || [],
    rangeCount: data.rangeCount || 0,
    createdAt: data.createdAt?.toMillis() || Date.now(),
  };
}

// ============================================
// SEND RANGE SHARE
// ============================================

/**
 * Send a range share to a friend.
 * If a share for the same player to the same friend already exists, it will be replaced.
 */
export async function sendRangeShare(
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string,
  playerName: string,
  ranges: Record<string, Range>
): Promise<RangeShare> {
  // Validation: Must be friends
  const friendship = await getFriend(fromUserId, toUserId);
  if (!friendship) {
    throw new Error('You can only share ranges with friends');
  }

  // Validation: Must have ranges to share
  const rangeKeys = Object.keys(ranges).filter(key => {
    const range = ranges[key];
    // Check if range has any non-unselected hands
    return Object.values(range).some(state => state !== 'unselected');
  });

  if (rangeKeys.length === 0) {
    throw new Error('This player has no ranges to share');
  }

  // Note: We removed the recipient pending share limit check here because
  // the sender cannot query the recipient's shares due to security rules.
  // The limit is now a soft limit - enforced by app layer when receiving shares.

  // Check for existing share (same sender, recipient, player name) and replace it
  const existingShare = await findExistingShare(fromUserId, toUserId, playerName);
  
  const sharesRef = collection(db, 'rangeShares');
  const shareId = existingShare?.id || doc(sharesRef).id;
  const shareRef = doc(db, 'rangeShares', shareId);

  // Filter ranges to only include non-empty ones (sparse storage)
  const filteredRanges: Record<string, Range> = {};
  for (const key of rangeKeys) {
    const range = ranges[key];
    // Only store hands that are not 'unselected'
    const sparseRange: Range = {};
    for (const [hand, state] of Object.entries(range)) {
      if (state !== 'unselected') {
        sparseRange[hand] = state;
      }
    }
    if (Object.keys(sparseRange).length > 0) {
      filteredRanges[key] = sparseRange;
    }
  }

  const shareData = {
    fromUserId,
    fromUserName,
    toUserId,
    toUserName,
    playerName,
    ranges: filteredRanges,
    rangeKeys: Object.keys(filteredRanges),
    rangeCount: Object.keys(filteredRanges).length,
    createdAt: serverTimestamp(),
  };

  await setDoc(shareRef, shareData);

  return {
    id: shareId,
    fromUserId,
    fromUserName,
    toUserId,
    toUserName,
    playerName,
    ranges: filteredRanges,
    rangeKeys: Object.keys(filteredRanges),
    rangeCount: Object.keys(filteredRanges).length,
    createdAt: Date.now(),
  };
}

/**
 * Find an existing share from same sender to same recipient for same player
 */
async function findExistingShare(
  fromUserId: string,
  toUserId: string,
  playerName: string
): Promise<RangeShare | null> {
  const sharesRef = collection(db, 'rangeShares');
  const q = query(
    sharesRef,
    where('fromUserId', '==', fromUserId),
    where('toUserId', '==', toUserId),
    where('playerName', '==', playerName)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return toRangeShare(doc.id, doc.data() as FirestoreRangeShare);
}

// ============================================
// GET PENDING SHARES
// ============================================

/**
 * Get all pending shares received by a user
 */
export async function getPendingSharesForUser(userId: string): Promise<RangeShare[]> {
  const sharesRef = collection(db, 'rangeShares');
  const q = query(
    sharesRef,
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    toRangeShare(doc.id, doc.data() as FirestoreRangeShare)
  );
}

/**
 * Get pending shares from a specific friend
 */
export async function getPendingSharesFromFriend(
  userId: string,
  friendId: string
): Promise<RangeShare[]> {
  const sharesRef = collection(db, 'rangeShares');
  const q = query(
    sharesRef,
    where('toUserId', '==', userId),
    where('fromUserId', '==', friendId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    toRangeShare(doc.id, doc.data() as FirestoreRangeShare)
  );
}

/**
 * Get total count of pending shares for a user
 */
export async function getPendingSharesCount(userId: string): Promise<number> {
  const sharesRef = collection(db, 'rangeShares');
  const q = query(
    sharesRef,
    where('toUserId', '==', userId)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Get pending shares count grouped by friend
 */
export async function getPendingSharesCountByFriend(
  userId: string
): Promise<PendingSharesSummary[]> {
  const shares = await getPendingSharesForUser(userId);
  
  // Group by fromUserId
  const countMap = new Map<string, { name: string; count: number }>();
  
  for (const share of shares) {
    const existing = countMap.get(share.fromUserId);
    if (existing) {
      existing.count++;
    } else {
      countMap.set(share.fromUserId, {
        name: share.fromUserName,
        count: 1,
      });
    }
  }

  return Array.from(countMap.entries()).map(([friendId, data]) => ({
    friendId,
    friendName: data.name,
    count: data.count,
  }));
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to total pending shares count for a user
 */
export function subscribeToPendingSharesCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const sharesRef = collection(db, 'rangeShares');
  const q = query(
    sharesRef,
    where('toUserId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

/**
 * Subscribe to pending shares from all friends (for per-friend badges)
 */
export function subscribeToPendingShares(
  userId: string,
  callback: (shares: RangeShare[]) => void
): () => void {
  const sharesRef = collection(db, 'rangeShares');
  const q = query(
    sharesRef,
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const shares = snapshot.docs.map(doc => 
      toRangeShare(doc.id, doc.data() as FirestoreRangeShare)
    );
    callback(shares);
  });
}

// ============================================
// DELETE RANGE SHARE
// ============================================

/**
 * Delete a range share (after accept, decline, or dismiss)
 */
export async function deleteRangeShare(shareId: string): Promise<void> {
  const shareRef = doc(db, 'rangeShares', shareId);
  await deleteDoc(shareRef);
}

/**
 * Get a specific range share by ID
 */
export async function getRangeShare(shareId: string): Promise<RangeShare | null> {
  const shareRef = doc(db, 'rangeShares', shareId);
  const shareDoc = await getDoc(shareRef);

  if (!shareDoc.exists()) {
    return null;
  }

  return toRangeShare(shareDoc.id, shareDoc.data() as FirestoreRangeShare);
}
