/**
 * Player Links Hook - Subcollection Architecture
 * 
 * Provides access to player link functionality including:
 * - Creating, accepting, and managing player links
 * - Checking for range updates from linked players
 * - Syncing ranges with linked players
 * - Client-side caching for cost efficiency
 * 
 * Key improvements:
 * - Single real-time listener (no dual OR merge)
 * - Error handling on subscriptions
 * - Batched update checks
 */

import { auth } from '@/config/firebase';
import * as playerLinksService from '@/services/firebase/playerLinks';
import {
  AcceptPlayerLink,
  CreatePlayerLink,
  PLAYER_LINKS_CONFIG,
  PlayerLinkView,
  SyncRangesResult,
  UserPlayerLink,
} from '@/types/sharing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================
// CACHE TYPES
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface VersionCache {
  [linkId: string]: CacheEntry<{ hasUpdates: boolean; theirVersion: number }>;
}

// ============================================
// USE PLAYER LINKS HOOK
// ============================================

interface UsePlayerLinksResult {
  // State
  links: UserPlayerLink[];
  activeLinks: UserPlayerLink[];
  pendingLinks: UserPlayerLink[];
  pendingInvites: PlayerLinkView[];
  pendingLinksCount: number;
  linkViews: PlayerLinkView[];
  loading: boolean;
  error: Error | null;
  
  // Link counts
  linkCountInfo: {
    used: number;
    remaining: number;
    max: number;
  } | null;
  
  // Actions
  createLink: (
    friendId: string,
    friendName: string,
    playerId: string,
    playerName: string
  ) => Promise<UserPlayerLink>;
  
  acceptLink: (
    linkId: string,
    playerId: string,
    playerName: string
  ) => Promise<UserPlayerLink>;
  
  declineLink: (linkId: string) => Promise<void>;
  removeLink: (linkId: string) => Promise<void>;
  cancelLink: (linkId: string) => Promise<void>;
  
  // Sync operations
  checkForUpdates: (link: UserPlayerLink) => Promise<{ hasUpdates: boolean; theirVersion: number }>;
  checkAllForUpdates: () => Promise<Map<string, { hasUpdates: boolean; theirVersion: number }>>;
  syncFromLink: (linkId: string) => Promise<SyncRangesResult>;
  
  // Query helpers
  getLinksForPlayer: (playerId: string) => UserPlayerLink[];
  getLinkViewsForPlayer: (playerId: string) => PlayerLinkView[];
  
  // Refresh
  refresh: () => Promise<void>;
  refreshLinkCounts: () => Promise<void>;
}

