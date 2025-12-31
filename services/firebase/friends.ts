/**
 * Firebase Friends Service
 * 
 * Handles friend code generation, friend requests, and friend management.
 * 
 * Collections:
 * - friendRequests/{requestId} - Friend request documents
 * - users/{userId}/friends/{friendId} - Friend subcollections
 */

import { db } from '@/config/firebase';
import { Friend, FRIEND_CODE_CONFIG, FriendRequest } from '@/types/friends';
import { User } from '@/types/poker';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';

// ============================================
// FRIEND CODE GENERATION
// ============================================

/**
 * Generate a random friend code
 */
function generateRandomCode(): string {
  const { CHARSET, LENGTH } = FRIEND_CODE_CONFIG;
  let code = '';
  for (let i = 0; i < LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

/**
 * Generate a unique friend code (checks for collisions)
 */
export async function generateUniqueFriendCode(): Promise<string> {
  const { MAX_GENERATION_ATTEMPTS } = FRIEND_CODE_CONFIG;
  
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateRandomCode();
    
    // Check if code already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('friendCode', '==', code));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return code;
    }
    
    console.log(`Friend code collision on attempt ${attempt + 1}, retrying...`);
  }
  
  throw new Error('Failed to generate unique friend code after max attempts');
}

/**
 * Assign a friend code to a user (for new users or migration)
 */
export async function assignFriendCode(userId: string): Promise<string> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data();
  
  // Return existing code if user already has one
  if (userData.friendCode) {
    return userData.friendCode;
  }
  
  // Generate and save new code
  const friendCode = await generateUniqueFriendCode();
  
  await updateDoc(userRef, {
    friendCode,
    friendsCount: userData.friendsCount || 0,
  });
  
  return friendCode;
}

/**
 * Get current user's friend code (creates one if doesn't exist)
 */
export async function getOrCreateFriendCode(userId: string): Promise<string> {
  return assignFriendCode(userId);
}

// ============================================
// USER LOOKUP
// ============================================

/**
 * Find a user by their friend code
 */
export async function findUserByFriendCode(friendCode: string): Promise<User | null> {
  const normalizedCode = friendCode.toUpperCase().trim();
  
  console.log('[Friends] findUserByFriendCode called with:', normalizedCode);
  
  if (normalizedCode.length !== FRIEND_CODE_CONFIG.LENGTH) {
    console.log('[Friends] Code length invalid:', normalizedCode.length);
    return null;
  }
  
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('friendCode', '==', normalizedCode));
  
  console.log('[Friends] Executing query for friendCode:', normalizedCode);
  const snapshot = await getDocs(q);
  
  console.log('[Friends] Query returned', snapshot.size, 'results');
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  const data = doc.data();
  
  console.log('[Friends] Found user:', doc.id, data.displayName);
  
  // Handle createdAt in different formats (Timestamp, number, or undefined)
  let createdAt = Date.now();
  if (data.createdAt) {
    if (typeof data.createdAt.toMillis === 'function') {
      createdAt = data.createdAt.toMillis();
    } else if (typeof data.createdAt === 'number') {
      createdAt = data.createdAt;
    }
  }
  
  return {
    id: doc.id,
    email: data.email || '',
    displayName: data.displayName || data.email?.split('@')[0] || 'Unknown',
    photoUrl: data.photoUrl,
    friendCode: data.friendCode,
    friendsCount: data.friendsCount || 0,
    createdAt,
  };
}

// ============================================
// FRIEND REQUESTS
// ============================================

