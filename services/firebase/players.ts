import { db } from '@/config/firebase';
import { CreatePlayer, Player, UpdatePlayer } from '@/types/poker';
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
    where,
} from 'firebase/firestore';

// ============================================
// COLLECTION REFERENCE
// ============================================

const COLLECTION_NAME = 'players';
const playersCollection = collection(db, COLLECTION_NAME);

// ============================================
// TYPE CONVERTERS
// ============================================

interface FirestorePlayer {
  name: string;
  photoUrl?: string;
  notes?: string;
  createdBy: string;
  sharedWith: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function toPlayer(id: string, data: FirestorePlayer): Player {
  return {
    id,
    name: data.name,
    photoUrl: data.photoUrl,
    notes: data.notes,
    createdBy: data.createdBy,
    sharedWith: data.sharedWith || [],
    createdAt: data.createdAt?.toMillis() || Date.now(),
    updatedAt: data.updatedAt?.toMillis() || Date.now(),
  };
}

function toFirestoreData(player: CreatePlayer | UpdatePlayer): Partial<FirestorePlayer> {
  const data: Record<string, unknown> = {};
  
  if ('name' in player && player.name !== undefined) data.name = player.name;
  if ('photoUrl' in player) data.photoUrl = player.photoUrl;
  if ('notes' in player) data.notes = player.notes;
  if ('createdBy' in player && player.createdBy !== undefined) data.createdBy = player.createdBy;
  if ('sharedWith' in player && player.sharedWith !== undefined) data.sharedWith = player.sharedWith;
  
  return data as Partial<FirestorePlayer>;
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all players created by or shared with the current user
 */
export async function getPlayers(userId: string): Promise<Player[]> {
  try {
    // Get players created by user
    const createdByQuery = query(
      playersCollection,
      where('createdBy', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const createdBySnapshot = await getDocs(createdByQuery);
    const createdPlayers = createdBySnapshot.docs.map(doc => 
      toPlayer(doc.id, doc.data() as FirestorePlayer)
    );
    
    // Get players shared with user
    const sharedWithQuery = query(
      playersCollection,
      where('sharedWith', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const sharedSnapshot = await getDocs(sharedWithQuery);
    const sharedPlayers = sharedSnapshot.docs.map(doc =>
      toPlayer(doc.id, doc.data() as FirestorePlayer)
    );
    
    // Combine and deduplicate
    const allPlayers = [...createdPlayers, ...sharedPlayers];
    const uniquePlayers = Array.from(
      new Map(allPlayers.map(p => [p.id, p])).values()
    );
    
    return uniquePlayers;
  } catch (error) {
    console.error('Error fetching players:', error);
    throw error;
  }
}

/**
 * Get a single player by ID
 */
export async function getPlayer(playerId: string): Promise<Player | null> {
  try {
    const playerDoc = await getDoc(doc(db, COLLECTION_NAME, playerId));
    
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
  player: CreatePlayer,
  playerId?: string
): Promise<Player> {
  try {
    const id = playerId || doc(playersCollection).id;
    const playerRef = doc(db, COLLECTION_NAME, id);
    
    const data = {
      ...toFirestoreData(player),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(playerRef, data);
    
    // Return the created player
    return {
      id,
      name: player.name,
      photoUrl: player.photoUrl,
      notes: player.notes,
      createdBy: player.createdBy,
      sharedWith: player.sharedWith || [],
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
export async function updatePlayer(player: UpdatePlayer): Promise<void> {
  try {
    const playerRef = doc(db, COLLECTION_NAME, player.id);
    
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
export async function deletePlayer(playerId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, playerId));
  } catch (error) {
    console.error('Error deleting player:', error);
    throw error;
  }
}

/**
 * Share a player with another user
 */
export async function sharePlayer(
  playerId: string,
  shareWithUserId: string
): Promise<void> {
  try {
    const playerRef = doc(db, COLLECTION_NAME, playerId);
    const playerDoc = await getDoc(playerRef);
    
    if (!playerDoc.exists()) {
      throw new Error('Player not found');
    }
    
    const data = playerDoc.data() as FirestorePlayer;
    const sharedWith = data.sharedWith || [];
    
    if (!sharedWith.includes(shareWithUserId)) {
      sharedWith.push(shareWithUserId);
      await updateDoc(playerRef, { 
        sharedWith,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error sharing player:', error);
    throw error;
  }
}

/**
 * Unshare a player with a user
 */
export async function unsharePlayer(
  playerId: string,
  unshareWithUserId: string
): Promise<void> {
  try {
    const playerRef = doc(db, COLLECTION_NAME, playerId);
    const playerDoc = await getDoc(playerRef);
    
    if (!playerDoc.exists()) {
      throw new Error('Player not found');
    }
    
    const data = playerDoc.data() as FirestorePlayer;
    const sharedWith = (data.sharedWith || []).filter(
      id => id !== unshareWithUserId
    );
    
    await updateDoc(playerRef, { 
      sharedWith,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error unsharing player:', error);
    throw error;
  }
}
