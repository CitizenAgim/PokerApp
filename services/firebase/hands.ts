import { db } from '@/config/firebase';
import { Seat } from '@/types/poker';
import { HandAction, HandState, SidePot, Street } from '@/utils/hand-recording/types';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    startAfter,
    where,
    writeBatch
} from 'firebase/firestore';

// ============================================
// COLLECTION HELPERS
// ============================================

/**
 * Get the hands collection reference for a user
 * NEW Path: /users/{userId}/hands
 */
function getHandsCollection(userId: string) {
  return collection(db, 'users', userId, 'hands');
}

/**
 * Get a hand document reference
 */
function getHandDoc(userId: string, handId: string) {
  return doc(db, 'users', userId, 'hands', handId);
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_PAGE_SIZE = 50;
const FIRESTORE_BATCH_LIMIT = 500;

// ============================================
// TYPES
// ============================================

export interface HandRecord {
  id: string;
  userId: string;
  sessionId: string | null; // null = standalone hand, not tied to session
  timestamp: number;
  street: Street;
  pot: number;
  sidePots: SidePot[];
  actions: HandAction[];
  seats: Seat[]; // Snapshot of seats at end of hand
  communityCards: string[];
  handCards?: Record<number, string[]>; // Map of seat number to cards
  heroSeat?: number; // Seat number of the hero
  buttonPosition: number; // Seat number with the button (1-9)
  winners?: number[]; // Seat numbers of winners
  
  // Denormalized session info (for display without fetching session)
  sessionName?: string;
  stakes?: string;
  location?: string;
}

export interface SessionInfo {
  sessionId: string;
  sessionName?: string;
  stakes?: string;
  location?: string;
}

export interface PaginatedHandsResult {
  hands: HandRecord[];
  hasMore: boolean;
  lastTimestamp: number | null;
}

// ============================================
// HELPERS
// ============================================

function docToHandRecord(doc: any): HandRecord {
  const data = doc.data();
  return {
    id: doc.id,
    sessionId: data.sessionId ?? null,
    userId: data.userId,
    timestamp: data.timestamp?.toMillis() || Date.now(),
    street: data.street,
    pot: data.pot,
    sidePots: data.sidePots || [],
    actions: data.actions || [],
    seats: data.seats || [],
    communityCards: data.communityCards || [],
    handCards: data.handCards,
    heroSeat: data.heroSeat,
    buttonPosition: data.buttonPosition || 1,
    winners: data.winners,
    // Denormalized session info
    sessionName: data.sessionName,
    stakes: data.stakes,
    location: data.location,
  };
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get a single hand by ID
 */
export async function getHandById(handId: string, userId: string): Promise<HandRecord | null> {
  try {
    if (!userId || !handId) {
      console.warn('getHandById called without userId or handId');
      return null;
    }

    const handRef = getHandDoc(userId, handId);
    const snapshot = await getDoc(handRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return docToHandRecord(snapshot);
  } catch (error) {
    console.error('Error fetching hand by id:', error);
    throw error;
  }
}

/**
 * Get hands for a specific session
 */
export async function getHandsBySession(sessionId: string, userId: string): Promise<HandRecord[]> {
  try {
    console.log(`[getHandsBySession] Fetching hands for session: ${sessionId}, user: ${userId}`);
    
    if (!userId) {
      console.warn('getHandsBySession called without userId.');
      return [];
    }

    const handsRef = getHandsCollection(userId);
    const q = query(
      handsRef, 
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToHandRecord);
  } catch (error) {
    console.error('Error fetching hands by session:', error);
    throw error;
  }
}

/**
 * @deprecated Use getHandsBySession instead
 * Keeping for backward compatibility during transition
 */
export async function getHands(sessionId: string, userId: string): Promise<HandRecord[]> {
  return getHandsBySession(sessionId, userId);
}

/**
 * Get user hands with pagination support
 * @param userId - The user's ID
 * @param pageSize - Number of hands to fetch (default 50)
 * @param afterTimestamp - Fetch hands older than this timestamp (for pagination)
 */
export async function getUserHandsPaginated(
  userId: string, 
  pageSize: number = DEFAULT_PAGE_SIZE,
  afterTimestamp?: number
): Promise<PaginatedHandsResult> {
  if (!userId) {
    console.warn('getUserHandsPaginated called with empty userId');
    return { hands: [], hasMore: false, lastTimestamp: null };
  }

  try {
    const handsRef = getHandsCollection(userId);
    
    // Build query - now much simpler without collectionGroup
    let q;
    if (afterTimestamp) {
      q = query(
        handsRef,
        orderBy('timestamp', 'desc'),
        startAfter(new Date(afterTimestamp)),
        limit(pageSize + 1)
      );
    } else {
      q = query(
        handsRef,
        orderBy('timestamp', 'desc'),
        limit(pageSize + 1)
      );
    }
    
    const snapshot = await getDocs(q);
    const allHands = snapshot.docs.map(docToHandRecord);
    
    // Check if there are more results
    const hasMore = allHands.length > pageSize;
    const hands = hasMore ? allHands.slice(0, pageSize) : allHands;
    const lastTimestamp = hands.length > 0 ? hands[hands.length - 1].timestamp : null;
    
    return { hands, hasMore, lastTimestamp };
  } catch (error: any) {
    console.error('Error fetching user hands:', error);
    throw error;
  }
}

/**
 * Get all user hands (no pagination) - use sparingly for small datasets
 * @deprecated Prefer getUserHandsPaginated for better performance
 */
export async function getUserHands(userId: string): Promise<HandRecord[]> {
  if (!userId) {
    console.warn('getUserHands called with empty userId');
    return [];
  }

  try {
    const handsRef = getHandsCollection(userId);
    const q = query(handsRef, orderBy('timestamp', 'desc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToHandRecord);
  } catch (error) {
    console.error('Error fetching user hands:', error);
    throw error;
  }
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Save a hand record
 * @param userId - The user's ID
 * @param state - The hand state to save
 * @param sessionInfo - Optional session info (null for standalone hands)
 */
export async function saveHand(
  userId: string, 
  state: HandState, 
  sessionInfo?: SessionInfo | null
): Promise<string> {
  try {
    const handsRef = getHandsCollection(userId);
    const handRef = doc(handsRef);
    const id = handRef.id;
    
    const handData: Record<string, any> = {
      userId,
      sessionId: sessionInfo?.sessionId ?? null,
      timestamp: serverTimestamp(),
      street: state.street,
      pot: state.pot,
      sidePots: state.sidePots || [],
      actions: state.actions || [],
      seats: state.seats || [],
      communityCards: state.communityCards || [],
      buttonPosition: state.buttonPosition || 1,
    };

    // Add optional fields
    if (state.handCards) {
      handData.handCards = state.handCards;
    }

    if (state.heroSeat !== undefined) {
      handData.heroSeat = state.heroSeat;
    }
    
    if (state.winners) {
      handData.winners = state.winners;
    }
    
    // Add denormalized session info
    if (sessionInfo) {
      if (sessionInfo.sessionName) handData.sessionName = sessionInfo.sessionName;
      if (sessionInfo.stakes) handData.stakes = sessionInfo.stakes;
      if (sessionInfo.location) handData.location = sessionInfo.location;
    }
    
    await setDoc(handRef, handData);
    return id;
  } catch (error) {
    console.error('Error saving hand:', error);
    throw error;
  }
}

/**
 * Clear sessionId from hands when a session is deleted
 * The hands become "orphaned" but are preserved
 */
export async function clearSessionFromHands(userId: string, sessionId: string): Promise<void> {
  try {
    const handsRef = getHandsCollection(userId);
    const q = query(handsRef, where('sessionId', '==', sessionId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log(`No hands found for session ${sessionId}`);
      return;
    }
    
    // Split into chunks to respect Firestore batch limit
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      
      chunk.forEach(doc => {
        batch.update(doc.ref, { sessionId: null });
      });
      
      await batch.commit();
    }
    
    console.log(`Cleared sessionId from ${docs.length} hands`);
  } catch (error) {
    console.error('Error clearing session from hands:', error);
    throw error;
  }
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete specific hands by ID
 */
export async function deleteHands(handIds: string[], userId: string): Promise<void> {
  if (!handIds.length) return;
  
  try {
    // Split into chunks to respect Firestore batch limit
    for (let i = 0; i < handIds.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = handIds.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      
      chunk.forEach(id => {
        const handRef = getHandDoc(userId, id);
        batch.delete(handRef);
      });
      
      await batch.commit();
    }
  } catch (error) {
    console.error('Error deleting hands:', error);
    throw error;
  }
}

/**
 * Delete hands by HandRecord objects
 * Handles Firestore's 500 operation batch limit automatically
 */
export async function deleteHandRecords(hands: HandRecord[]): Promise<void> {
  if (!hands.length) return;
  
  try {
    // Split into chunks of FIRESTORE_BATCH_LIMIT to respect Firestore limits
    for (let i = 0; i < hands.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = hands.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      
      chunk.forEach(hand => {
        const handRef = getHandDoc(hand.userId, hand.id);
        batch.delete(handRef);
      });
      
      await batch.commit();
    }
  } catch (error) {
    console.error('Error deleting hand records:', error);
    throw error;
  }
}
