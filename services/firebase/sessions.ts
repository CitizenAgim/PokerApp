/**
 * Firebase Sessions Service - Subcollection Structure
 * Path: /users/{userId}/sessions/{sessionId}
 * 
 * Sessions are stored as subcollections under each user for:
 * - Automatic scoping (no need to filter by createdBy)
 * - Simpler security rules (path-based)
 * - Better cost efficiency at scale
 * - Easy sharing support via isShared flag
 */

import { db } from '@/config/firebase';
import { Session, Table } from '@/types/poker';
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
    where,
} from 'firebase/firestore';
import { checkRateLimit } from '../rateLimit';
import { validateSessionData } from '../validation';

// ============================================
// COLLECTION HELPERS
// ============================================

/**
 * Get the sessions collection reference for a user
 */
function getSessionsCollection(userId: string) {
  return collection(db, 'users', userId, 'sessions');
}

/**
 * Get a session document reference
 */
function getSessionDoc(userId: string, sessionId: string) {
  return doc(db, 'users', userId, 'sessions', sessionId);
}

// ============================================
// TYPE CONVERTERS
// ============================================

interface FirestoreSession {
  name: string;
  location?: string;
  gameType?: string;
  stakes?: string;
  smallBlind?: number;
  bigBlind?: number;
  thirdBlind?: number;
  ante?: number;
  buyIn?: number;
  cashOut?: number;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  isActive: boolean;
  isShared?: boolean;
  table?: Table;
}