export function usePlayerLinks(): UsePlayerLinksResult {
  const [links, setLinks] = useState<UserPlayerLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [linkCountInfo, setLinkCountInfo] = useState<{
    used: number;
    remaining: number;
    max: number;
  } | null>(null);
  
  // Version check cache (5 minute TTL)
  const versionCacheRef = useRef<VersionCache>({});
  
  const userId = auth.currentUser?.uid;
  const userName = auth.currentUser?.displayName || 
    auth.currentUser?.email?.split('@')[0] || 'Unknown';
  
  // Derived state
  const activeLinks = useMemo(
    () => links.filter(link => link.status === 'active'),
    [links]
  );
  
  const pendingLinks = useMemo(
    () => links.filter(link => link.status === 'pending' && !link.isInitiator),
    [links]
  );
  
  const pendingLinksCount = pendingLinks.length;
  
  // Convert active links to views
  const linkViews = useMemo<PlayerLinkView[]>(() => {
    return links
      .filter(link => link.status === 'active')
      .map(link => playerLinksService.toPlayerLinkView(link));
  }, [links]);
  
  // Convert pending links to views (for UI display)
  const pendingInvites = useMemo<PlayerLinkView[]>(() => {
    return pendingLinks.map(link => playerLinksService.toPlayerLinkView(link));
  }, [pendingLinks]);
  
  // Subscribe to real-time updates (single listener with error handling)
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = playerLinksService.subscribeToPlayerLinks(
      userId,
      (updatedLinks) => {
        setLinks(updatedLinks);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('PlayerLinks subscription error:', err);
        setError(err);
        setLoading(false);
      }
    );
    
    return unsubscribe;
  }, [userId]);
  
  // Load link counts on mount
  useEffect(() => {
    if (!userId) return;
    
    playerLinksService.getRemainingLinkCount(userId)
      .then(setLinkCountInfo)
      .catch(console.error);
  }, [userId, links.length]);
  
  // Check if cache is valid
  const isCacheValid = useCallback((entry: CacheEntry<unknown> | undefined): boolean => {
    if (!entry) return false;
    return Date.now() - entry.timestamp < PLAYER_LINKS_CONFIG.CACHE_TTL_MS;
  }, []);
  
  // Create a new player link
  const createLink = useCallback(async (
    friendId: string,
    friendName: string,
    playerId: string,
    playerName: string
  ): Promise<UserPlayerLink> => {
    if (!userId) {
      throw new Error('You must be logged in to create links');
    }
    
    try {
      const linkData: CreatePlayerLink = {
        initiatorUserId: userId,
        initiatorUserName: userName,
        initiatorPlayerId: playerId,
        initiatorPlayerName: playerName,
        recipientUserId: friendId,
        recipientUserName: friendName,
      };
      
      const link = await playerLinksService.createPlayerLink(linkData);
      return link;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create link');
      setError(error);
      throw error;
    }
  }, [userId, userName]);
  
  // Accept a pending link
  const acceptLink = useCallback(async (
    linkId: string,
    playerId: string,
    playerName: string
  ): Promise<UserPlayerLink> => {
    if (!userId) {
      throw new Error('You must be logged in to accept links');
    }
    
    try {
      const acceptData: AcceptPlayerLink = {
        recipientPlayerId: playerId,
        recipientPlayerName: playerName,
      };
      
      const link = await playerLinksService.acceptPlayerLink(linkId, userId, acceptData);
      return link;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to accept link');
      setError(error);
      throw error;
    }
  }, [userId]);
  
  // Decline a pending link
  const declineLink = useCallback(async (linkId: string): Promise<void> => {
    if (!userId) {
      throw new Error('You must be logged in to decline links');
    }
    
    try {
      await playerLinksService.declinePlayerLink(linkId, userId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to decline link');
      setError(error);
      throw error;
    }
  }, [userId]);
  
  // Remove an active link
  const removeLink = useCallback(async (linkId: string): Promise<void> => {
    if (!userId) {
      throw new Error('You must be logged in to remove links');
    }
    
    try {
      await playerLinksService.removePlayerLink(linkId, userId);
      // Clear cache for this link
      delete versionCacheRef.current[linkId];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove link');
      setError(error);
      throw error;
    }
  }, [userId]);
  
  // Cancel a pending link (creator only)
  const cancelLink = useCallback(async (linkId: string): Promise<void> => {
    if (!userId) {
      throw new Error('You must be logged in to cancel links');
    }
    
    try {
      await playerLinksService.cancelPlayerLink(linkId, userId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cancel link');
      setError(error);
      throw error;
    }
  }, [userId]);
  
  // Check for updates from a specific linked player (with caching)
  const checkForUpdates = useCallback(async (
    link: UserPlayerLink
  ): Promise<{ hasUpdates: boolean; theirVersion: number }> => {
    if (!userId) {
      throw new Error('You must be logged in to check for updates');
    }
    
    // Check cache first
    const cached = versionCacheRef.current[link.id];
    if (isCacheValid(cached)) {
      return cached.data;
    }
    
    // Fetch fresh data
    const result = await playerLinksService.checkForUpdates(link);
    
    // Update cache
    versionCacheRef.current[link.id] = {
      data: result,
      timestamp: Date.now(),
    };
    
    return result;
  }, [userId, isCacheValid]);
  
  // Check all active links for updates (batched)
  const checkAllForUpdates = useCallback(async (): Promise<
    Map<string, { hasUpdates: boolean; theirVersion: number }>
  > => {
    if (!userId) {
      return new Map();
    }
    
    // Use batched service method
    const results = await playerLinksService.checkAllForUpdates(activeLinks, userId);
    
    // Update cache with results
    for (const [linkId, result] of results.entries()) {
      versionCacheRef.current[linkId] = {
        data: result,
        timestamp: Date.now(),
      };
    }
    
    return results;
  }, [userId, activeLinks]);
  
  // Sync ranges from a linked player
  const syncFromLink = useCallback(async (linkId: string): Promise<SyncRangesResult> => {
    if (!userId) {
      throw new Error('You must be logged in to sync');
    }
    
    try {
      const result = await playerLinksService.syncRangesFromLink(linkId, userId);
      
      // Invalidate cache for this link since we just synced
      delete versionCacheRef.current[linkId];
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sync ranges');
      setError(error);
      throw error;
    }
  }, [userId]);
  
  // Get links for a specific player
  const getLinksForPlayer = useCallback((playerId: string): UserPlayerLink[] => {
    return links.filter(link => link.myPlayerId === playerId);
  }, [links]);
  
  // Get link views for a specific player
  const getLinkViewsForPlayer = useCallback((playerId: string): PlayerLinkView[] => {
    return linkViews.filter(view => view.myPlayerId === playerId);
  }, [linkViews]);
  
  // Refresh all data
  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const fetchedLinks = await playerLinksService.getPlayerLinks(userId);
      setLinks(fetchedLinks);
      setError(null);
      
      // Also refresh link counts
      const counts = await playerLinksService.getRemainingLinkCount(userId);
      setLinkCountInfo(counts);
      
      // Clear version cache to force fresh checks
      versionCacheRef.current = {};
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load links'));
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // Refresh just the link counts
  const refreshLinkCounts = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    try {
      const counts = await playerLinksService.getRemainingLinkCount(userId);
      setLinkCountInfo(counts);
    } catch (err) {
      console.error('Failed to refresh link counts:', err);
    }
  }, [userId]);
  
  return {
    links,
    activeLinks,
    pendingLinks,
    pendingInvites,
    pendingLinksCount,
    linkViews,
    loading,
    error,
    linkCountInfo,
    createLink,
    acceptLink,
    declineLink,
    removeLink,
    cancelLink,
    checkForUpdates,
    checkAllForUpdates,
    syncFromLink,
    getLinksForPlayer,
    getLinkViewsForPlayer,
    refresh,
    refreshLinkCounts,
  };
}

