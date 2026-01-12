/**
 * Range Sharing Hook
 * 
 * Provides access to range sharing functionality including:
 * - Sending range shares to friends
 * - Receiving and managing pending shares
 * - Importing shared ranges to players
 */

import { auth } from '@/config/firebase';
import * as playersService from '@/services/firebase/players';
import * as rangeSharingService from '@/services/firebase/rangeSharing';
import * as localStorage from '@/services/localStorage';
import { Range } from '@/types/poker';
import { ImportRangesResult, PendingSharesSummary, RangeShare } from '@/types/sharing';
import { onAuthStateChanged } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// USE RANGE SHARING HOOK
// ============================================

interface UseRangeSharingResult {
  // State
  pendingShares: RangeShare[];
  pendingSharesCount: number;
  pendingSharesByFriend: PendingSharesSummary[];
  loading: boolean;
  error: Error | null;
  
  // Actions
  sendShare: (
    toUserId: string,
    toUserName: string,
    playerName: string,
    ranges: Record<string, Range>
  ) => Promise<void>;
  
  getSharesFromFriend: (friendId: string) => Promise<RangeShare[]>;
  
  importToExistingPlayer: (
    shareId: string,
    playerId: string,
    selectedKeys?: string[]
  ) => Promise<ImportRangesResult>;
  
  importToNewPlayer: (
    shareId: string,
    playerName: string,
    playerColor?: string,
    selectedKeys?: string[]
  ) => Promise<string>; // Returns new player ID
  
  dismissShare: (shareId: string) => Promise<void>;
  
  refresh: () => Promise<void>;
}

