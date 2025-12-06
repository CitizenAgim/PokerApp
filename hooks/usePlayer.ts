import { auth } from '@/config/firebase';
import * as playersFirebase from '@/services/firebase/players';
import * as rangesFirebase from '@/services/firebase/ranges';
import { GUEST_USER_ID } from '@/services/guestMode';
import * as localStorage from '@/services/localStorage';
import { isOnline } from '@/services/sync';
import { Player, UpdatePlayer } from '@/types/poker';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// IN-MEMORY CACHE FOR FAST ACCESS
// ============================================

const playerCache = new Map<string, Player>();
const playerListeners = new Set<(playerId: string, player: Player) => void>();

function subscribeToPlayerCache(callback: (playerId: string, player: Player) => void) {
  playerListeners.add(callback);
  return () => playerListeners.delete(callback);
}

function notifyPlayerListeners(playerId: string, player: Player) {
  playerListeners.forEach(listener => listener(playerId, player));
}

function getCachedPlayer(id: string): Player | null {
  return playerCache.get(id) || null;
}

function setCachedPlayer(player: Player): void {
  playerCache.set(player.id, player);
  notifyPlayerListeners(player.id, player);
}

function removeCachedPlayer(id: string): void {
  playerCache.delete(id);
}

// ============================================
// USE PLAYERS HOOK
// ============================================