// ============================================
// USE PENDING LINKS COUNT HOOK (for tab badge)
// ============================================

export function usePendingLinksCount(): number {
  const [count, setCount] = useState(0);
  const userId = auth.currentUser?.uid;
  
  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    
    const unsubscribe = playerLinksService.subscribeToPendingLinkCount(
      userId,
      setCount,
      (error) => {
        console.error('Pending links count subscription error:', error);
      }
    );
    
    return unsubscribe;
  }, [userId]);
  
  return count;
}

// ============================================
// USE PLAYER LINK STATUS HOOK
// ============================================

type LinkStatus = 'none' | 'pending' | 'linked' | 'has-updates';

interface UpdateInfo {
  linkId: string;
  friendName: string;
  hasUpdates: boolean;
  theirVersion: number;
}

/**
 * Hook to get link status for a specific player
 * Returns link status, friend names, and update check functionality
 */
export function usePlayerLinkStatus(playerId: string): {
  linkStatus: LinkStatus;
  linkedFriendNames: string[];
  linkViews: PlayerLinkView[];
  hasUpdates: boolean;
  loading: boolean;
  checkForUpdates: () => Promise<UpdateInfo[] | null>;
  getLinkViewById: (linkId: string) => PlayerLinkView | null;
  refresh: () => Promise<void>;
} {
  const { 
    linkViews, 
    activeLinks,
    pendingLinks,
    loading, 
    checkForUpdates: checkLinkForUpdates,
    refresh: refreshLinks 
  } = usePlayerLinks();
  const [hasUpdates, setHasUpdates] = useState(false);
  
  // Get active link views for this player
  const playerLinkViews = useMemo(
    () => linkViews.filter(view => view.myPlayerId === playerId),
    [linkViews, playerId]
  );
  
  // Get pending links for this player (both sent and received)
  const playerPendingLinks = useMemo(
    () => pendingLinks.filter(link => link.myPlayerId === playerId || link.theirPlayerId === playerId),
    [pendingLinks, playerId]
  );
  
  // Get linked friend names
  const linkedFriendNames = useMemo(
    () => playerLinkViews.map(view => view.theirUserName),
    [playerLinkViews]
  );
  
  // Determine link status
  const linkStatus = useMemo<LinkStatus>(() => {
    if (playerLinkViews.length > 0) {
      return hasUpdates ? 'has-updates' : 'linked';
    }
    if (playerPendingLinks.length > 0) {
      return 'pending';
    }
    return 'none';
  }, [playerLinkViews.length, playerPendingLinks.length, hasUpdates]);
  
  // Check for updates whenever link views change
  useEffect(() => {
    const hasAnyUpdates = playerLinkViews.some(view => view.hasUpdates === true);
    setHasUpdates(hasAnyUpdates);
  }, [playerLinkViews]);
  
  // Function to check for updates across all links for this player
  const checkForUpdates = useCallback(async (): Promise<UpdateInfo[] | null> => {
    if (playerLinkViews.length === 0) return null;
    
    const updates: UpdateInfo[] = [];
    
    for (const view of playerLinkViews) {
      const link = activeLinks.find(l => l.id === view.link.id);
      if (!link) continue;
      
      try {
        const result = await checkLinkForUpdates(link);
        if (result.hasUpdates) {
          updates.push({
            linkId: view.link.id,
            friendName: view.theirUserName,
            hasUpdates: result.hasUpdates,
            theirVersion: result.theirVersion,
          });
        }
      } catch (err) {
        console.error(`Failed to check updates for link ${view.link.id}:`, err);
      }
    }
    
    setHasUpdates(updates.length > 0);
    return updates.length > 0 ? updates : null;
  }, [playerLinkViews, activeLinks, checkLinkForUpdates]);
  
  // Get link view by ID
  const getLinkViewById = useCallback((linkId: string): PlayerLinkView | null => {
    return playerLinkViews.find(view => view.link.id === linkId) || null;
  }, [playerLinkViews]);
  
  return {
    linkStatus,
    linkedFriendNames,
    linkViews: playerLinkViews,
    hasUpdates,
    loading,
    checkForUpdates,
    getLinkViewById,
    refresh: refreshLinks,
  };
}
