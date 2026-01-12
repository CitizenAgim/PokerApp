/**
 * Firebase Player Links Service - Subcollection Architecture
 * 
 * Stores links in user-scoped subcollections for fast queries:
 * Path: /users/{userId}/playerLinks/{linkId}
 * 
 * Each link is stored in BOTH users' subcollections using writeBatch()
 * for atomic dual-writes. Uses perspective-based fields (myPlayer, theirPlayer)
 * instead of userA/userB for clarity.
 * 
 * Key features:
 * - Single listener per user (no OR query merging)
 * - Atomic dual-writes with writeBatch
 * - Error handling on subscriptions
 * - Batched update checks
 */

import { db } from '@/config/firebase';
import { Range } from '@/types/poker';
import {
    AcceptPlayerLink,
    CreatePlayerLink,
    PLAYER_LINKS_CONFIG,
    PlayerLinkView,
    SyncRangesResult,
    UserPlayerLink,
} from '@/types/sharing';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    QuerySnapshot,
    Timestamp,
    where,
    writeBatch,
} from 'firebase/firestore';
import { checkRateLimit } from '../rateLimit';
import { getFriend } from './friends';
import { getPlayer, getPlayerRanges, updatePlayerRanges } from './players';

// ============================================
// COLLECTION HELPERS
// ============================================

/**
 * Get the playerLinks subcollection for a user
 */
function getUserPlayerLinksCollection(userId: string) {
  return collection(db, 'users', userId, 'playerLinks');
}

/**
 * Get a specific playerLink document reference
 */
function getUserPlayerLinkDoc(userId: string, linkId: string) {
  return doc(db, 'users', userId, 'playerLinks', linkId);
}

/**
 * Generate a new link ID
 */
function generateLinkId(): string {
  return doc(collection(db, '_')).id;
}

// ============================================
// TYPE CONVERTERS
// ============================================

interface FirestoreUserPlayerLink {
  id: string;
  status: 'pending' | 'active';
  isInitiator: boolean;
  myPlayerId: string | null;
  myPlayerName: string | null;
  myLastSyncedVersion: number;
  theirUserId: string;
  theirUserName: string;
  theirPlayerId: string | null;
  theirPlayerName: string | null;
  createdAt: Timestamp | number;
  acceptedAt: Timestamp | number | null;
}

function toUserPlayerLink(data: FirestoreUserPlayerLink): UserPlayerLink {
  return {
    id: data.id,
    status: data.status,
    isInitiator: data.isInitiator,
    myPlayerId: data.myPlayerId,
    myPlayerName: data.myPlayerName,
    myLastSyncedVersion: data.myLastSyncedVersion || 0,
    theirUserId: data.theirUserId,
    theirUserName: data.theirUserName,
    theirPlayerId: data.theirPlayerId,
    theirPlayerName: data.theirPlayerName,
    createdAt: typeof data.createdAt === 'number' 
      ? data.createdAt 
      : (data.createdAt as Timestamp)?.toMillis?.() || Date.now(),
    acceptedAt: data.acceptedAt 
      ? (typeof data.acceptedAt === 'number' 
          ? data.acceptedAt 
          : (data.acceptedAt as Timestamp)?.toMillis?.() || null)
      : null,
  };
}

/**
 * Convert a UserPlayerLink to a PlayerLinkView (for UI compatibility)
 */