interface UsePlayersResult {
  players: Player[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  refreshPlayers: () => Promise<void>;
  createPlayer: (player: { name: string; notes?: string; photoUrl?: string }) => Promise<Player>;
  updatePlayer: (player: UpdatePlayer) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
}

export function usePlayers(): UsePlayersResult {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPlayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Always load from local first for instant display
      const localPlayers = await localStorage.getPlayers();
      setPlayers(localPlayers);

      // Then try to sync with cloud if user is logged in
      const userId = auth.currentUser?.uid;
      if (userId && await isOnline()) {
        try {
          const cloudPlayers = await playersFirebase.getPlayers(userId);
          
          // Merge local and cloud (cloud wins on conflicts)
          const merged = mergePlayersData(localPlayers, cloudPlayers);
          
          // Update local storage with merged data
          for (const player of merged) {
            await localStorage.savePlayer(player);
          }
          
          setPlayers(merged);
        } catch (cloudError) {
          console.warn('Could not sync with cloud:', cloudError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load players'));
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlayer = useCallback(async (
    playerData: { name: string; notes?: string; photoUrl?: string }
  ): Promise<Player> => {
    // Use Firebase user ID if logged in, otherwise use guest ID
    const userId = auth.currentUser?.uid || GUEST_USER_ID;

    const id = localStorage.generateId();
    const player: Player = {
      id,
      ...playerData,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save locally first (always works)
    await localStorage.savePlayer(player);
    setCachedPlayer(player);
    setPlayers(prev => [player, ...prev]);

    // Try to sync to cloud only if user is logged in (not guest)
    if (auth.currentUser?.uid && await isOnline()) {
      try {
        await playersFirebase.createPlayer(
          { ...playerData, createdBy: auth.currentUser.uid },
          id
        );
      } catch (err) {
        console.warn('Could not sync player to cloud:', err);
      }
    }

    return player;
  }, []);

  const updatePlayer = useCallback(async (playerUpdate: UpdatePlayer): Promise<void> => {
    // Update locally first
    const existingPlayer = await localStorage.getPlayer(playerUpdate.id);
    if (!existingPlayer) throw new Error('Player not found');

    const updatedPlayer: Player = {
      ...existingPlayer,
      ...playerUpdate,
      updatedAt: Date.now(),
    };

    await localStorage.savePlayer(updatedPlayer);
    setCachedPlayer(updatedPlayer);
    setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));

    // Try to sync to cloud only if user is logged in and player was created by them
    const userId = auth.currentUser?.uid;
    if (userId && existingPlayer.createdBy === userId && await isOnline()) {
      try {
        await playersFirebase.updatePlayer(playerUpdate);
      } catch (err) {
        console.warn('Could not sync player update to cloud:', err);
      }
    }
  }, []);

  const deletePlayer = useCallback(async (id: string): Promise<void> => {
    const existingPlayer = await localStorage.getPlayer(id);
    
    // Delete locally
    await localStorage.deletePlayer(id);
    removeCachedPlayer(id);
    setPlayers(prev => prev.filter(p => p.id !== id));

    // Try to sync to cloud only if user is logged in and player was created by them
    const userId = auth.currentUser?.uid;
    if (userId && existingPlayer?.createdBy === userId && await isOnline()) {
      try {
        await playersFirebase.deletePlayer(id);
        await rangesFirebase.deletePlayerRanges(id);
      } catch (err) {
        console.warn('Could not sync player deletion to cloud:', err);
      }
    }
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  return {
    players,
    loading,
    error,
    refresh: loadPlayers,
    refreshPlayers: loadPlayers,
    createPlayer,
    updatePlayer,
    deletePlayer,
  };
}

// ============================================
// USE SINGLE PLAYER HOOK
// ============================================

interface UsePlayerResult {
  player: Player | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function usePlayer(playerId: string): UsePlayerResult {
  const [player, setPlayer] = useState<Player | null>(() => getCachedPlayer(playerId));
  const [loading, setLoading] = useState(!getCachedPlayer(playerId));
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to cache updates
  useEffect(() => {
    return subscribeToPlayerCache((updatedPlayerId, updatedPlayer) => {
      if (updatedPlayerId === playerId) {
        setPlayer(updatedPlayer);
      }
    });
  }, [playerId]);

  // Load local data immediately on mount (skip if already cached)
  useEffect(() => {
    // If we have a cached player, we're already good
    if (getCachedPlayer(playerId)) {
      setPlayer(getCachedPlayer(playerId));
      setLoading(false);
      return;
    }
    
    let mounted = true;
    
    const loadLocal = async () => {
      try {
        const localPlayer = await localStorage.getPlayer(playerId);
        if (mounted && localPlayer) {
          setCachedPlayer(localPlayer);
          setPlayer(localPlayer);
          setLoading(false);
        } else if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load player'));
          setLoading(false);
        }
      }
    };
    
    loadLocal();
    
    return () => { mounted = false; };
  }, [playerId]);

  // Background cloud sync (non-blocking)
  useEffect(() => {
    let mounted = true;
    
    const syncCloud = async () => {
      try {
        if (await isOnline()) {
          const cloudPlayer = await playersFirebase.getPlayer(playerId);
          if (cloudPlayer && mounted) {
            await localStorage.savePlayer(cloudPlayer);
            setCachedPlayer(cloudPlayer);
            setPlayer(cloudPlayer);
          }
        }
      } catch (err) {
        console.warn('Could not fetch player from cloud:', err);
      }
    };
    
    syncCloud();
    
    return () => { mounted = false; };
  }, [playerId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const localPlayer = await localStorage.getPlayer(playerId);
      if (localPlayer) {
        setCachedPlayer(localPlayer);
        setPlayer(localPlayer);
      }
      
      if (await isOnline()) {
        const cloudPlayer = await playersFirebase.getPlayer(playerId);
        if (cloudPlayer) {
          await localStorage.savePlayer(cloudPlayer);
          setCachedPlayer(cloudPlayer);
          setPlayer(cloudPlayer);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load player'));
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  return {
    player,
    loading,
    error,
    refresh,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mergePlayersData(local: Player[], cloud: Player[]): Player[] {
  const playerMap = new Map<string, Player>();

  // Add local players
  for (const player of local) {
    playerMap.set(player.id, player);
  }

  // Cloud data wins on conflicts (newer updatedAt)
  for (const player of cloud) {
    const existing = playerMap.get(player.id);
    if (!existing || player.updatedAt > existing.updatedAt) {
      playerMap.set(player.id, player);
    }
  }

  return Array.from(playerMap.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
}
