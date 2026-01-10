/**
 * Firebase Player Links Service
 * 
 * Handles bidirectional player links for automatic range syncing.
 * Uses a pull-based architecture with version numbers for cost efficiency.
 * 
 * Collection: playerLinks/{linkId}
 */

import { db } from '@/config/firebase';
import { Range } from '@/types/poker';
import {
  AcceptPlayerLink,
  CreatePlayerLink,
  PlayerLink,
  PlayerLinkView,
  PLAYER_LINKS_CONFIG,
  SyncRangesResult,
} from '@/types/sharing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  or,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { checkRateLimit } from '../rateLimit';
import { getPlayer, updatePlayerRanges, getPlayerRanges } from './players';
import { getFriend } from './friends';

// ============================================
// COLLECTION HELPERS
// ============================================

function getPlayerLinksCollection() {
  return collection(db, 'playerLinks');
}

function getPlayerLinkDoc(linkId: string) {
  return doc(db, 'playerLinks', linkId);
}

// ============================================
// TYPE CONVERTERS
// ============================================

interface FirestorePlayerLink {
  status: 'pending' | 'active';
  userAId: string;
  userAName: string;
  userAPlayerId: string;
  userAPlayerName: string;
  userALastSyncedVersion: number;
  userBId: string;
  userBName: string;
  userBPlayerId: string | null;
  userBPlayerName: string | null;
  userBLastSyncedVersion: number;
  createdAt: Timestamp;
  acceptedAt: Timestamp | null;
}

function toPlayerLink(id: string, data: FirestorePlayerLink): PlayerLink {
  return {
    id,
    status: data.status,
    userAId: data.userAId,
    userAName: data.userAName,
    userAPlayerId: data.userAPlayerId,
    userAPlayerName: data.userAPlayerName,
    userALastSyncedVersion: data.userALastSyncedVersion,
    userBId: data.userBId,
    userBName: data.userBName,
    userBPlayerId: data.userBPlayerId,
    userBPlayerName: data.userBPlayerName,
    userBLastSyncedVersion: data.userBLastSyncedVersion,
    createdAt: data.createdAt?.toMillis() || Date.now(),
    acceptedAt: data.acceptedAt?.toMillis() || null,
  };
}

/**
 * Convert a PlayerLink to a user-perspective view
 */