export function toPlayerLinkView(
  link: UserPlayerLink,
  theirRangeVersion: number | null = null
): PlayerLinkView {
  const hasUpdates = theirRangeVersion !== null 
    ? theirRangeVersion > link.myLastSyncedVersion 
    : null;
  
  return {
    link,
    isInitiator: link.isInitiator,
    myPlayerId: link.myPlayerId,
    myPlayerName: link.myPlayerName,
    theirUserId: link.theirUserId,
    theirUserName: link.theirUserName,
    theirPlayerId: link.theirPlayerId,
    theirPlayerName: link.theirPlayerName,
    myLastSyncedVersion: link.myLastSyncedVersion,
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
 * Get count of links for a user (from their subcollection)
 */
async function getLinkCount(userId: string): Promise<number> {
  const linksRef = getUserPlayerLinksCollection(userId);
  const snapshot = await getDocs(linksRef);
  return snapshot.size;
}

/**
 * Check if a link already exists between two users for a specific player
 */
async function linkExistsBetweenUsers(
  userId: string,
  playerId: string,
  friendId: string
): Promise<boolean> {
  const linksRef = getUserPlayerLinksCollection(userId);
  
  // Check for any link with this friend where my player matches
  const q = query(
    linksRef,
    where('theirUserId', '==', friendId),
    where('myPlayerId', '==', playerId)
  );
  
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new player link using atomic dual-write
 */
export async function createPlayerLink(data: CreatePlayerLink): Promise<UserPlayerLink> {
  checkRateLimit(data.initiatorUserId, 'CREATE_PLAYER_LINK');
  
  // Validate friendship
  const areFriends = await validateFriendship(data.initiatorUserId, data.recipientUserId);
  if (!areFriends) {
    throw new Error('You can only create links with friends');
  }
  
  // Check link limits
  const linkCount = await getLinkCount(data.initiatorUserId);
  if (linkCount >= PLAYER_LINKS_CONFIG.MAX_LINKS_PER_USER) {
    throw new Error(`You've reached the maximum of ${PLAYER_LINKS_CONFIG.MAX_LINKS_PER_USER} player links`);
  }
  
  // Check for existing link
  const existingLink = await linkExistsBetweenUsers(
    data.initiatorUserId,
    data.initiatorPlayerId,
    data.recipientUserId
  );
  if (existingLink) {
    throw new Error('A link already exists between these players');
  }
  
  // Validate that the player exists
  const player = await getPlayer(data.initiatorUserId, data.initiatorPlayerId);
  if (!player) {
    throw new Error('Player not found');
  }
  
  const linkId = generateLinkId();
  const now = Date.now();
  
  // Initiator's view of the link
  const initiatorLink: FirestoreUserPlayerLink = {
    id: linkId,
    status: 'pending',
    isInitiator: true,
    myPlayerId: data.initiatorPlayerId,
    myPlayerName: data.initiatorPlayerName,
    myLastSyncedVersion: 0,
    theirUserId: data.recipientUserId,
    theirUserName: data.recipientUserName,
    theirPlayerId: null,  // Pending, recipient hasn't selected yet
    theirPlayerName: null,
    createdAt: now,
    acceptedAt: null,
  };
  
  // Recipient's view of the link
  const recipientLink: FirestoreUserPlayerLink = {
    id: linkId,
    status: 'pending',
    isInitiator: false,
    myPlayerId: null,  // Pending, recipient hasn't selected yet
    myPlayerName: null,
    myLastSyncedVersion: 0,
    theirUserId: data.initiatorUserId,
    theirUserName: data.initiatorUserName,
    theirPlayerId: data.initiatorPlayerId,
    theirPlayerName: data.initiatorPlayerName,
    createdAt: now,
    acceptedAt: null,
  };
  
  // Atomic dual-write using writeBatch
  const batch = writeBatch(db);
  batch.set(getUserPlayerLinkDoc(data.initiatorUserId, linkId), initiatorLink);
  batch.set(getUserPlayerLinkDoc(data.recipientUserId, linkId), recipientLink);
  await batch.commit();
  
  return toUserPlayerLink(initiatorLink);
}

/**
 * Accept a pending player link using atomic dual-write
 */
export async function acceptPlayerLink(
  linkId: string,
  userId: string,
  acceptData: AcceptPlayerLink
): Promise<UserPlayerLink> {
  checkRateLimit(userId, 'ACCEPT_PLAYER_LINK');
  
  // Get the link from recipient's subcollection
  const linkRef = getUserPlayerLinkDoc(userId, linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = toUserPlayerLink(linkDoc.data() as FirestoreUserPlayerLink);
  
  // Validate user is the recipient (not initiator)
  if (link.isInitiator) {
    throw new Error('You can only accept links sent to you');
  }
  
  if (link.status !== 'pending') {
    throw new Error('This link has already been accepted');
  }
  
  // Validate the player exists
  const player = await getPlayer(userId, acceptData.recipientPlayerId);
  if (!player) {
    throw new Error('Player not found');
  }
  
  // Check link count for recipient
  const linkCount = await getLinkCount(userId);
  if (linkCount >= PLAYER_LINKS_CONFIG.MAX_LINKS_PER_USER) {
    throw new Error(`You've reached the maximum of ${PLAYER_LINKS_CONFIG.MAX_LINKS_PER_USER} player links`);
  }
  
  const now = Date.now();
  
  // Atomic dual-update using writeBatch
  const batch = writeBatch(db);
  
  // Update recipient's link (set my player, activate)
  batch.update(getUserPlayerLinkDoc(userId, linkId), {
    status: 'active',
    myPlayerId: acceptData.recipientPlayerId,
    myPlayerName: acceptData.recipientPlayerName,
    acceptedAt: now,
  });
  
  // Update initiator's link (set their player, activate)
  batch.update(getUserPlayerLinkDoc(link.theirUserId, linkId), {
    status: 'active',
    theirPlayerId: acceptData.recipientPlayerId,
    theirPlayerName: acceptData.recipientPlayerName,
    acceptedAt: now,
  });
  
  await batch.commit();
  
  return {
    ...link,
    status: 'active',
    myPlayerId: acceptData.recipientPlayerId,
    myPlayerName: acceptData.recipientPlayerName,
    acceptedAt: now,
  };
}

/**
 * Decline a pending player link using atomic dual-delete
 */
export async function declinePlayerLink(linkId: string, userId: string): Promise<void> {
  checkRateLimit(userId, 'DECLINE_PLAYER_LINK');
  
  const linkRef = getUserPlayerLinkDoc(userId, linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = toUserPlayerLink(linkDoc.data() as FirestoreUserPlayerLink);
  
  // Only recipient can decline pending links
  if (link.isInitiator) {
    throw new Error('You can only decline links sent to you');
  }
  
  if (link.status !== 'pending') {
    throw new Error('This link is not pending');
  }
  
  // Atomic dual-delete
  const batch = writeBatch(db);
  batch.delete(getUserPlayerLinkDoc(userId, linkId));
  batch.delete(getUserPlayerLinkDoc(link.theirUserId, linkId));
  await batch.commit();
}

/**
 * Remove an active player link using atomic dual-delete
 */
export async function removePlayerLink(linkId: string, userId: string): Promise<void> {
  checkRateLimit(userId, 'REMOVE_PLAYER_LINK');
  
  const linkRef = getUserPlayerLinkDoc(userId, linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = toUserPlayerLink(linkDoc.data() as FirestoreUserPlayerLink);
  
  // Atomic dual-delete
  const batch = writeBatch(db);
  batch.delete(getUserPlayerLinkDoc(userId, linkId));
  batch.delete(getUserPlayerLinkDoc(link.theirUserId, linkId));
  await batch.commit();
}

/**
 * Cancel a pending link (creator can cancel before acceptance)
 */
export async function cancelPlayerLink(linkId: string, userId: string): Promise<void> {
  checkRateLimit(userId, 'CANCEL_PLAYER_LINK');
  
  const linkRef = getUserPlayerLinkDoc(userId, linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = toUserPlayerLink(linkDoc.data() as FirestoreUserPlayerLink);
  
  // Only initiator can cancel pending links
  if (!link.isInitiator) {
    throw new Error('You can only cancel links you created');
  }
  
  if (link.status !== 'pending') {
    throw new Error('This link is not pending');
  }
  
  // Atomic dual-delete
  const batch = writeBatch(db);
  batch.delete(getUserPlayerLinkDoc(userId, linkId));
  batch.delete(getUserPlayerLinkDoc(link.theirUserId, linkId));
  await batch.commit();
}

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Get a single player link
 */
export async function getPlayerLink(
  userId: string,
  linkId: string
): Promise<UserPlayerLink | null> {
  const linkRef = getUserPlayerLinkDoc(userId, linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    return null;
  }
  
  return toUserPlayerLink(linkDoc.data() as FirestoreUserPlayerLink);
}

/**
 * Get all links for a user (simple subcollection query, no OR)
 */
export async function getPlayerLinks(userId: string): Promise<UserPlayerLink[]> {
  if (!userId) return [];
  
  const linksRef = getUserPlayerLinksCollection(userId);
  const snapshot = await getDocs(linksRef);
  
  return snapshot.docs.map(doc => 
    toUserPlayerLink(doc.data() as FirestoreUserPlayerLink)
  );
}

/**
 * Get pending links received by a user (where they need to accept)
 */
export async function getPendingPlayerLinks(userId: string): Promise<UserPlayerLink[]> {
  if (!userId) return [];
  
  const linksRef = getUserPlayerLinksCollection(userId);
  const q = query(
    linksRef,
    where('status', '==', 'pending'),
    where('isInitiator', '==', false)  // Only links they received
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    toUserPlayerLink(doc.data() as FirestoreUserPlayerLink)
  );
}

/**
 * Get active links for a user
 */
export async function getActivePlayerLinks(userId: string): Promise<UserPlayerLink[]> {
  if (!userId) return [];
  
  const linksRef = getUserPlayerLinksCollection(userId);
  const q = query(linksRef, where('status', '==', 'active'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    toUserPlayerLink(doc.data() as FirestoreUserPlayerLink)
  );
}

/**
 * Get links for a specific player
 */
export async function getPlayerLinksForPlayer(
  userId: string,
  playerId: string
): Promise<UserPlayerLink[]> {
  if (!userId || !playerId) return [];
  
  const linksRef = getUserPlayerLinksCollection(userId);
  const q = query(linksRef, where('myPlayerId', '==', playerId));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    toUserPlayerLink(doc.data() as FirestoreUserPlayerLink)
  );
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
    remaining: PLAYER_LINKS_CONFIG.MAX_LINKS_PER_USER - used,
    max: PLAYER_LINKS_CONFIG.MAX_LINKS_PER_USER,
  };
}

// ============================================
// SYNC OPERATIONS (Pull-Based)
// ============================================

/**
 * Check if updates are available from a linked player
 */
export async function checkForUpdates(
  link: UserPlayerLink
): Promise<{ hasUpdates: boolean; theirVersion: number }> {
  if (!link.theirPlayerId || !link.theirUserId) {
    console.log(`[checkForUpdates] Link ${link.id}: missing theirPlayerId or theirUserId`);
    return { hasUpdates: false, theirVersion: 0 };
  }
  
  // Get their player to check rangeVersion
  const theirPlayer = await getPlayer(link.theirUserId, link.theirPlayerId);
  
  if (!theirPlayer) {
    console.log(`[checkForUpdates] Link ${link.id}: theirPlayer not found at ${link.theirUserId}/${link.theirPlayerId}`);
    return { hasUpdates: false, theirVersion: 0 };
  }
  
  const theirVersion = theirPlayer.rangeVersion || 0;
  const hasUpdates = theirVersion > link.myLastSyncedVersion;
  
  console.log(`[checkForUpdates] Link ${link.id}: theirVersion=${theirVersion}, myLastSyncedVersion=${link.myLastSyncedVersion}, hasUpdates=${hasUpdates}`);
  
  return {
    hasUpdates,
    theirVersion,
  };
}

/**
 * Check all links for updates with batched requests
 */
export async function checkAllForUpdates(
  links: UserPlayerLink[],
  _userId: string
): Promise<Map<string, { hasUpdates: boolean; theirVersion: number }>> {
  const results = new Map<string, { hasUpdates: boolean; theirVersion: number }>();
  const activeLinks = links.filter(l => l.status === 'active' && l.theirPlayerId);
  
  // Process in batches
  const batchSize = PLAYER_LINKS_CONFIG.UPDATE_CHECK_BATCH_SIZE;
  
  for (let i = 0; i < activeLinks.length; i += batchSize) {
    const batch = activeLinks.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (link) => {
        try {
          const result = await checkForUpdates(link);
          return { linkId: link.id, result };
        } catch (error) {
          console.error(`Failed to check updates for link ${link.id}:`, error);
          return { linkId: link.id, result: { hasUpdates: false, theirVersion: 0 } };
        }
      })
    );
    
    for (const { linkId, result } of batchResults) {
      results.set(linkId, result);
    }
  }
  
  return results;
}

/**
 * Mark a link as synced without actually transferring any ranges.
 * Used when user has already caught up (all ranges skipped).
 * Updates BOTH users' sync versions to prevent false notifications.
 */
export async function markLinkAsSynced(
  linkId: string,
  currentUserId: string,
  theirVersion: number
): Promise<void> {
  // Get the link to find the other user
  const linkRef = getUserPlayerLinkDoc(currentUserId, linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = toUserPlayerLink(linkDoc.data() as FirestoreUserPlayerLink);
  
  // Get my player's current version
  const myPlayer = link.myPlayerId ? await getPlayer(currentUserId, link.myPlayerId) : null;
  const myVersion = myPlayer?.rangeVersion || 0;
  
  // Update BOTH users' sync versions
  const batch = writeBatch(db);
  
  // Update my sync version (I'm now caught up with their version)
  batch.update(getUserPlayerLinkDoc(currentUserId, linkId), {
    myLastSyncedVersion: theirVersion,
  });
  
  // Update their sync version (they're now caught up with my version)
  // This prevents them from seeing a notification that I have new data
  batch.update(getUserPlayerLinkDoc(link.theirUserId, linkId), {
    myLastSyncedVersion: myVersion,
  });
  
  await batch.commit();
}

/**
 * Get ranges available for sync from a linked player
 * Returns the friend's ranges along with your current ranges for comparison
 */
export async function getRangesForSync(
  linkId: string,
  currentUserId: string
): Promise<{
  theirRanges: Record<string, Range>;
  myRanges: Record<string, Range>;
  theirVersion: number;
  newRangeKeys: string[];      // Keys where you have empty slots (safe to fill)
  updateRangeKeys: string[];   // Keys where you have data but friend's is DIFFERENT
}> {
  const linkRef = getUserPlayerLinkDoc(currentUserId, linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = toUserPlayerLink(linkDoc.data() as FirestoreUserPlayerLink);
  
  if (link.status !== 'active') {
    throw new Error('Link is not active');
  }
  
  if (!link.myPlayerId || !link.theirPlayerId) {
    throw new Error('Linked player not set');
  }
  
  // Fetch both players' ranges
  const [myRanges, theirPlayer] = await Promise.all([
    getPlayerRanges(currentUserId, link.myPlayerId),
    getPlayer(link.theirUserId, link.theirPlayerId),
  ]);
  
  if (!theirPlayer) {
    throw new Error('Linked player not found');
  }
  
  const theirRanges = theirPlayer.ranges || {};
  const theirVersion = theirPlayer.rangeVersion || 0;
  const newRangeKeys: string[] = [];
  const updateRangeKeys: string[] = [];
  
  // Categorize ranges
  for (const [rangeKey, theirRange] of Object.entries(theirRanges)) {
    const myRange = myRanges?.[rangeKey];
    
    // Check if my range is empty
    const isMyRangeEmpty = !myRange || 
      Object.values(myRange).every(state => state === 'unselected');
    
    // Check if their range has content
    const hasTheirRangeContent = theirRange && 
      Object.values(theirRange).some(state => state !== 'unselected');
    
    if (hasTheirRangeContent) {
      if (isMyRangeEmpty) {
        newRangeKeys.push(rangeKey);
      } else {
        // Only include as update if the ranges are actually different
        if (areRangesDifferent(myRange, theirRange)) {
          updateRangeKeys.push(rangeKey);
        }
      }
    }
  }
  
  return {
    theirRanges,
    myRanges: myRanges || {},
    theirVersion,
    newRangeKeys,
    updateRangeKeys,
  };
}

/**
 * Compare two ranges to see if they are different
 */
function areRangesDifferent(rangeA: Range, rangeB: Range): boolean {
  // Get all unique keys from both ranges
  const allKeys = new Set([...Object.keys(rangeA), ...Object.keys(rangeB)]);
  
  for (const key of allKeys) {
    const stateA = rangeA[key] || 'unselected';
    const stateB = rangeB[key] || 'unselected';
    
    // Normalize states - treat both selected types as equivalent for comparison
    const normalizedA = (stateA === 'manual-selected' || stateA === 'auto-selected') ? 'selected' : 'unselected';
    const normalizedB = (stateB === 'manual-selected' || stateB === 'auto-selected') ? 'selected' : 'unselected';
    
    if (normalizedA !== normalizedB) {
      return true;
    }
  }
  
  return false;
}

/**
 * Sync selected ranges from a linked player
 * Only syncs the specified range keys (can overwrite existing if selected)
 */
export async function syncSelectedRangesFromLink(
  linkId: string,
  currentUserId: string,
  selectedKeys: string[]
): Promise<SyncRangesResult> {
  checkRateLimit(currentUserId, 'SYNC_PLAYER_LINK');
  
  const linkRef = getUserPlayerLinkDoc(currentUserId, linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = toUserPlayerLink(linkDoc.data() as FirestoreUserPlayerLink);
  
  if (link.status !== 'active') {
    throw new Error('Link is not active');
  }
  
  if (!link.myPlayerId || !link.theirPlayerId) {
    throw new Error('Linked player not set');
  }
  
  // Fetch both players' data (we need my player to get my current rangeVersion)
  const [myPlayer, myRanges, theirPlayer] = await Promise.all([
    getPlayer(currentUserId, link.myPlayerId),
    getPlayerRanges(currentUserId, link.myPlayerId),
    getPlayer(link.theirUserId, link.theirPlayerId),
  ]);
  
  if (!theirPlayer) {
    throw new Error('Linked player not found');
  }
  
  const theirRanges = theirPlayer.ranges || {};
  const theirVersion = theirPlayer.rangeVersion || 0;
  const myVersion = myPlayer?.rangeVersion || 0;
  
  // Merge selected ranges (overwrite if selected, even if user has existing data)
  const mergedRanges: Record<string, Range> = { ...(myRanges || {}) };
  const rangeKeysAdded: string[] = [];
  const rangeKeysSkipped: string[] = [];
  
  for (const rangeKey of selectedKeys) {
    const theirRange = theirRanges[rangeKey];
    
    // Check if their range has content
    const hasTheirRangeContent = theirRange && 
      Object.values(theirRange).some(state => state !== 'unselected');
    
    if (hasTheirRangeContent) {
      // Overwrite with friend's range (user explicitly selected this)
      mergedRanges[rangeKey] = theirRange;
      rangeKeysAdded.push(rangeKey);
    } else {
      rangeKeysSkipped.push(rangeKey);
    }
  }
  
  // Update my player's ranges if there were changes
  // Pass false for incrementVersion to avoid triggering notifications back to the sender
  if (rangeKeysAdded.length > 0) {
    await updatePlayerRanges(currentUserId, link.myPlayerId, mergedRanges, false);
  }
  
  // Update BOTH users' sync versions using writeBatch
  // This prevents the sender from getting a false notification that we have updates
  const batch = writeBatch(db);
  
  // Update my sync version (I'm now caught up with their version)
  batch.update(getUserPlayerLinkDoc(currentUserId, linkId), {
    myLastSyncedVersion: theirVersion,
  });
  
  // Update their sync version (they're now caught up with my version since I just got their data)
  // This prevents them from seeing a notification that I have new data
  batch.update(getUserPlayerLinkDoc(link.theirUserId, linkId), {
    myLastSyncedVersion: myVersion,
  });
  
  await batch.commit();
  
  return {
    added: rangeKeysAdded.length,
    skipped: rangeKeysSkipped.length,
    newVersion: theirVersion,
    rangeKeysAdded,
    rangeKeysSkipped,
  };
}

/**
 * Sync ranges from a linked player using atomic write
 * Uses fill-empty-only approach: only fills empty range slots
 */
export async function syncRangesFromLink(
  linkId: string,
  currentUserId: string
): Promise<SyncRangesResult> {
  checkRateLimit(currentUserId, 'SYNC_PLAYER_LINK');
  
  const linkRef = getUserPlayerLinkDoc(currentUserId, linkId);
  const linkDoc = await getDoc(linkRef);
  
  if (!linkDoc.exists()) {
    throw new Error('Player link not found');
  }
  
  const link = toUserPlayerLink(linkDoc.data() as FirestoreUserPlayerLink);
  
  if (link.status !== 'active') {
    throw new Error('Link is not active');
  }
  
  if (!link.myPlayerId || !link.theirPlayerId) {
    throw new Error('Linked player not set');
  }
  
  // Fetch both players' data (we need my player to get my current rangeVersion)
  const [myPlayer, myRanges, theirPlayer] = await Promise.all([
    getPlayer(currentUserId, link.myPlayerId),
    getPlayerRanges(currentUserId, link.myPlayerId),
    getPlayer(link.theirUserId, link.theirPlayerId),
  ]);
  
  if (!theirPlayer) {
    throw new Error('Linked player not found');
  }
  
  const theirRanges = theirPlayer.ranges || {};
  const theirVersion = theirPlayer.rangeVersion || 0;
  const myVersion = myPlayer?.rangeVersion || 0;
  
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
  // Pass false for incrementVersion to avoid triggering notifications back to the sender
  if (rangeKeysAdded.length > 0) {
    await updatePlayerRanges(currentUserId, link.myPlayerId, mergedRanges, false);
  }
  
  // Use writeBatch for atomic update of BOTH users' sync versions
  // This prevents the sender from getting a false notification that we have updates
  const batch = writeBatch(db);
  
  // Update my sync version (I'm now caught up with their version)
  batch.update(getUserPlayerLinkDoc(currentUserId, linkId), {
    myLastSyncedVersion: theirVersion,
  });
  
  // Update their sync version (they're now caught up with my version since I just got their data)
  // This prevents them from seeing a notification that I have new data
  batch.update(getUserPlayerLinkDoc(link.theirUserId, linkId), {
    myLastSyncedVersion: myVersion,
  });
  
  await batch.commit();
  
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
 * Subscribe to player links for a user (single listener, not dual OR)
 */
export function subscribeToPlayerLinks(
  userId: string,
  callback: (links: UserPlayerLink[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    callback([]);
    return () => {};
  }
  
  const linksRef = getUserPlayerLinksCollection(userId);
  
  return onSnapshot(
    linksRef,
    (snapshot: QuerySnapshot) => {
      const links = snapshot.docs.map(doc => 
        toUserPlayerLink(doc.data() as FirestoreUserPlayerLink)
      );
      callback(links);
    },
    (error) => {
      console.error('PlayerLinks subscription error:', error);
      onError?.(error);
    }
  );
}

/**
 * Subscribe to pending link count for badge display
 */
export function subscribeToPendingLinkCount(
  userId: string,
  callback: (count: number) => void,
  onError?: (error: Error) => void
): () => void {
  if (!userId) {
    callback(0);
    return () => {};
  }
  
  const linksRef = getUserPlayerLinksCollection(userId);
  const q = query(
    linksRef,
    where('status', '==', 'pending'),
    where('isInitiator', '==', false)
  );
  
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot) => {
      callback(snapshot.size);
    },
    (error) => {
      console.error('Pending links subscription error:', error);
      onError?.(error);
    }
  );
}
