import { auth } from '@/config/firebase';
import * as friendsFirebase from '@/services/firebase/friends';
import { FriendRequest, User } from '@/types/poker';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// USE FRIENDS HOOK
// ============================================

interface UseFriendsResult {
  friends: User[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  sendRequest: (email: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  rejectRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
}

export function useFriends(): UseFriendsResult {
  const [friends, setFriends] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const userId = auth.currentUser?.uid;

  const loadData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const [friendsList, incoming, outgoing] = await Promise.all([
        friendsFirebase.getFriends(userId),
        friendsFirebase.getIncomingRequests(userId),
        friendsFirebase.getOutgoingRequests(userId),
      ]);

      setFriends(friendsList);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load friends'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const sendRequest = useCallback(async (email: string): Promise<void> => {
    if (!userId) throw new Error('Not authenticated');

    // Find user by email
    const targetUser = await friendsFirebase.getUserByEmail(email);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (targetUser.id === userId) {
      throw new Error("You can't add yourself as a friend");
    }

    await friendsFirebase.sendFriendRequest(userId, targetUser.id);
    await loadData();
  }, [userId, loadData]);

  const acceptRequest = useCallback(async (requestId: string): Promise<void> => {
    if (!userId) throw new Error('Not authenticated');

    await friendsFirebase.acceptFriendRequest(requestId, userId);
    await loadData();
  }, [userId, loadData]);

  const rejectRequest = useCallback(async (requestId: string): Promise<void> => {
    if (!userId) throw new Error('Not authenticated');

    await friendsFirebase.rejectFriendRequest(requestId, userId);
    await loadData();
  }, [userId, loadData]);

  const cancelRequest = useCallback(async (requestId: string): Promise<void> => {
    if (!userId) throw new Error('Not authenticated');

    await friendsFirebase.cancelFriendRequest(requestId, userId);
    await loadData();
  }, [userId, loadData]);

  const removeFriend = useCallback(async (friendId: string): Promise<void> => {
    if (!userId) throw new Error('Not authenticated');

    await friendsFirebase.removeFriend(userId, friendId);
    setFriends(prev => prev.filter(f => f.id !== friendId));
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    refresh: loadData,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
  };
}

// ============================================
// USE USER SEARCH HOOK
// ============================================

interface UseUserSearchResult {
  results: User[];
  searching: boolean;
  search: (term: string) => Promise<void>;
  clear: () => void;
}

export function useUserSearch(): UseUserSearchResult {
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const userId = auth.currentUser?.uid;

  const search = useCallback(async (term: string): Promise<void> => {
    if (!userId || !term.trim()) {
      setResults([]);
      return;
    }

    try {
      setSearching(true);
      const users = await friendsFirebase.searchUsers(term.trim(), userId);
      setResults(users);
    } catch (err) {
      console.error('Error searching users:', err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [userId]);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    searching,
    search,
    clear,
  };
}

// ============================================
// USE CURRENT USER HOOK
// ============================================

interface UseCurrentUserResult {
  user: User | null;
  loading: boolean;
  updateProfile: (data: { displayName: string; photoUrl?: string }) => Promise<void>;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = auth.currentUser?.uid;
  const email = auth.currentUser?.email;

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userData = await friendsFirebase.getUser(userId);
        setUser(userData);
      } catch (err) {
        console.error('Error loading user:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  const updateProfile = useCallback(async (
    data: { displayName: string; photoUrl?: string }
  ): Promise<void> => {
    if (!userId || !email) throw new Error('Not authenticated');

    await friendsFirebase.upsertUser(userId, {
      email,
      ...data,
    });

    setUser(prev => prev ? { ...prev, ...data } : null);
  }, [userId, email]);

  return {
    user,
    loading,
    updateProfile,
  };
}
