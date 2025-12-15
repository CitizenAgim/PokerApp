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
    where
} from 'firebase/firestore';

// ============================================
// COLLECTION REFERENCE
// ============================================

const COLLECTION_NAME = 'sessions';
const sessionsCollection = collection(db, COLLECTION_NAME);

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
  createdBy: string;
  table?: Table;
}

function toSession(id: string, data: FirestoreSession): Session & { table?: Table } {
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
    createdBy: data.createdBy,
    table: data.table,
  };
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all sessions for a user
 */
export async function getSessions(userId: string): Promise<Session[]> {
  try {
    const q = query(
      sessionsCollection,
      where('createdBy', '==', userId),
      orderBy('startTime', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => toSession(doc.id, doc.data() as FirestoreSession));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
}

/**
 * Get active sessions for a user
 */
export async function getActiveSessions(userId: string): Promise<Session[]> {
  try {
    const q = query(
      sessionsCollection,
      where('createdBy', '==', userId),
      where('isActive', '==', true),
      orderBy('startTime', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => toSession(doc.id, doc.data() as FirestoreSession));
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    throw error;
  }
}

/**
 * Get a single session by ID
 */
export async function getSession(sessionId: string): Promise<(Session & { table?: Table }) | null> {
  try {
    const sessionDoc = await getDoc(doc(db, COLLECTION_NAME, sessionId));
    
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
  session: Omit<Session, 'id' | 'startTime' | 'endTime' | 'isActive'>,
  table?: Table, // Deprecated: Table data is no longer synced to cloud
  sessionId?: string
): Promise<Session> {
  try {
    const id = sessionId || doc(sessionsCollection).id;
    const sessionRef = doc(db, COLLECTION_NAME, id);
    
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
      createdBy: session.createdBy,
    };
    
    // Table data is explicitly excluded from cloud sync
    
    await setDoc(sessionRef, data);
    
    return {
      id,
      name: session.name,
      location: session.location,
      stakes: session.stakes,
      startTime: Date.now(),
      isActive: true,
      createdBy: session.createdBy,
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
  sessionId: string,
  updates: Partial<Session> // Changed to allow all fields including createdBy
): Promise<void> {
  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    
    const data: Record<string, unknown> = {};
    
    // Map all possible fields to ensure we can fully recreate the session if it's new
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
    if (updates.createdBy !== undefined) data.createdBy = updates.createdBy;
    
    if (updates.startTime !== undefined) data.startTime = Timestamp.fromMillis(updates.startTime);
    if (updates.endTime !== undefined) data.endTime = Timestamp.fromMillis(updates.endTime);
    if (updates.duration !== undefined) data.duration = updates.duration;
    
    // Use setDoc with merge: true instead of updateDoc to handle cases where
    // the document might not exist yet (e.g. creation sync failed or is pending)
    await setDoc(sessionRef, data, { merge: true });
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

/**
 * End a session
 */
export async function endSession(sessionId: string, cashOut?: number, endTime?: number): Promise<void> {
  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    
    const data: any = {
      isActive: false,
      endTime: endTime ? Timestamp.fromMillis(endTime) : serverTimestamp(),
    };

    if (cashOut !== undefined) {
      data.cashOut = cashOut;
    }
    
    // Use setDoc with merge: true for safety
    await setDoc(sessionRef, data, { merge: true });
  } catch (error) {
    console.error('Error ending session:', error);
    throw error;
  }
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, sessionId));
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
}

// Deprecated: Table data is no longer synced to cloud
export async function updateTable(sessionId: string, table: Table): Promise<void> {
  // No-op
  console.warn('updateTable is deprecated and no longer syncs to cloud');
}

// Deprecated: Table data is no longer synced to cloud
export async function updateButtonPosition(
  sessionId: string,
  buttonPosition: number
): Promise<void> {
  // No-op
  console.warn('updateButtonPosition is deprecated and no longer syncs to cloud');
}

// Deprecated: Table data is no longer synced to cloud
export async function assignPlayerToSeat(
  sessionId: string,
  seatNumber: number,
  playerId: string | null
): Promise<void> {
  // No-op
  console.warn('assignPlayerToSeat is deprecated and no longer syncs to cloud');
}
