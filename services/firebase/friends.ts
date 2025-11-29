import { db } from '@/config/firebase';
import { FriendRequest, FriendRequestStatus, User } from '@/types/poker';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';

// ============================================
// COLLECTION REFERENCES
// ============================================

const USERS_COLLECTION = 'users';
const FRIEND_REQUESTS_COLLECTION = 'friendRequests';

const usersCollection = collection(db, USERS_COLLECTION);
const friendRequestsCollection = collection(db, FRIEND_REQUESTS_COLLECTION);

// ============================================
// TYPE CONVERTERS
// ============================================

interface FirestoreUser {
  email: string;
  displayName: string;
  photoUrl?: string;
  friends: string[];
  createdAt: Timestamp;
}

interface FirestoreFriendRequest {
  fromUserId: string;
  toUserId: string;
  status: FriendRequestStatus;
  createdAt: Timestamp;
}

function toUser(id: string, data: FirestoreUser): User {
  return {
    id,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    friends: data.friends || [],
    createdAt: data.createdAt?.toMillis() || Date.now(),
  };
}

function toFriendRequest(id: string, data: FirestoreFriendRequest): FriendRequest {
  return {
    id,
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    status: data.status,
    createdAt: data.createdAt?.toMillis() || Date.now(),
  };
}

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return toUser(userDoc.id, userDoc.data() as FirestoreUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const q = query(
      usersCollection,
      where('email', '==', email.toLowerCase())
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const userDoc = snapshot.docs[0];
    return toUser(userDoc.id, userDoc.data() as FirestoreUser);
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
}

/**
 * Search users by display name or email
 */
export async function searchUsers(
  searchTerm: string,
  currentUserId: string,
  limit: number = 10
): Promise<User[]> {
  try {
    // Search by email (exact match for security)
    const emailQuery = query(
      usersCollection,
      where('email', '==', searchTerm.toLowerCase())
    );
    
    const snapshot = await getDocs(emailQuery);
    
    const users = snapshot.docs
      .map(doc => toUser(doc.id, doc.data() as FirestoreUser))
      .filter(user => user.id !== currentUserId);
    
    return users.slice(0, limit);
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Create or update user profile
 */
export async function upsertUser(
  userId: string,
  data: { email: string; displayName: string; photoUrl?: string }
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const existingDoc = await getDoc(userRef);
    
    if (existingDoc.exists()) {
      await updateDoc(userRef, {
        email: data.email.toLowerCase(),
        displayName: data.displayName,
        ...(data.photoUrl && { photoUrl: data.photoUrl }),
      });
    } else {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(userRef, {
        email: data.email.toLowerCase(),
        displayName: data.displayName,
        photoUrl: data.photoUrl || null,
        friends: [],
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error upserting user:', error);
    throw error;
  }
}

/**
 * Get friends list for a user
 */
export async function getFriends(userId: string): Promise<User[]> {
  try {
    const user = await getUser(userId);
    if (!user || !user.friends.length) {
      return [];
    }
    
    // Fetch all friend user documents
    const friendPromises = user.friends.map(friendId => getUser(friendId));
    const friends = await Promise.all(friendPromises);
    
    return friends.filter((friend): friend is User => friend !== null);
  } catch (error) {
    console.error('Error fetching friends:', error);
    throw error;
  }
}

/**
 * Add friend to both users
 */
export async function addFriend(userId: string, friendId: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const friendRef = doc(db, USERS_COLLECTION, friendId);
    
    // Get current friends arrays
    const [userDoc, friendDoc] = await Promise.all([
      getDoc(userRef),
      getDoc(friendRef),
    ]);
    
    if (!userDoc.exists() || !friendDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data() as FirestoreUser;
    const friendData = friendDoc.data() as FirestoreUser;
    
    // Add each other as friends (if not already)
    const userFriends = new Set(userData.friends || []);
    const friendFriends = new Set(friendData.friends || []);
    
    userFriends.add(friendId);
    friendFriends.add(userId);
    
    await Promise.all([
      updateDoc(userRef, { friends: Array.from(userFriends) }),
      updateDoc(friendRef, { friends: Array.from(friendFriends) }),
    ]);
  } catch (error) {
    console.error('Error adding friend:', error);
    throw error;
  }
}

/**
 * Remove friend from both users
 */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const friendRef = doc(db, USERS_COLLECTION, friendId);
    
    const [userDoc, friendDoc] = await Promise.all([
      getDoc(userRef),
      getDoc(friendRef),
    ]);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as FirestoreUser;
      const userFriends = (userData.friends || []).filter(id => id !== friendId);
      await updateDoc(userRef, { friends: userFriends });
    }
    
    if (friendDoc.exists()) {
      const friendData = friendDoc.data() as FirestoreUser;
      const friendFriends = (friendData.friends || []).filter(id => id !== userId);
      await updateDoc(friendRef, { friends: friendFriends });
    }
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
}

// ============================================
// FRIEND REQUEST OPERATIONS
// ============================================

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  fromUserId: string,
  toUserId: string
): Promise<FriendRequest> {
  try {
    // Check if request already exists
    const existingRequest = await getPendingRequest(fromUserId, toUserId);
    if (existingRequest) {
      throw new Error('Friend request already sent');
    }
    
    // Check if already friends
    const fromUser = await getUser(fromUserId);
    if (fromUser?.friends.includes(toUserId)) {
      throw new Error('Already friends');
    }
    
    // Check if there's a pending request from the other user
    const reverseRequest = await getPendingRequest(toUserId, fromUserId);
    if (reverseRequest) {
      // Auto-accept if they already sent us a request
      await acceptFriendRequest(reverseRequest.id, fromUserId);
      return reverseRequest;
    }
    
    const docRef = await addDoc(friendRequestsCollection, {
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    
    return {
      id: docRef.id,
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
}

/**
 * Get pending request between two users
 */
export async function getPendingRequest(
  fromUserId: string,
  toUserId: string
): Promise<FriendRequest | null> {
  try {
    const q = query(
      friendRequestsCollection,
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return toFriendRequest(doc.id, doc.data() as FirestoreFriendRequest);
  } catch (error) {
    console.error('Error getting pending request:', error);
    throw error;
  }
}

/**
 * Get incoming friend requests for a user
 */
export async function getIncomingRequests(userId: string): Promise<FriendRequest[]> {
  try {
    const q = query(
      friendRequestsCollection,
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      toFriendRequest(doc.id, doc.data() as FirestoreFriendRequest)
    );
  } catch (error) {
    console.error('Error fetching incoming requests:', error);
    throw error;
  }
}

/**
 * Get outgoing friend requests for a user
 */
export async function getOutgoingRequests(userId: string): Promise<FriendRequest[]> {
  try {
    const q = query(
      friendRequestsCollection,
      where('fromUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => 
      toFriendRequest(doc.id, doc.data() as FirestoreFriendRequest)
    );
  } catch (error) {
    console.error('Error fetching outgoing requests:', error);
    throw error;
  }
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(
  requestId: string,
  currentUserId: string
): Promise<void> {
  try {
    const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }
    
    const request = requestDoc.data() as FirestoreFriendRequest;
    
    if (request.toUserId !== currentUserId) {
      throw new Error('Cannot accept this request');
    }
    
    if (request.status !== 'pending') {
      throw new Error('Request is no longer pending');
    }
    
    // Add each other as friends
    await addFriend(request.fromUserId, request.toUserId);
    
    // Update request status
    await updateDoc(requestRef, { status: 'accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(
  requestId: string,
  currentUserId: string
): Promise<void> {
  try {
    const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }
    
    const request = requestDoc.data() as FirestoreFriendRequest;
    
    if (request.toUserId !== currentUserId) {
      throw new Error('Cannot reject this request');
    }
    
    await updateDoc(requestRef, { status: 'rejected' });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
}

/**
 * Cancel an outgoing friend request
 */
export async function cancelFriendRequest(
  requestId: string,
  currentUserId: string
): Promise<void> {
  try {
    const requestRef = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }
    
    const request = requestDoc.data() as FirestoreFriendRequest;
    
    if (request.fromUserId !== currentUserId) {
      throw new Error('Cannot cancel this request');
    }
    
    await deleteDoc(requestRef);
  } catch (error) {
    console.error('Error canceling friend request:', error);
    throw error;
  }
}
