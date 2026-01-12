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
import { Range } from '@/types/poker';
import {
    AcceptPlayerLink,
    CreatePlayerLink,
    PLAYER_LINKS_CONFIG,
    PlayerLinkView,
    SyncRangesResult,
    UserPlayerLink,
} from '@/types/sharing';
import { onAuthStateChanged } from 'firebase/auth';
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
  getRangesForSync: (linkId: string) => Promise<{
    theirRanges: Record<string, Range>;
    myRanges: Record<string, Range>;
    theirVersion: number;
    newRangeKeys: string[];
    updateRangeKeys: string[];
  }>;
  markLinkAsSynced: (linkId: string, theirVersion: number) => Promise<void>;
  syncFromLink: (linkId: string) => Promise<SyncRangesResult>;
  syncSelectedFromLink: (linkId: string, selectedKeys: string[]) => Promise<SyncRangesResult>;
  
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
  
  // Track update status for each link
  const [updateStatusMap, setUpdateStatusMap] = useState<Map<string, { hasUpdates: boolean; theirVersion: number }>>(new Map());
  
  // Version check cache (5 minute TTL)
  const versionCacheRef = useRef<VersionCache>({});
  
  // Use auth state listener for proper cleanup on sign-out
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [userName, setUserName] = useState<string>(
    auth.currentUser?.displayName || 
    auth.currentUser?.email?.split('@')[0] || 'Unknown'
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
        setLinks([]);
        setUpdateStatusMap(new Map());
        setLoading(false);
        versionCacheRef.current = {};
      }
    });
    return unsubscribe;
  }, []);
  
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
  
  // Convert active links to views (enriched with update status)
  const linkViews = useMemo<PlayerLinkView[]>(() => {
    return links
      .filter(link => link.status === 'active')
      .map(link => {
        const updateStatus = updateStatusMap.get(link.id);
        return playerLinksService.toPlayerLinkView(
          link, 
          updateStatus?.theirVersion ?? null
        );
      });
  }, [links, updateStatusMap]);
  
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
  
  // Check for updates when active links change (auto-refresh update status)
  useEffect(() => {
    if (!userId || activeLinks.length === 0) {
      setUpdateStatusMap(new Map());
      return;
    }

    let mounted = true;
    
    const checkUpdates = async () => {
      try {
        console.log('[usePlayerLinks] Checking for updates on', activeLinks.length, 'active links');
        const results = await playerLinksService.checkAllForUpdates(activeLinks, userId);
        
        if (mounted) {
          // Update cache
          for (const [linkId, result] of results.entries()) {
            versionCacheRef.current[linkId] = {
              data: result,
              timestamp: Date.now(),
            };
          }
          setUpdateStatusMap(results);
          
          // Log for debugging
          let updatesCount = 0;
          for (const [linkId, result] of results.entries()) {
            if (result.hasUpdates) {
              console.log(`[usePlayerLinks] Link ${linkId} has updates: theirVersion=${result.theirVersion}`);
              updatesCount++;
            }
          }
          console.log(`[usePlayerLinks] Found ${updatesCount} links with updates`);
        }
      } catch (err) {
        console.error('[usePlayerLinks] Error checking for updates:', err);
      }
    };
    
    // Check immediately
    checkUpdates();
    
    // Re-check periodically
    const intervalId = setInterval(checkUpdates, PLAYER_LINKS_CONFIG.CACHE_TTL_MS);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [userId, activeLinks]);
  
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
    
    // Debug: log where sync is being called from
    console.log(`[syncFromLink] SYNC INITIATED for linkId=${linkId}, userId=${userId}`);
    console.log('[syncFromLink] Call stack:', new Error().stack);
    
    try {
      const result = await playerLinksService.syncRangesFromLink(linkId, userId);
      console.log(`[syncFromLink] SYNC COMPLETED: added=${result.added}, skipped=${result.skipped}, newVersion=${result.newVersion}`);
      
      // Invalidate cache for this link since we just synced
      delete versionCacheRef.current[linkId];
      
      // Update the updateStatusMap to reflect that we're now synced
      setUpdateStatusMap(prev => {
        const newMap = new Map(prev);
        newMap.set(linkId, { hasUpdates: false, theirVersion: result.newVersion });
        return newMap;
      });
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sync ranges');
      setError(error);
      throw error;
    }
  }, [userId]);
  
  // Get ranges for sync preview
  const getRangesForSync = useCallback(async (linkId: string): Promise<{
    theirRanges: Record<string, Range>;
    myRanges: Record<string, Range>;
    theirVersion: number;
    availableKeys: string[];
    skippableKeys: string[];
  }> => {
    if (!userId) {
      throw new Error('You must be logged in to get sync data');
    }
    
    return playerLinksService.getRangesForSync(linkId, userId);
  }, [userId]);
  
  // Mark link as synced without transferring ranges (for "all caught up" case)
  const markLinkAsSynced = useCallback(async (linkId: string, theirVersion: number): Promise<void> => {
    if (!userId) {
      throw new Error('You must be logged in');
    }
    
    await playerLinksService.markLinkAsSynced(linkId, userId, theirVersion);
    
    // Invalidate cache and update status map
    delete versionCacheRef.current[linkId];
    setUpdateStatusMap(prev => {
      const newMap = new Map(prev);
      newMap.set(linkId, { hasUpdates: false, theirVersion });
      return newMap;
    });
  }, [userId]);
  
  // Sync selected ranges from a linked player
  const syncSelectedFromLink = useCallback(async (
    linkId: string,
    selectedKeys: string[]
  ): Promise<SyncRangesResult> => {
    if (!userId) {
      throw new Error('You must be logged in to sync');
    }
    
    console.log(`[syncSelectedFromLink] SYNC INITIATED for linkId=${linkId}, userId=${userId}, keys=${selectedKeys.join(',')}`);
    
    try {
      const result = await playerLinksService.syncSelectedRangesFromLink(linkId, userId, selectedKeys);
      console.log(`[syncSelectedFromLink] SYNC COMPLETED: added=${result.added}, skipped=${result.skipped}, newVersion=${result.newVersion}`);
      
      // Invalidate cache for this link since we just synced
      delete versionCacheRef.current[linkId];
      
      // Update the updateStatusMap to reflect that we're now synced
      setUpdateStatusMap(prev => {
        const newMap = new Map(prev);
        newMap.set(linkId, { hasUpdates: false, theirVersion: result.newVersion });
        return newMap;
      });
      
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
    getRangesForSync,
    markLinkAsSynced,
    syncFromLink,
    syncSelectedFromLink,
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
// USE PENDING UPDATES COUNT HOOK (for sync badge)
// ============================================

/**
 * Hook to get the count of active links that have updates available to sync.
 * Periodically checks friend's player versions (with caching).
 * Returns count of links with newer data to sync.
 */
export function usePendingUpdatesCount(): number {
  const [updateCount, setUpdateCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [activeLinks, setActiveLinks] = useState<UserPlayerLink[]>([]);
  const checkInProgressRef = useRef(false);

  // Track auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (!user) {
        setUpdateCount(0);
        setActiveLinks([]);
      }
    });
    return unsubscribe;
  }, []);

  // Subscribe to active links separately to avoid circular dependency
  useEffect(() => {
    if (!userId) {
      setActiveLinks([]);
      return;
    }

    const unsubscribe = playerLinksService.subscribeToPlayerLinks(
      userId,
      (links) => {
        const active = links.filter(l => l.status === 'active');
        console.log(`[usePendingUpdatesCount] Subscription update received: ${active.length} active links`);
        active.forEach(link => {
          console.log(`[usePendingUpdatesCount] Subscription data - Link ${link.id}: myLastSyncedVersion=${link.myLastSyncedVersion}`);
        });
        setActiveLinks(active);
      },
      (error) => {
        console.error('usePendingUpdatesCount subscription error:', error);
      }
    );

    return unsubscribe;
  }, [userId]);

  // Check for updates when active links change
  useEffect(() => {
    if (!userId || activeLinks.length === 0) {
      setUpdateCount(0);
      return;
    }

    let mounted = true;

    const runCheck = async () => {
      // Prevent concurrent checks
      if (checkInProgressRef.current) return;
      checkInProgressRef.current = true;

      try {
        console.log('[usePendingUpdatesCount] Checking updates for', activeLinks.length, 'active links');
        activeLinks.forEach(link => {
          console.log(`[usePendingUpdatesCount] Link ${link.id}: myLastSyncedVersion=${link.myLastSyncedVersion}, theirUserId=${link.theirUserId}, theirPlayerId=${link.theirPlayerId}`);
        });
        const results = await playerLinksService.checkAllForUpdates(activeLinks, userId);
        
        if (!mounted) return;
        
        let count = 0;
        for (const [linkId, result] of results.entries()) {
          console.log(`[usePendingUpdatesCount] Link ${linkId}: hasUpdates=${result.hasUpdates}, theirVersion=${result.theirVersion}`);
          if (result.hasUpdates) {
            count++;
          }
        }
        console.log('[usePendingUpdatesCount] Total updates count:', count);
        setUpdateCount(count);
      } catch (err) {
        console.error('Failed to check for updates:', err);
      } finally {
        checkInProgressRef.current = false;
      }
    };

    // Initial check
    runCheck();

    // Re-check periodically (matches cache TTL)
    const intervalId = setInterval(runCheck, PLAYER_LINKS_CONFIG.CACHE_TTL_MS);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [userId, activeLinks]);

  return updateCount;
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