interface FirestoreFriendRequest {
  fromUserId: string;
  fromUserName: string;
  fromUserCode: string;
  toUserId: string;
  toUserName: string;
  toUserCode: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

function toFriendRequest(id: string, data: FirestoreFriendRequest): FriendRequest {
  return {
    id,
    fromUserId: data.fromUserId,
    fromUserName: data.fromUserName,
    fromUserCode: data.fromUserCode,
    toUserId: data.toUserId,
    toUserName: data.toUserName,
    toUserCode: data.toUserCode,
    status: data.status,
    createdAt: data.createdAt?.toMillis() || Date.now(),
    updatedAt: data.updatedAt?.toMillis() || Date.now(),
  };
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  fromUser: User,
  toUser: User
): Promise<FriendRequest> {
  // Validation checks
  if (fromUser.id === toUser.id) {
    throw new Error("You can't add yourself as a friend");
  }
  
  // Check if already friends
  const existingFriend = await getFriend(fromUser.id, toUser.id);
  if (existingFriend) {
    throw new Error("You're already friends with this user");
  }
  
  // Check for existing pending request (either direction)
  const existingRequest = await getExistingRequest(fromUser.id, toUser.id);
  if (existingRequest) {
    if (existingRequest.status === 'pending') {
      throw new Error('Friend request already sent');
    }
  }
  
  // Check friend limits
  const fromUserFriendsCount = fromUser.friendsCount || 0;
  const toUserFriendsCount = toUser.friendsCount || 0;
  
  if (fromUserFriendsCount >= FRIEND_CODE_CONFIG.MAX_FRIENDS) {
    throw new Error("You've reached the 100 friend limit");
  }
  
  if (toUserFriendsCount >= FRIEND_CODE_CONFIG.MAX_FRIENDS) {
    throw new Error('This user has reached their friend limit');
  }
  
  // Create the request
  const requestsRef = collection(db, 'friendRequests');
  const requestDoc = doc(requestsRef);
  
  const requestData: Omit<FirestoreFriendRequest, 'createdAt' | 'updatedAt'> = {
    fromUserId: fromUser.id,
    fromUserName: fromUser.displayName || fromUser.email?.split('@')[0] || 'Unknown',
    fromUserCode: fromUser.friendCode || '',
    toUserId: toUser.id,
    toUserName: toUser.displayName || toUser.email?.split('@')[0] || 'Unknown',
    toUserCode: toUser.friendCode || '',
    status: 'pending',
  };
  
  await setDoc(requestDoc, {
    ...requestData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  return {
    id: requestDoc.id,
    ...requestData,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Check for existing request between two users
 */
async function getExistingRequest(
  userId1: string,
  userId2: string
): Promise<FriendRequest | null> {
  const requestsRef = collection(db, 'friendRequests');
  
  // Check both directions
  const q1 = query(
    requestsRef,
    where('fromUserId', '==', userId1),
    where('toUserId', '==', userId2),
    where('status', '==', 'pending')
  );
  
  const q2 = query(
    requestsRef,
    where('fromUserId', '==', userId2),
    where('toUserId', '==', userId1),
    where('status', '==', 'pending')
  );
  
  const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  
  if (!snapshot1.empty) {
    const doc = snapshot1.docs[0];
    return toFriendRequest(doc.id, doc.data() as FirestoreFriendRequest);
  }
  
  if (!snapshot2.empty) {
    const doc = snapshot2.docs[0];
    return toFriendRequest(doc.id, doc.data() as FirestoreFriendRequest);
  }
  
  return null;
}

/**
 * Get pending friend requests received by a user
 */
export async function getPendingRequests(userId: string): Promise<FriendRequest[]> {
  const requestsRef = collection(db, 'friendRequests');
  const q = query(
    requestsRef,
    where('toUserId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    toFriendRequest(doc.id, doc.data() as FirestoreFriendRequest)
  );
}

/**
 * Get sent friend requests by a user
 */
export async function getSentRequests(userId: string): Promise<FriendRequest[]> {
  const requestsRef = collection(db, 'friendRequests');
  const q = query(
    requestsRef,
    where('fromUserId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => 
    toFriendRequest(doc.id, doc.data() as FirestoreFriendRequest)
  );
}

/**
 * Subscribe to pending requests count
 */
export function subscribeToPendingRequestsCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const requestsRef = collection(db, 'friendRequests');
  const q = query(
    requestsRef,
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, 'friendRequests', requestId);
  const requestDoc = await getDoc(requestRef);
  
  if (!requestDoc.exists()) {
    throw new Error('Friend request not found');
  }
  
  const request = requestDoc.data() as FirestoreFriendRequest;
  
  if (request.status !== 'pending') {
    throw new Error('This request has already been handled');
  }
  
  // Use batch to ensure atomic operation
  const batch = writeBatch(db);
  
  // Update request status
  batch.update(requestRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
  
  // Add to both users' friend lists
  const friend1Ref = doc(db, 'users', request.fromUserId, 'friends', request.toUserId);
  const friend2Ref = doc(db, 'users', request.toUserId, 'friends', request.fromUserId);
  
  batch.set(friend1Ref, {
    odUserId: request.toUserId,
    displayName: request.toUserName,
    friendCode: request.toUserCode,
    addedAt: serverTimestamp(),
  });
  
  batch.set(friend2Ref, {
    odUserId: request.fromUserId,
    displayName: request.fromUserName,
    friendCode: request.fromUserCode,
    addedAt: serverTimestamp(),
  });
  
  // Increment friend counts
  const user1Ref = doc(db, 'users', request.fromUserId);
  const user2Ref = doc(db, 'users', request.toUserId);
  
  batch.update(user1Ref, { friendsCount: increment(1) });
  batch.update(user2Ref, { friendsCount: increment(1) });
  
  await batch.commit();
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, 'friendRequests', requestId);
  
  await updateDoc(requestRef, {
    status: 'declined',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cancel a sent friend request
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  const requestRef = doc(db, 'friendRequests', requestId);
  await deleteDoc(requestRef);
}

// ============================================
// FRIENDS LIST
// ============================================

interface FirestoreFriend {
  odUserId: string;
  displayName: string;
  friendCode: string;
  addedAt: Timestamp;
}

function toFriend(data: FirestoreFriend): Friend {
  return {
    odUserId: data.odUserId,
    displayName: data.displayName,
    friendCode: data.friendCode,
    addedAt: data.addedAt?.toMillis() || Date.now(),
  };
}

/**
 * Get all friends for a user
 */
export async function getFriends(userId: string): Promise<Friend[]> {
  const friendsRef = collection(db, 'users', userId, 'friends');
  const q = query(friendsRef, orderBy('addedAt', 'desc'));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => toFriend(doc.data() as FirestoreFriend));
}

/**
 * Get a specific friend
 */
export async function getFriend(userId: string, friendId: string): Promise<Friend | null> {
  const friendRef = doc(db, 'users', userId, 'friends', friendId);
  const friendDoc = await getDoc(friendRef);
  
  if (!friendDoc.exists()) {
    return null;
  }
  
  return toFriend(friendDoc.data() as FirestoreFriend);
}

/**
 * Remove a friend
 */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const batch = writeBatch(db);
  
  // Remove from both users' friend lists
  const friend1Ref = doc(db, 'users', userId, 'friends', friendId);
  const friend2Ref = doc(db, 'users', friendId, 'friends', userId);
  
  batch.delete(friend1Ref);
  batch.delete(friend2Ref);
  
  // Decrement friend counts
  const user1Ref = doc(db, 'users', userId);
  const user2Ref = doc(db, 'users', friendId);
  
  batch.update(user1Ref, { friendsCount: increment(-1) });
  batch.update(user2Ref, { friendsCount: increment(-1) });
  
  await batch.commit();
}

/**
 * Subscribe to friends list
 */
export function subscribeToFriends(
  userId: string,
  callback: (friends: Friend[]) => void
): () => void {
  const friendsRef = collection(db, 'users', userId, 'friends');
  const q = query(friendsRef, orderBy('addedAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const friends = snapshot.docs.map(doc => toFriend(doc.data() as FirestoreFriend));
    callback(friends);
  });
}

// ============================================
// MIGRATION
// ============================================

/**
 * Migration: Assign friend codes to all existing users without one
 */
export async function migrateUsersWithoutFriendCodes(): Promise<{
  migrated: string[];
  errors: string[];
}> {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  
  const migrated: string[] = [];
  const errors: string[] = [];
  
  for (const userDoc of snapshot.docs) {
    const userData = userDoc.data();
    
    if (!userData.friendCode) {
      try {
        const friendCode = await generateUniqueFriendCode();
        
        await updateDoc(doc(db, 'users', userDoc.id), {
          friendCode,
          friendsCount: userData.friendsCount || 0,
        });
        
        migrated.push(`${userDoc.id} -> ${friendCode}`);
        console.log(`Migrated user ${userDoc.id} with code ${friendCode}`);
      } catch (error) {
        errors.push(`${userDoc.id}: ${error}`);
        console.error(`Failed to migrate user ${userDoc.id}:`, error);
      }
    }
  }
  
  return { migrated, errors };
}
