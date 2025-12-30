import { db } from '@/config/firebase';
import { Seat } from '@/types/poker';
import { HandAction, HandState, SidePot, Street } from '@/utils/hand-recording/types';
import {
    collection,
    collectionGroup,
    doc,
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
 * Get the hands subcollection reference for a session
 * Path: /users/{userId}/sessions/{sessionId}/hands
 */
function getHandsCollection(userId: string, sessionId: string) {
  return collection(db, 'users', userId, 'sessions', sessionId, 'hands');
}

/**
 * Get a hand document reference
 */
function getHandDoc(userId: string, sessionId: string, handId: string) {
  return doc(db, 'users', userId, 'sessions', sessionId, 'hands', handId);
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_PAGE_SIZE = 50;
const FIRESTORE_BATCH_LIMIT = 500;

export interface HandRecord {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: number;
  street: Street;
  pot: number;
  sidePots: SidePot[];
  actions: HandAction[];
  seats: Seat[]; // Snapshot of seats at end of hand
  communityCards: string[];
  handCards?: Record<number, string[]>; // Map of seat number to cards
  winners?: number[]; // Seat numbers of winners
}

export interface PaginatedHandsResult {
  hands: HandRecord[];
  hasMore: boolean;
  lastTimestamp: number | null;
}

function docToHandRecord(doc: any): HandRecord {
  const data = doc.data();
  return {
    id: doc.id,
    sessionId: data.sessionId,
    userId: data.userId,
    timestamp: data.timestamp?.toMillis() || Date.now(),
    street: data.street,
    pot: data.pot,
    sidePots: data.sidePots,
    actions: data.actions,
    seats: data.seats,
    communityCards: data.communityCards,
    handCards: data.handCards,
    winners: data.winners
  };
}

export async function getHands(sessionId: string, userId: string): Promise<HandRecord[]> {
  try {
    console.log(`[getHands] Fetching hands for session: ${sessionId}, user: ${userId}`);
    
    if (!userId) {
      console.warn('getHands called without userId. Cannot fetch from subcollection.');
      return [];
    }

    const handsRef = getHandsCollection(userId, sessionId);
    const q = query(handsRef, orderBy('timestamp', 'desc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToHandRecord);
  } catch (error) {
    console.error('Error fetching hands:', error);
    throw error;
  }
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
    const handsGroup = collectionGroup(db, 'hands');
    
    // Build query with optional pagination cursor
    const constraints = [
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(pageSize + 1) // Fetch one extra to check if there are more
    ];
    
    if (afterTimestamp) {
      constraints.push(startAfter(new Date(afterTimestamp)));
    }
    
    const q = query(handsGroup, ...constraints);
    const snapshot = await getDocs(q);
    const allHands = snapshot.docs.map(docToHandRecord);
    
    // Check if there are more results
    const hasMore = allHands.length > pageSize;
    const hands = hasMore ? allHands.slice(0, pageSize) : allHands;
    const lastTimestamp = hands.length > 0 ? hands[hands.length - 1].timestamp : null;
    
    return { hands, hasMore, lastTimestamp };
  } catch (error: any) {
    // Handle missing index error
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.warn('Missing Firestore index for collectionGroup query. Please create the required index.');
      console.log('Falling back to non-paginated query with client-side sorting.');
      
      // Fallback: fetch all and paginate client-side (not ideal but works)
      try {
        const handsGroup = collectionGroup(db, 'hands');
        const q = query(handsGroup, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        let hands = snapshot.docs.map(docToHandRecord);
        hands = hands.sort((a, b) => b.timestamp - a.timestamp);
        
        // Apply client-side pagination
        if (afterTimestamp) {
          hands = hands.filter(h => h.timestamp < afterTimestamp);
        }
        
        const hasMore = hands.length > pageSize;
        const paginatedHands = hands.slice(0, pageSize);
        const lastTimestamp = paginatedHands.length > 0 ? paginatedHands[paginatedHands.length - 1].timestamp : null;
        
        return { hands: paginatedHands, hasMore, lastTimestamp };
      } catch (fallbackError) {
        console.error('Error in fallback fetching:', fallbackError);
        throw fallbackError;
      }
    }
    
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
    // Use collectionGroup to query all hands subcollections for this user
    // Path pattern: /users/{userId}/sessions/*/hands
    const handsGroup = collectionGroup(db, 'hands');
    const q = query(
      handsGroup,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToHandRecord);
  } catch (error: any) {
    // Handle missing index error by falling back to client-side sorting
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.warn('Missing Firestore index for collectionGroup query. Falling back to client-side sorting.');
      console.log('Please create the index using the link in the console logs to improve performance.');
      
      try {
        const handsGroup = collectionGroup(db, 'hands');
        const q = query(handsGroup, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const hands = snapshot.docs.map(docToHandRecord);
        return hands.sort((a, b) => b.timestamp - a.timestamp);
      } catch (fallbackError) {
        console.error('Error in fallback fetching:', fallbackError);
        throw fallbackError;
      }
    }
    
    console.error('Error fetching user hands:', error);
    throw error;
  }
}

export async function saveHand(sessionId: string, userId: string, state: HandState): Promise<string> {
  try {
    const handsRef = getHandsCollection(userId, sessionId);
    const handRef = doc(handsRef);
    const id = handRef.id;
    
    const handData: any = {
      sessionId,
      userId,
      timestamp: serverTimestamp(),
      street: state.street,
      pot: state.pot,
      sidePots: state.sidePots,
      actions: state.actions,
      seats: state.seats,
      communityCards: state.communityCards,
    };

    if (state.handCards) {
      handData.handCards = state.handCards;
    }
    
    if (state.winners) {
      handData.winners = state.winners;
    }
    
    await setDoc(handRef, handData);
    return id;
  } catch (error) {
    console.error('Error saving hand:', error);
    throw error;
  }
}

/**
 * Delete hands from a single session
 */
export async function deleteHands(
  handIds: string[], 
  userId: string, 
  sessionId: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    handIds.forEach(id => {
      const handRef = getHandDoc(userId, sessionId, id);
      batch.delete(handRef);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error deleting hands:', error);
    throw error;
  }
}

/**
 * Delete hands across multiple sessions
 * Accepts an array of HandRecord objects and groups deletions by session
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
        const handRef = getHandDoc(hand.userId, hand.sessionId, hand.id);
        batch.delete(handRef);
      });
      
      await batch.commit();
    }
  } catch (error) {
    console.error('Error deleting hand records:', error);
    throw error;
  }
}