export function toPlayerLinkView(
  link: PlayerLink,
  currentUserId: string,
  theirRangeVersion: number | null = null
): PlayerLinkView {
  const isUserA = link.userAId === currentUserId;
  
  const myPlayerId = isUserA ? link.userAPlayerId : link.userBPlayerId!;
  const myPlayerName = isUserA ? link.userAPlayerName : link.userBPlayerName!;
  const myLastSyncedVersion = isUserA ? link.userALastSyncedVersion : link.userBLastSyncedVersion;
  
  const theirUserId = isUserA ? link.userBId : link.userAId;
  const theirUserName = isUserA ? link.userBName : link.userAName;
  const theirPlayerId = isUserA ? link.userBPlayerId : link.userAPlayerId;
  const theirPlayerName = isUserA ? link.userBPlayerName : link.userAPlayerName;
  
  const hasUpdates = theirRangeVersion !== null 
    ? theirRangeVersion > myLastSyncedVersion 
    : null;
  
  return {
    link,
    isUserA,
    myPlayerId,
    myPlayerName,
    theirUserId,
    theirUserName,
    theirPlayerId,
    theirPlayerName,
    myLastSyncedVersion,
    theirRangeVersion,
    hasUpdates,
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if users are friends
 */
async function validateFriendship(userId: string, friendId: string): Promise<boolean> {
  const friend = await getFriend(userId, friendId);
  return friend !== null;
}

/**
 * Check if a link already exists between two players
 */
async function getLinkBetweenUsers(
  userId: string,
  playerId: string,
  friendId: string
): Promise<PlayerLink | null> {
  const linksRef = getPlayerLinksCollection();
  
  // Check if user A's player is already linked to friend
  const q1 = query(
    linksRef,
    where('userAId', '==', userId),
    where('userAPlayerId', '==', playerId),
    where('userBId', '==', friendId)
  );
  
  // Check if friend created a link to this user's player
  const q2 = query(
    linksRef,
    where('userBId', '==', userId),
    where('userBPlayerId', '==', playerId),
    where('userAId', '==', friendId)
  );
  
  const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  
  if (!snapshot1.empty) {
    const doc = snapshot1.docs[0];
    return toPlayerLink(doc.id, doc.data() as FirestorePlayerLink);
  }
  
  if (!snapshot2.empty) {
    const doc = snapshot2.docs[0];
    return toPlayerLink(doc.id, doc.data() as FirestorePlayerLink);
  }
  
  return null;
}

/**
 * Get count of active links for a user
 */
async function getLinkCount(userId: string): Promise<number> {
  const linksRef = getPlayerLinksCollection();
  
  const q = query(
    linksRef,
    or(
      where('userAId', '==', userId),
      where('userBId', '==', userId)
    )
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new player link (initiates link request)
 */
export async function createPlayerLink(data: CreatePlayerLink): Promise<PlayerLink> {
  checkRateLimit(data.userAId, 'CREATE_PLAYER_LINK');
  
  // Validate friendship
  const areFriends = await validateFriendship(data.userAId, data.userBId);
  if (!areFriends) {
    throw new Error('You can only create links with friends');
  }
  
  // Check link limits
  const linkCount = await getLinkCount(data.userAId);
  if (linkCount >= PLAYER_LINKS_CONFIG.MAX_LINKS_PER_PLAYER) {
    throw new Error(`You've reached the maximum of ${PLAYER_LINKS_CONFIG.MAX_LINKS_PER_PLAYER} player links`);
  }
  
  // Check for existing link
  const existingLink = await getLinkBetweenUsers(data.userAId, data.userAPlayerId, data.userBId);
  if (existingLink) {
    throw new Error('A link already exists between these players');
  }
  
  // Validate that the player exists
  const player = await getPlayer(data.userAId, data.userAPlayerId);
  if (!player) {
    throw new Error('Player not found');
  }
  
  const linksRef = getPlayerLinksCollection();
  const linkDoc = doc(linksRef);
  
  const linkData: Omit<FirestorePlayerLink, 'createdAt' | 'acceptedAt'> = {
    status: 'pending',
    userAId: data.userAId,
    userAName: data.userAName,
    userAPlayerId: data.userAPlayerId,
    userAPlayerName: data.userAPlayerName,
    userALastSyncedVersion: 0,
    userBId: data.userBId,
    userBName: data.userBName,
    userBPlayerId: null,
    userBPlayerName: null,
    userBLastSyncedVersion: 0,
  };
  
  await setDoc(linkDoc, {
    ...linkData,
    createdAt: serverTimestamp(),
    acceptedAt: null,
  });
  
  return {
    id: linkDoc.id,
    ...linkData,
    createdAt: Date.now(),
    acceptedAt: null,
  };
}

/**
 * Accept a pending player link (User B selects their player)
 */
export async function acceptPlayerLink(
  linkId: string,
  userId: string,
  acceptData: AcceptPlayerLink
): Promise<PlayerLink> {
  checkRateLimit(userId, 'ACCEPT_PLAYER_LINK');
  
  const linkRef = getPlayerLinkDoc(linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = linkDoc.data() as FirestorePlayerLink;
  
  // Validate user is User B
  if (link.userBId !== userId) {
    throw new Error('You can only accept links sent to you');
  }
  
  if (link.status !== 'pending') {
    throw new Error('This link has already been accepted');
  }
  
  // Validate the player exists
  const player = await getPlayer(userId, acceptData.userBPlayerId);
  if (!player) {
    throw new Error('Player not found');
  }
  
  // Check link count for User B
  const linkCount = await getLinkCount(userId);
  if (linkCount >= PLAYER_LINKS_CONFIG.MAX_LINKS_PER_PLAYER) {
    throw new Error(`You've reached the maximum of ${PLAYER_LINKS_CONFIG.MAX_LINKS_PER_PLAYER} player links`);
  }
  
  await updateDoc(linkRef, {
    status: 'active',
    userBPlayerId: acceptData.userBPlayerId,
    userBPlayerName: acceptData.userBPlayerName,
    acceptedAt: serverTimestamp(),
  });
  
  return {
    id: linkId,
    status: 'active',
    userAId: link.userAId,
    userAName: link.userAName,
    userAPlayerId: link.userAPlayerId,
    userAPlayerName: link.userAPlayerName,
    userALastSyncedVersion: link.userALastSyncedVersion,
    userBId: link.userBId,
    userBName: link.userBName,
    userBPlayerId: acceptData.userBPlayerId,
    userBPlayerName: acceptData.userBPlayerName,
    userBLastSyncedVersion: link.userBLastSyncedVersion,
    createdAt: link.createdAt?.toMillis() || Date.now(),
    acceptedAt: Date.now(),
  };
}

/**
 * Decline a pending player link
 */
export async function declinePlayerLink(linkId: string, userId: string): Promise<void> {
  checkRateLimit(userId, 'DECLINE_PLAYER_LINK');
  
  const linkRef = getPlayerLinkDoc(linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = linkDoc.data() as FirestorePlayerLink;
  
  // Only User B can decline pending links
  if (link.userBId !== userId) {
    throw new Error('You can only decline links sent to you');
  }
  
  if (link.status !== 'pending') {
    throw new Error('This link is not pending');
  }
  
  await deleteDoc(linkRef);
}

/**
 * Remove an active player link (either party can remove)
 */
export async function removePlayerLink(linkId: string, userId: string): Promise<void> {
  checkRateLimit(userId, 'REMOVE_PLAYER_LINK');
  
  const linkRef = getPlayerLinkDoc(linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = linkDoc.data() as FirestorePlayerLink;
  
  // Either party can remove the link
  if (link.userAId !== userId && link.userBId !== userId) {
    throw new Error('You are not part of this link');
  }
  
  await deleteDoc(linkRef);
}

/**
 * Cancel a pending link (creator can cancel before acceptance)
 */
export async function cancelPlayerLink(linkId: string, userId: string): Promise<void> {
  checkRateLimit(userId, 'CANCEL_PLAYER_LINK');
  
  const linkRef = getPlayerLinkDoc(linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = linkDoc.data() as FirestorePlayerLink;
  
  // Only User A can cancel pending links
  if (link.userAId !== userId) {
    throw new Error('You can only cancel links you created');
  }
  
  if (link.status !== 'pending') {
    throw new Error('This link is not pending');
  }
  
  await deleteDoc(linkRef);
}

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Get all links for a user (both as creator and recipient)
 */
export async function getPlayerLinks(userId: string): Promise<PlayerLink[]> {
  const linksRef = getPlayerLinksCollection();
  
  const q = query(
    linksRef,
    or(
      where('userAId', '==', userId),
      where('userBId', '==', userId)
    )
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    toPlayerLink(doc.id, doc.data() as FirestorePlayerLink)
  );
}

/**
 * Get pending links received by a user
 */
export async function getPendingPlayerLinks(userId: string): Promise<PlayerLink[]> {
  const linksRef = getPlayerLinksCollection();
  
  const q = query(
    linksRef,
    where('userBId', '==', userId),
    where('status', '==', 'pending')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    toPlayerLink(doc.id, doc.data() as FirestorePlayerLink)
  );
}

/**
 * Get active links for a user
 */
export async function getActivePlayerLinks(userId: string): Promise<PlayerLink[]> {
  const links = await getPlayerLinks(userId);
  return links.filter(link => link.status === 'active');
}

/**
 * Get links for a specific player
 */
export async function getPlayerLinksForPlayer(
  userId: string,
  playerId: string
): Promise<PlayerLink[]> {
  const linksRef = getPlayerLinksCollection();
  
  // Query where user is A and their player matches
  const q1 = query(
    linksRef,
    where('userAId', '==', userId),
    where('userAPlayerId', '==', playerId)
  );
  
  // Query where user is B and their player matches
  const q2 = query(
    linksRef,
    where('userBId', '==', userId),
    where('userBPlayerId', '==', playerId)
  );
  
  const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  
  const links: PlayerLink[] = [];
  
  snapshot1.docs.forEach(doc => {
    links.push(toPlayerLink(doc.id, doc.data() as FirestorePlayerLink));
  });
  
  snapshot2.docs.forEach(doc => {
    links.push(toPlayerLink(doc.id, doc.data() as FirestorePlayerLink));
  });
  
  return links;
}

/**
 * Get remaining links available for a user
 */
export async function getRemainingLinkCount(userId: string): Promise<{
  used: number;
  remaining: number;
  max: number;
}> {
  const used = await getLinkCount(userId);
  return {
    used,
    remaining: PLAYER_LINKS_CONFIG.MAX_LINKS_PER_PLAYER - used,
    max: PLAYER_LINKS_CONFIG.MAX_LINKS_PER_PLAYER,
  };
}

// ============================================
// SYNC OPERATIONS (Pull-Based)
// ============================================

/**
 * Check if updates are available from a linked player
 */
export async function checkForUpdates(
  link: PlayerLink,
  currentUserId: string
): Promise<{ hasUpdates: boolean; theirVersion: number }> {
  const isUserA = link.userAId === currentUserId;
  
  const theirUserId = isUserA ? link.userBId : link.userAId;
  const theirPlayerId = isUserA ? link.userBPlayerId : link.userAPlayerId;
  const myLastSyncedVersion = isUserA 
    ? link.userALastSyncedVersion 
    : link.userBLastSyncedVersion;
  
  if (!theirPlayerId) {
    return { hasUpdates: false, theirVersion: 0 };
  }
  
  // Get their player to check rangeVersion
  const theirPlayer = await getPlayer(theirUserId, theirPlayerId);
  
  if (!theirPlayer) {
    return { hasUpdates: false, theirVersion: 0 };
  }
  
  const theirVersion = theirPlayer.rangeVersion || 0;
  
  return {
    hasUpdates: theirVersion > myLastSyncedVersion,
    theirVersion,
  };
}

/**
 * Sync ranges from a linked player
 * Uses fill-empty-only approach: only fills empty range slots
 */
export async function syncRangesFromLink(
  linkId: string,
  currentUserId: string
): Promise<SyncRangesResult> {
  checkRateLimit(currentUserId, 'SYNC_PLAYER_LINK');
  
  const linkRef = getPlayerLinkDoc(linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = linkDoc.data() as FirestorePlayerLink;
  
  if (link.status !== 'active') {
    throw new Error('Link is not active');
  }
  
  const isUserA = link.userAId === currentUserId;
  
  if (!isUserA && link.userBId !== currentUserId) {
    throw new Error('You are not part of this link');
  }
  
  const myPlayerId = isUserA ? link.userAPlayerId : link.userBPlayerId!;
  const theirUserId = isUserA ? link.userBId : link.userAId;
  const theirPlayerId = isUserA ? link.userBPlayerId : link.userAPlayerId;
  
  if (!theirPlayerId) {
    throw new Error('Linked player not set');
  }
  
  // Fetch both players' ranges
  const [myRanges, theirPlayer] = await Promise.all([
    getPlayerRanges(currentUserId, myPlayerId),
    getPlayer(theirUserId, theirPlayerId),
  ]);
  
  if (!theirPlayer) {
    throw new Error('Linked player not found');
  }
  
  const theirRanges = theirPlayer.ranges || {};
  const theirVersion = theirPlayer.rangeVersion || 0;
  
  // Merge ranges (fill-empty-only approach)
  const mergedRanges: Record<string, Range> = { ...(myRanges || {}) };
  const rangeKeysAdded: string[] = [];
  const rangeKeysSkipped: string[] = [];
  
  for (const [rangeKey, theirRange] of Object.entries(theirRanges)) {
    const myRange = mergedRanges[rangeKey];
    
    // Check if my range is empty (undefined or all unselected)
    const isMyRangeEmpty = !myRange || 
      Object.values(myRange).every(state => state === 'unselected');
    
    // Check if their range has content
    const hasTheirRangeContent = theirRange && 
      Object.values(theirRange).some(state => state !== 'unselected');
    
    if (isMyRangeEmpty && hasTheirRangeContent) {
      mergedRanges[rangeKey] = theirRange;
      rangeKeysAdded.push(rangeKey);
    } else if (hasTheirRangeContent) {
      rangeKeysSkipped.push(rangeKey);
    }
  }
  
  // Update my player's ranges if there were changes
  if (rangeKeysAdded.length > 0) {
    await updatePlayerRanges(currentUserId, myPlayerId, mergedRanges);
  }
  
  // Update my last synced version in the link
  const versionField = isUserA ? 'userALastSyncedVersion' : 'userBLastSyncedVersion';
  await updateDoc(linkRef, {
    [versionField]: theirVersion,
  });
  
  return {
    added: rangeKeysAdded.length,
    skipped: rangeKeysSkipped.length,
    newVersion: theirVersion,
    rangeKeysAdded,
    rangeKeysSkipped,
  };
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to player links for a user
 */
export function subscribeToPlayerLinks(
  userId: string,
  callback: (links: PlayerLink[]) => void
): () => void {
  const linksRef = getPlayerLinksCollection();
  
  // Note: Firestore doesn't support OR in onSnapshot efficiently,
  // so we subscribe to both and merge
  const q1 = query(linksRef, where('userAId', '==', userId));
  const q2 = query(linksRef, where('userBId', '==', userId));
  
  let links1: PlayerLink[] = [];
  let links2: PlayerLink[] = [];
  
  const mergeAndCallback = () => {
    // Merge and deduplicate
    const allLinks = [...links1, ...links2];
    const uniqueLinks = allLinks.filter((link, index, self) => 
      index === self.findIndex(l => l.id === link.id)
    );
    callback(uniqueLinks);
  };
  
  const unsubscribe1 = onSnapshot(q1, (snapshot) => {
    links1 = snapshot.docs.map(doc => 
      toPlayerLink(doc.id, doc.data() as FirestorePlayerLink)
    );
    mergeAndCallback();
  });
  
  const unsubscribe2 = onSnapshot(q2, (snapshot) => {
    links2 = snapshot.docs.map(doc => 
      toPlayerLink(doc.id, doc.data() as FirestorePlayerLink)
    );
    mergeAndCallback();
  });
  
  return () => {
    unsubscribe1();
    unsubscribe2();
  };
}

/**
 * Subscribe to pending link count for badge display
 */
export function subscribeToPendingLinkCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const linksRef = getPlayerLinksCollection();
  
  const q = query(
    linksRef,
    where('userBId', '==', userId),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}
