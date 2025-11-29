import { db } from '@/config/firebase';
import { Session, Table } from '@/types/poker';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
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
  stakes?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  isActive: boolean;
  createdBy: string;
  table?: Table;
}

function toSession(id: string, data: FirestoreSession): Session & { table?: Table } {
  return {
    id,
    name: data.name,
    location: data.location,
    stakes: data.stakes,
    startTime: data.startTime?.toMillis() || Date.now(),
    endTime: data.endTime?.toMillis(),
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
  table?: Table,
  sessionId?: string
): Promise<Session> {
  try {
    const id = sessionId || doc(sessionsCollection).id;
    const sessionRef = doc(db, COLLECTION_NAME, id);
    
    const data: Record<string, unknown> = {
      name: session.name,
      location: session.location || null,
      stakes: session.stakes || null,
      startTime: serverTimestamp(),
      isActive: true,
      createdBy: session.createdBy,
    };
    
    if (table) {
      data.table = table;
    }
    
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
  updates: Partial<Omit<Session, 'id' | 'startTime' | 'createdBy'>>
): Promise<void> {
  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    
    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.location !== undefined) data.location = updates.location;
    if (updates.stakes !== undefined) data.stakes = updates.stakes;
    if (updates.isActive !== undefined) data.isActive = updates.isActive;
    if (updates.endTime !== undefined) data.endTime = Timestamp.fromMillis(updates.endTime);
    
    await updateDoc(sessionRef, data);
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

/**
 * End a session
 */
export async function endSession(sessionId: string): Promise<void> {
  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    
    await updateDoc(sessionRef, {
      isActive: false,
      endTime: serverTimestamp(),
    });
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

/**
 * Update table configuration for a session
 */
export async function updateTable(sessionId: string, table: Table): Promise<void> {
  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    await updateDoc(sessionRef, { table });
  } catch (error) {
    console.error('Error updating table:', error);
    throw error;
  }
}

/**
 * Update button position
 */
export async function updateButtonPosition(
  sessionId: string,
  buttonPosition: number
): Promise<void> {
  try {
    const sessionRef = doc(db, COLLECTION_NAME, sessionId);
    await updateDoc(sessionRef, { 'table.buttonPosition': buttonPosition });
  } catch (error) {
    console.error('Error updating button position:', error);
    throw error;
  }
}

/**
 * Assign player to seat
 */
export async function assignPlayerToSeat(
  sessionId: string,
  seatNumber: number,
  playerId: string | null
): Promise<void> {
  try {
    const sessionDoc = await getSession(sessionId);
    if (!sessionDoc || !sessionDoc.table) {
      throw new Error('Session or table not found');
    }
    
    const updatedSeats = sessionDoc.table.seats.map(seat => {
      if (seat.seatNumber === seatNumber) {
        return { ...seat, playerId: playerId || undefined };
      }
      return seat;
    });
    
    await updateTable(sessionId, {
      ...sessionDoc.table,
      seats: updatedSeats,
    });
  } catch (error) {
    console.error('Error assigning player to seat:', error);
    throw error;
  }
}