function toSession(id: string, data: FirestoreSession): Session & { table?: Table; isShared?: boolean } {
  return {
    id,
    name: data.name,
    location: data.location,
    gameType: data.gameType,
    stakes: data.stakes,
    smallBlind: data.smallBlind,
    bigBlind: data.bigBlind,
    thirdBlind: data.thirdBlind,
    ante: data.ante,
    buyIn: data.buyIn,
    cashOut: data.cashOut,
    startTime: data.startTime?.toMillis() || Date.now(),
    endTime: data.endTime?.toMillis(),
    duration: data.duration,
    isActive: data.isActive,
    isShared: data.isShared || false,
    createdBy: '', // Not needed in subcollection model - derived from path
    table: data.table,
  };
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all sessions for a user
 */
export async function getSessions(userId: string): Promise<(Session & { isShared?: boolean })[]> {
  if (!userId) return [];

  try {
    const sessionsRef = getSessionsCollection(userId);
    const q = query(sessionsRef, orderBy('startTime', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => 
      toSession(doc.id, doc.data() as FirestoreSession)
    );
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

/**
 * Get active sessions for a user
 */
export async function getActiveSessions(userId: string): Promise<(Session & { isShared?: boolean })[]> {
  if (!userId) return [];

  try {
    const sessionsRef = getSessionsCollection(userId);
    const q = query(
      sessionsRef,
      where('isActive', '==', true),
      orderBy('startTime', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      toSession(doc.id, doc.data() as FirestoreSession)
    );
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return [];
  }
}

/**
 * Get a single session by ID
 */
export async function getSession(
  userId: string,
  sessionId: string
): Promise<(Session & { table?: Table; isShared?: boolean }) | null> {
  try {
    const sessionDoc = await getDoc(getSessionDoc(userId, sessionId));
    
    if (!sessionDoc.exists()) {
      return null;
    }
    
    return toSession(sessionDoc.id, sessionDoc.data() as FirestoreSession);
  } catch (error) {
    console.error('Error fetching session:', error);
    throw error;
  }
}

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  session: Omit<Session, 'id' | 'startTime' | 'endTime' | 'isActive'>,
  sessionId?: string
): Promise<Session & { isShared?: boolean }> {
  // Rate limiting
  checkRateLimit(userId, 'CREATE_SESSION');
  
  // Validation
  const validation = validateSessionData(session);
  if (!validation.valid) {
    throw new Error(`Invalid session data: ${validation.errors.join(', ')}`);
  }
  
  try {
    const sessionsRef = getSessionsCollection(userId);
    const id = sessionId || doc(sessionsRef).id;
    const sessionRef = getSessionDoc(userId, id);
    
    const data: Record<string, unknown> = {
      name: session.name,
      location: session.location || null,
      gameType: session.gameType || null,
      stakes: session.stakes || null,
      smallBlind: session.smallBlind || null,
      bigBlind: session.bigBlind || null,
      thirdBlind: session.thirdBlind || null,
      ante: session.ante || null,
      buyIn: session.buyIn || null,
      startTime: serverTimestamp(),
      isActive: true,
      isShared: false,  // Default to not shared
    };
    
    await setDoc(sessionRef, data);
    
    return {
      id,
      name: session.name,
      location: session.location,
      stakes: session.stakes,
      startTime: Date.now(),
      isActive: true,
      isShared: false,
      createdBy: userId,
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Update a session
 */
export async function updateSession(
  userId: string,
  sessionId: string,
  updates: Partial<Session>
): Promise<void> {
  // Rate limiting
  checkRateLimit(userId, 'UPDATE_SESSION');
  
  // Validation
  const validation = validateSessionData(updates);
  if (!validation.valid) {
    throw new Error(`Invalid session data: ${validation.errors.join(', ')}`);
  }
  
  try {
    console.log(`[Firebase] Updating session ${sessionId} with ${Object.keys(updates).length} fields`);
    const sessionRef = getSessionDoc(userId, sessionId);
    
    const data: Record<string, unknown> = {};
    
    // Map all possible fields
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.location !== undefined) data.location = updates.location;
    if (updates.gameType !== undefined) data.gameType = updates.gameType;
    if (updates.stakes !== undefined) data.stakes = updates.stakes;
    if (updates.smallBlind !== undefined) data.smallBlind = updates.smallBlind;
    if (updates.bigBlind !== undefined) data.bigBlind = updates.bigBlind;
    if (updates.thirdBlind !== undefined) data.thirdBlind = updates.thirdBlind;
    if (updates.ante !== undefined) data.ante = updates.ante;
    if (updates.buyIn !== undefined) data.buyIn = updates.buyIn;
    if (updates.cashOut !== undefined) data.cashOut = updates.cashOut;
    if (updates.isActive !== undefined) data.isActive = updates.isActive;
    
    if (updates.startTime !== undefined) {
      data.startTime = Timestamp.fromMillis(updates.startTime);
    }
    if (updates.endTime !== undefined) {
      data.endTime = Timestamp.fromMillis(updates.endTime);
    }
    if (updates.duration !== undefined) data.duration = updates.duration;
    
    await setDoc(sessionRef, data, { merge: true });
    console.log(`[Firebase] Successfully updated session ${sessionId}`);
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

/**
 * End a session
 */
export async function endSession(
  userId: string,
  sessionId: string,
  cashOut?: number,
  endTime?: number
): Promise<void> {
  try {
    const sessionRef = getSessionDoc(userId, sessionId);
    
    const data: Record<string, unknown> = {
      isActive: false,
      endTime: endTime ? Timestamp.fromMillis(endTime) : serverTimestamp(),
    };

    if (cashOut !== undefined) {
      data.cashOut = cashOut;
    }
    
    await setDoc(sessionRef, data, { merge: true });
  } catch (error) {
    console.error('Error ending session:', error);
    throw error;
  }
}

/**
 * Delete a session
 */
export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  // Rate limiting
  checkRateLimit(userId, 'DELETE_SESSION');
  
  try {
    await deleteDoc(getSessionDoc(userId, sessionId));
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

// ============================================
// SHARING OPERATIONS
// ============================================

/**
 * Toggle session sharing
 */
export async function toggleSessionSharing(
  userId: string,
  sessionId: string,
  isShared: boolean
): Promise<void> {
  try {
    const sessionRef = getSessionDoc(userId, sessionId);
    
    await setDoc(sessionRef, { isShared }, { merge: true });
  } catch (error) {
    console.error('Error toggling session sharing:', error);
    throw error;
  }
}

// ============================================
// DEPRECATED (Table data not synced to cloud)
// ============================================

export async function updateTable(sessionId: string, table: Table): Promise<void> {
  console.warn('updateTable is deprecated and no longer syncs to cloud');
}

export async function updateButtonPosition(
  sessionId: string,
  buttonPosition: number
): Promise<void> {
  console.warn('updateButtonPosition is deprecated and no longer syncs to cloud');
}

export async function assignPlayerToSeat(
  sessionId: string,
  seatNumber: number,
  playerId: string | null
): Promise<void> {
  console.warn('assignPlayerToSeat is deprecated and no longer syncs to cloud');
}
