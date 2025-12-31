/**
 * Friends Hook
 * 
 * Provides access to friends data and friend request operations.
 */

import { auth } from '@/config/firebase';
import * as friendsService from '@/services/firebase/friends';
import { Friend, FriendRequest } from '@/types/friends';
import { User } from '@/types/poker';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// USE FRIENDS HOOK
// ============================================

interface UseFriendsResult {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  pendingCount: number;
  friendCode: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  sendRequest: (friendCode: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
}

export function useFriends(): UseFriendsResult {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const userId = auth.currentUser?.uid;

  // Load all friends data
  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [
        friendsList,
        pendingList,
        sentList,
        code,
      ] = await Promise.all([
        friendsService.getFriends(userId),
        friendsService.getPendingRequests(userId),
        friendsService.getSentRequests(userId),
        friendsService.getOrCreateFriendCode(userId),
      ]);

      setFriends(friendsList);
      setPendingRequests(pendingList);
      setSentRequests(sentList);
      setPendingCount(pendingList.length);
      setFriendCode(code);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load friends'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Subscribe to pending requests count for badge
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = friendsService.subscribeToPendingRequestsCount(
      userId,
      (count) => setPendingCount(count)
    );

    return unsubscribe;
  }, [userId]);

  // Subscribe to friends list for real-time updates
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = friendsService.subscribeToFriends(
      userId,
      (friendsList) => setFriends(friendsList)
    );

    return unsubscribe;
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Send friend request by code
  const sendRequest = useCallback(async (targetCode: string) => {
    if (!userId) {
      throw new Error('You must be logged in to send friend requests');
    }

    // Find the target user
    const targetUser = await friendsService.findUserByFriendCode(targetCode);
    if (!targetUser) {
      throw new Error('No user found with this code');
    }

    // Get current user data
    const currentUserCode = friendCode || await friendsService.getOrCreateFriendCode(userId);
    const currentUser: User = {
      id: userId,
      email: auth.currentUser?.email || '',
      displayName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Unknown',
      friendCode: currentUserCode,
      friendsCount: friends.length,
      createdAt: Date.now(),
    };

    await friendsService.sendFriendRequest(currentUser, targetUser);
    
    // Refresh sent requests
    const updatedSent = await friendsService.getSentRequests(userId);
    setSentRequests(updatedSent);
  }, [userId, friendCode, friends.length]);

  // Accept friend request
  const acceptRequest = useCallback(async (requestId: string) => {
    await friendsService.acceptFriendRequest(requestId);
    
    // Refresh data
    if (userId) {
      const [friendsList, pendingList] = await Promise.all([
        friendsService.getFriends(userId),
        friendsService.getPendingRequests(userId),
      ]);
      setFriends(friendsList);
      setPendingRequests(pendingList);
      setPendingCount(pendingList.length);
    }
  }, [userId]);

  // Decline friend request
  const declineRequest = useCallback(async (requestId: string) => {
    await friendsService.declineFriendRequest(requestId);
    
    // Refresh pending requests
    if (userId) {
      const pendingList = await friendsService.getPendingRequests(userId);
      setPendingRequests(pendingList);
      setPendingCount(pendingList.length);
    }
  }, [userId]);

  // Cancel sent request
  const cancelRequest = useCallback(async (requestId: string) => {
    await friendsService.cancelFriendRequest(requestId);
    
    // Refresh sent requests
    if (userId) {
      const sentList = await friendsService.getSentRequests(userId);
      setSentRequests(sentList);
    }
  }, [userId]);

  // Remove friend
  const removeFriend = useCallback(async (friendId: string) => {
    if (!userId) return;
    
    await friendsService.removeFriend(userId, friendId);
    
    // Friends list will update via subscription
  }, [userId]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    pendingCount,
    friendCode,
    loading,
    error,
    refresh: loadData,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
  };
}

// ============================================
// USE PENDING COUNT HOOK (for tab badge)
// ============================================

export function usePendingFriendRequestsCount(): number {
  const [count, setCount] = useState(0);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const unsubscribe = friendsService.subscribeToPendingRequestsCount(
      userId,
      setCount
    );

    return unsubscribe;
  }, [userId]);

  return count;
}
