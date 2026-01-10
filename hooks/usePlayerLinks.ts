/**
 * Player Links Hook
 * 
 * Provides access to player link functionality including:
 * - Creating, accepting, and managing player links
 * - Checking for range updates from linked players
 * - Syncing ranges with linked players
 * - Client-side caching for cost efficiency
 */

import { auth } from '@/config/firebase';
import * as playerLinksService from '@/services/firebase/playerLinks';
import { Player } from '@/types/poker';
import {
  AcceptPlayerLink,
  CreatePlayerLink,
  PlayerLink,
  PlayerLinkView,
  PLAYER_LINKS_CONFIG,
  SyncRangesResult,
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
  links: PlayerLink[];
  activeLinks: PlayerLink[];
  pendingLinks: PlayerLink[];
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
  ) => Promise<PlayerLink>;
  
  acceptLink: (
    linkId: string,
    playerId: string,
    playerName: string
  ) => Promise<PlayerLink>;
  
  declineLink: (linkId: string) => Promise<void>;
  removeLink: (linkId: string) => Promise<void>;
  cancelLink: (linkId: string) => Promise<void>;
  
  // Sync operations
  checkForUpdates: (link: PlayerLink) => Promise<{ hasUpdates: boolean; theirVersion: number }>;
  checkAllForUpdates: () => Promise<Map<string, { hasUpdates: boolean; theirVersion: number }>>;
  syncFromLink: (linkId: string) => Promise<SyncRangesResult>;
  
  // Query helpers
  getLinksForPlayer: (playerId: string) => PlayerLink[];
  getLinkViewsForPlayer: (playerId: string) => PlayerLinkView[];
  
  // Refresh
  refresh: () => Promise<void>;
  refreshLinkCounts: () => Promise<void>;
}

export function usePlayerLinks(): UsePlayerLinksResult {
  const [links, setLinks] = useState<PlayerLink[]>([]);
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
    () => links.filter(link => link.status === 'pending' && link.userBId === userId),
    [links, userId]
  );
  
  const pendingLinksCount = pendingLinks.length;
  
  // Convert links to views for the current user
  const linkViews = useMemo<PlayerLinkView[]>(() => {
    if (!userId) return [];
    return links
      .filter(link => link.status === 'active')
      .map(link => playerLinksService.toPlayerLinkView(link, userId));
  }, [links, userId]);
  
  // Subscribe to real-time updates
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
  }, [userId, links.length]); // Refresh when links change
  
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
  ): Promise<PlayerLink> => {
    if (!userId) {
      throw new Error('You must be logged in to create links');
    }
    
    try {
      const linkData: CreatePlayerLink = {
        userAId: userId,
        userAName: userName,
        userAPlayerId: playerId,
        userAPlayerName: playerName,
        userBId: friendId,
        userBName: friendName,
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
  ): Promise<PlayerLink> => {
    if (!userId) {
      throw new Error('You must be logged in to accept links');
    }
    
    try {
      const acceptData: AcceptPlayerLink = {
        userBPlayerId: playerId,
        userBPlayerName: playerName,
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
    link: PlayerLink
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
    const result = await playerLinksService.checkForUpdates(link, userId);
    
    // Update cache
    versionCacheRef.current[link.id] = {
      data: result,
      timestamp: Date.now(),
    };
    
    return result;
  }, [userId, isCacheValid]);
  
  // Check all active links for updates
  const checkAllForUpdates = useCallback(async (): Promise<
    Map<string, { hasUpdates: boolean; theirVersion: number }>
  > => {
    if (!userId) {
      return new Map();
    }
    
    const results = new Map<string, { hasUpdates: boolean; theirVersion: number }>();
    
    // Check each active link
    await Promise.all(
      activeLinks.map(async (link) => {
        try {
          const result = await checkForUpdates(link);
          results.set(link.id, result);
        } catch (err) {
          console.error(`Failed to check updates for link ${link.id}:`, err);
        }
      })
    );
    
    return results;
  }, [userId, activeLinks, checkForUpdates]);
  
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
  const getLinksForPlayer = useCallback((playerId: string): PlayerLink[] => {
    if (!userId) return [];
    
    return links.filter(link => {
      const isUserA = link.userAId === userId;
      const myPlayerId = isUserA ? link.userAPlayerId : link.userBPlayerId;
      return myPlayerId === playerId;
    });
  }, [links, userId]);
  
  // Get link views for a specific player
  const getLinkViewsForPlayer = useCallback((playerId: string): PlayerLinkView[] => {
    if (!userId) return [];
    
    return linkViews.filter(view => view.myPlayerId === playerId);
  }, [linkViews, userId]);
  
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
      setCount
    );
    
    return unsubscribe;
  }, [userId]);
  
  return count;
}

// ============================================
// USE PLAYER LINK STATUS HOOK
// ============================================

/**
 * Hook to get link status for a specific player
 * Returns whether the player has links and if updates are available
 */
export function usePlayerLinkStatus(playerId: string): {
  hasLinks: boolean;
  linkCount: number;
  hasUpdates: boolean;
  loading: boolean;
} {
  const { linkViews, loading } = usePlayerLinks();
  const [hasUpdates, setHasUpdates] = useState(false);
  
  const playerLinkViews = useMemo(
    () => linkViews.filter(view => view.myPlayerId === playerId),
    [linkViews, playerId]
  );
  
  const hasLinks = playerLinkViews.length > 0;
  const linkCount = playerLinkViews.length;
  
  // Check for updates whenever link views change
  useEffect(() => {
    const hasAnyUpdates = playerLinkViews.some(view => view.hasUpdates === true);
    setHasUpdates(hasAnyUpdates);
  }, [playerLinkViews]);
  
  return {
    hasLinks,
    linkCount,
    hasUpdates,
    loading,
  };
}