export function useRangeSharing(): UseRangeSharingResult {
  const [pendingShares, setPendingShares] = useState<RangeShare[]>([]);
  const [pendingSharesCount, setPendingSharesCount] = useState(0);
  const [pendingSharesByFriend, setPendingSharesByFriend] = useState<PendingSharesSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use auth state listener for proper cleanup on sign-out
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [userName, setUserName] = useState<string>(
    auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Unknown'
  );

  // Track auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setUserName(user.displayName || user.email?.split('@')[0] || 'Unknown');
      } else {
        // Clear all state on sign out
        setUserId(null);
        setUserName('Unknown');
        setPendingShares([]);
        setPendingSharesCount(0);
        setPendingSharesByFriend([]);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Calculate per-friend counts from shares
  const calculatePerFriendCounts = useCallback((shares: RangeShare[]) => {
    const countMap = new Map<string, { name: string; count: number }>();
    
    for (const share of shares) {
      const existing = countMap.get(share.fromUserId);
      if (existing) {
        existing.count++;
      } else {
        countMap.set(share.fromUserId, {
          name: share.fromUserName,
          count: 1,
        });
      }
    }

    return Array.from(countMap.entries()).map(([friendId, data]) => ({
      friendId,
      friendName: data.name,
      count: data.count,
    }));
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = rangeSharingService.subscribeToPendingShares(
      userId,
      (shares) => {
        setPendingShares(shares);
        setPendingSharesCount(shares.length);
        setPendingSharesByFriend(calculatePerFriendCounts(shares));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId, calculatePerFriendCounts]);

  // Send a share to a friend
  const sendShare = useCallback(async (
    toUserId: string,
    toUserName: string,
    playerName: string,
    ranges: Record<string, Range>
  ): Promise<void> => {
    if (!userId) {
      throw new Error('You must be logged in to share ranges');
    }

    try {
      await rangeSharingService.sendRangeShare(
        userId,
        userName,
        toUserId,
        toUserName,
        playerName,
        ranges
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send share');
      setError(error);
      throw error;
    }
  }, [userId, userName]);

  // Get shares from a specific friend
  const getSharesFromFriend = useCallback(async (
    friendId: string
  ): Promise<RangeShare[]> => {
    if (!userId) {
      return [];
    }

    return rangeSharingService.getPendingSharesFromFriend(userId, friendId);
  }, [userId]);

  // Import shared ranges to an existing player (fill empty slots only)
  const importToExistingPlayer = useCallback(async (
    shareId: string,
    playerId: string,
    selectedKeys?: string[]
  ): Promise<ImportRangesResult> => {
    if (!userId) {
      throw new Error('You must be logged in to import ranges');
    }

    // Get the share
    const share = await rangeSharingService.getRangeShare(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    // Get current player ranges
    const existingRanges = await playersService.getPlayerRanges(userId, playerId) || {};

    // Calculate what to add (fill empty slots only)
    const result: ImportRangesResult = {
      added: 0,
      skipped: 0,
      rangeKeysAdded: [],
      rangeKeysSkipped: [],
    };

    const newRanges: Record<string, Range> = { ...existingRanges };

    // Filter to only selected keys if provided
    const rangesToProcess = selectedKeys 
      ? Object.entries(share.ranges).filter(([key]) => selectedKeys.includes(key))
      : Object.entries(share.ranges);

    for (const [key, sharedRange] of rangesToProcess) {
      const existingRange = existingRanges[key];
      
      // Check if existing range has any non-unselected hands
      const hasExistingData = existingRange && 
        Object.values(existingRange).some(state => state !== 'unselected');

      if (hasExistingData) {
        // Skip - user already has observations for this position/action
        result.skipped++;
        result.rangeKeysSkipped.push(key);
      } else {
        // Add - this slot is empty
        newRanges[key] = sharedRange;
        result.added++;
        result.rangeKeysAdded.push(key);
      }
    }

    // Save updated ranges if any were added
    if (result.added > 0) {
      await playersService.updatePlayerRanges(userId, playerId, newRanges);
      
      // Also update local storage
      const localRanges = await localStorage.getPlayerRanges(playerId);
      if (localRanges) {
        await localStorage.savePlayerRanges({
          ...localRanges,
          ranges: newRanges,
          lastObserved: Date.now(),
        });
      }
    }

    // Delete the share
    await rangeSharingService.deleteRangeShare(shareId);

    return result;
  }, [userId]);

  // Import shared ranges to a new player
  const importToNewPlayer = useCallback(async (
    shareId: string,
    playerName: string,
    playerColor?: string,
    selectedKeys?: string[]
  ): Promise<string> => {
    if (!userId) {
      throw new Error('You must be logged in to import ranges');
    }

    // Get the share
    const share = await rangeSharingService.getRangeShare(shareId);
    if (!share) {
      throw new Error('Share not found');
    }

    // Create new player
    const newPlayer = await playersService.createPlayer(userId, {
      name: playerName,
      color: playerColor,
      createdBy: userId,
    });

    // Filter ranges to only selected keys if provided
    const rangesToImport = selectedKeys 
      ? Object.fromEntries(
          Object.entries(share.ranges).filter(([key]) => selectedKeys.includes(key))
        )
      : share.ranges;

    // Save ranges to the new player
    if (Object.keys(rangesToImport).length > 0) {
      await playersService.updatePlayerRanges(userId, newPlayer.id, rangesToImport);
    }

    // Also save to local storage
    await localStorage.savePlayerRanges({
      playerId: newPlayer.id,
      ranges: rangesToImport,
      lastObserved: Date.now(),
      handsObserved: 0,
    });

    // Delete the share
    await rangeSharingService.deleteRangeShare(shareId);

    return newPlayer.id;
  }, [userId]);

  // Dismiss a share without importing
  const dismissShare = useCallback(async (shareId: string): Promise<void> => {
    await rangeSharingService.deleteRangeShare(shareId);
  }, []);

  // Refresh data
  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    try {
      const shares = await rangeSharingService.getPendingSharesForUser(userId);
      setPendingShares(shares);
      setPendingSharesCount(shares.length);
      setPendingSharesByFriend(calculatePerFriendCounts(shares));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load shares'));
    } finally {
      setLoading(false);
    }
  }, [userId, calculatePerFriendCounts]);

  return {
    pendingShares,
    pendingSharesCount,
    pendingSharesByFriend,
    loading,
    error,
    sendShare,
    getSharesFromFriend,
    importToExistingPlayer,
    importToNewPlayer,
    dismissShare,
    refresh,
  };
}

// ============================================
// USE PENDING SHARES COUNT HOOK (for tab badge)
// ============================================

export function usePendingSharesCount(): number {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);

  // Track auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (!user) {
        setCount(0);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    const unsubscribe = rangeSharingService.subscribeToPendingSharesCount(
      userId,
      setCount
    );

    return unsubscribe;
  }, [userId]);

  return count;
}
