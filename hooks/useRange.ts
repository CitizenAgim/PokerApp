import { auth } from '@/config/firebase';
import * as playersFirebase from '@/services/firebase/players';
import * as localStorage from '@/services/localStorage';
import { isOnline } from '@/services/sync';
import { Action, PlayerRanges, Position, Range } from '@/types/poker';
import { createEmptyRange } from '@/utils/handRanking';
import { propagateRangeUpdates } from '@/utils/rangePropagation';
import { useCallback, useEffect, useState } from 'react';

/**
 * Get range key from position and action
 */
function getRangeKey(position: Position | string, action: Action | string): string {
  return `${position}_${action}`;
}

// ============================================
// IN-MEMORY CACHE FOR FAST ACCESS
// ============================================

const rangesCache = new Map<string, PlayerRanges>();
const listeners = new Set<(playerId: string, ranges: PlayerRanges) => void>();

function subscribeToCache(callback: (playerId: string, ranges: PlayerRanges) => void): () => void {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

function notifyListeners(playerId: string, ranges: PlayerRanges) {
  listeners.forEach(listener => listener(playerId, ranges));
}

function getCachedRanges(playerId: string): PlayerRanges | null {
  return rangesCache.get(playerId) || null;
}

function setCachedRanges(ranges: PlayerRanges): void {
  rangesCache.set(ranges.playerId, ranges);
  notifyListeners(ranges.playerId, ranges);
}

// Update a specific range in the cache
function updateCachedRange(playerId: string, rangeKey: string, range: Range): void {
  const cached = rangesCache.get(playerId);
  let newRanges: PlayerRanges;

  if (cached) {
    newRanges = {
      ...cached,
      ranges: { ...cached.ranges, [rangeKey]: range },
      lastObserved: Date.now(),
    };
  } else {
    // Create new cache entry
    newRanges = {
      playerId,
      ranges: { [rangeKey]: range },
      lastObserved: Date.now(),
      handsObserved: 1,
    };
  }
  
  rangesCache.set(playerId, newRanges);
  notifyListeners(playerId, newRanges);
}

function isOfflineError(error: any): boolean {
  return (
    error?.code === 'unavailable' ||
    error?.message?.includes('offline') ||
    error?.message?.includes('network')
  );
}

// ============================================
// USE PLAYER RANGES HOOK
// ============================================

interface UsePlayerRangesResult {
  ranges: PlayerRanges | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getRange: (position: Position, action: Action) => Range;
  updateRange: (position: Position, action: Action, range: Range) => Promise<void>;
  clearRange: (position: Position, action: Action) => Promise<void>;
}

export function usePlayerRanges(playerId: string): UsePlayerRangesResult {
  const [ranges, setRanges] = useState<PlayerRanges | null>(() => getCachedRanges(playerId));
  const [loading, setLoading] = useState(!getCachedRanges(playerId));
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to cache updates
  useEffect(() => {
    return subscribeToCache((updatedPlayerId, updatedRanges) => {
      if (updatedPlayerId === playerId) {
        setRanges(updatedRanges);
      }
    });
  }, [playerId]);

  // Load local data immediately on mount (skip if already cached)
  useEffect(() => {
    if (!playerId) return;
    
    // If we have cached ranges, we're already good
    if (getCachedRanges(playerId)) {
      setRanges(getCachedRanges(playerId));
      setLoading(false);
      return;
    }
    
    let mounted = true;
    
    const loadLocal = async () => {
      try {
        const localRanges = await localStorage.getPlayerRanges(playerId);
        if (mounted) {
          if (localRanges) {
            setCachedRanges(localRanges);
          }
          setRanges(localRanges);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load ranges'));
          setLoading(false);
        }
      }
    };
    
    loadLocal();
    
    return () => { mounted = false; };
  }, [playerId]);

  // Background cloud sync (non-blocking) - now uses embedded ranges in player doc
  useEffect(() => {
    if (!playerId) return;
    
    let mounted = true;
    
    const syncCloud = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (userId && await isOnline()) {
          // Get ranges from embedded player document
          const cloudRanges = await playersFirebase.getPlayerRanges(userId, playerId);
          if (cloudRanges && mounted) {
            const localRanges = await localStorage.getPlayerRanges(playerId);
            // Convert to PlayerRanges format
            const playerRanges: PlayerRanges = {
              playerId,
              ranges: cloudRanges,
              lastObserved: Date.now(),
              handsObserved: localRanges?.handsObserved || 0,
            };
            await localStorage.savePlayerRanges(playerRanges);
            setCachedRanges(playerRanges);
            setRanges(playerRanges);
          }
        }
      } catch (err) {
        if (!isOfflineError(err)) {
          console.warn('Could not fetch ranges from cloud:', err);
        }
      }
    };
    
    syncCloud();
    
    return () => { mounted = false; };
  }, [playerId]);

  const loadRanges = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const localRanges = await localStorage.getPlayerRanges(playerId);
      if (localRanges) {
        setCachedRanges(localRanges);
      }
      setRanges(localRanges);
      
      const userId = auth.currentUser?.uid;
      if (userId && await isOnline()) {
        const cloudRanges = await playersFirebase.getPlayerRanges(userId, playerId);
        if (cloudRanges) {
          const playerRanges: PlayerRanges = {
            playerId,
            ranges: cloudRanges,
            lastObserved: Date.now(),
            handsObserved: localRanges?.handsObserved || 0,
          };
          await localStorage.savePlayerRanges(playerRanges);
          setCachedRanges(playerRanges);
          setRanges(playerRanges);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load ranges'));
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const getRange = useCallback((position: Position, action: Action): Range => {
    const key = getRangeKey(position, action);
    return ranges?.ranges[key] || createEmptyRange();
  }, [ranges]);

  const updateRange = useCallback(async (
    position: Position,
    action: Action,
    range: Range
  ): Promise<void> => {
    const key = getRangeKey(position, action);

    // Update locally
    await localStorage.updatePlayerRange(playerId, key, range);

    // Update state
    setRanges(prev => {
      if (!prev) {
        return {
          playerId,
          ranges: { [key]: range },
          lastObserved: Date.now(),
          handsObserved: 1,
        };
      }
      return {
        ...prev,
        ranges: { ...prev.ranges, [key]: range },
        lastObserved: Date.now(),
        handsObserved: prev.handsObserved + 1,
      };
    });

    // Try to sync to cloud using embedded ranges
    const userId = auth.currentUser?.uid;
    if (userId && await isOnline()) {
      try {
        await playersFirebase.updatePlayerRange(userId, playerId, key, range);
      } catch (err) {
        if (!isOfflineError(err)) {
          console.warn('Could not sync range to cloud:', err);
        }
      }
    }
  }, [playerId]);

  const clearRange = useCallback(async (
    position: Position,
    action: Action
  ): Promise<void> => {
    const emptyRange = createEmptyRange();
    await updateRange(position, action, emptyRange);
  }, [updateRange]);
  return {
    ranges,
    loading,
    error,
    refresh: loadRanges,
    getRange,
    updateRange,
    clearRange,
  };
}

// ============================================
// USE SINGLE RANGE HOOK (for editing)
// ============================================

interface UseRangeResult {
  range: Range;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  setRange: (range: Range) => void;
  save: () => Promise<void>;
  clear: () => Promise<void>;
  undo: () => void;
  canUndo: boolean;
}

export function useRange(
  playerId: string,
  position: Position,
  action: Action
): UseRangeResult {
  const rangeKey = getRangeKey(position, action);
  
  // Try to get initial value from cache
  const cachedRanges = getCachedRanges(playerId);
  const initialRange = cachedRanges?.ranges[rangeKey] || createEmptyRange();
  
  const [range, _setRange] = useState<Range>(initialRange);
  const [history, setHistory] = useState<Range[]>([]);
  const [loading, setLoading] = useState(!cachedRanges);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Wrapper for setRange to track history
  const setRange = useCallback((newRange: Range) => {
    setHistory(prev => [...prev, range]);
    _setRange(newRange);
  }, [range]);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const previousRange = newHistory.pop();
      if (previousRange) {
        _setRange(previousRange);
      }
      return newHistory;
    });
  }, []);

  const canUndo = history.length > 0;

  // Load local data immediately on mount (skip if already cached)
  useEffect(() => {
    if (!playerId) return;
    
    // If we have cached ranges, use them immediately
    const cached = getCachedRanges(playerId);
    if (cached) {
      const cachedRange = cached.ranges[rangeKey];
      _setRange(cachedRange || createEmptyRange());
      setLoading(false);
      return;
    }
    
    let mounted = true;
    
    const loadLocal = async () => {
      try {
        const localRanges = await localStorage.getPlayerRanges(playerId);
        const localRange = localRanges?.ranges[rangeKey];
        
        if (mounted) {
          if (localRanges) {
            setCachedRanges(localRanges);
          }
          _setRange(localRange || createEmptyRange());
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load range'));
          setLoading(false);
        }
      }
    };
    
    loadLocal();
    
    return () => { mounted = false; };
  }, [playerId, rangeKey]);

  // Background cloud sync (non-blocking) - now uses embedded ranges
  useEffect(() => {
    if (!playerId) return;
    
    let mounted = true;
    
    const syncCloud = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (userId && await isOnline()) {
          const cloudRanges = await playersFirebase.getPlayerRanges(userId, playerId);
          const cloudRange = cloudRanges?.[rangeKey];
          
          if (cloudRange && mounted) {
            _setRange(cloudRange);
          }
        }
      } catch (err) {
        if (!isOfflineError(err)) {
          console.warn('Could not fetch range from cloud:', err);
        }
      }
    };
    
    syncCloud();
    
    return () => { mounted = false; };
  }, [playerId, rangeKey]);

  const save = useCallback(async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);

      // 1. Save the current range (as before)
      await localStorage.updatePlayerRange(playerId, rangeKey, range);
      updateCachedRange(playerId, rangeKey, range);

      // 2. Propagate updates
      const updates = await propagateRangeUpdates(
        position,
        action,
        range,
        async (pos, act) => {
          const key = getRangeKey(pos, act);
          // Try cache first
          const cached = getCachedRanges(playerId);
          if (cached && cached.ranges[key]) return cached.ranges[key];
          
          // Fallback to local storage
          const local = await localStorage.getPlayerRanges(playerId);
          return local?.ranges[key] || createEmptyRange();
        }
      );

      // 3. Save propagated updates
      for (const update of updates) {
        const updateKey = getRangeKey(update.position, update.action);
        
        // Save locally
        await localStorage.updatePlayerRange(playerId, updateKey, update.range);
        updateCachedRange(playerId, updateKey, update.range);
        
        // Sync to cloud (fire and forget)
        isOnline().then(online => {
          if (online) {
            const userId = auth.currentUser?.uid;
            if (userId) {
              playersFirebase.updatePlayerRange(userId, playerId, updateKey, update.range).catch(err => {
                if (!isOfflineError(err)) {
                  console.warn('Could not sync propagated range to cloud:', err);
                }
              });
            }
          }
        });
      }

      // Sync current range to cloud (fire and forget)
      isOnline().then(online => {
        if (online) {
          const userId = auth.currentUser?.uid;
          if (userId) {
            playersFirebase.updatePlayerRange(userId, playerId, rangeKey, range).catch(err => {
              if (!isOfflineError(err)) {
                console.warn('Could not save range to cloud:', err);
              }
            });
          }
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save range'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [playerId, rangeKey, range, position, action]);

  const clear = useCallback(async (): Promise<void> => {
    const emptyRange = createEmptyRange();
    setRange(emptyRange); // Use wrapper to save history

    try {
      setSaving(true);
      await localStorage.updatePlayerRange(playerId, rangeKey, emptyRange);
      
      // Update the in-memory cache
      updateCachedRange(playerId, rangeKey, emptyRange);

      // Cloud sync in background - update with empty range
      isOnline().then(online => {
        if (online) {
          const userId = auth.currentUser?.uid;
          if (userId) {
            playersFirebase.updatePlayerRange(userId, playerId, rangeKey, emptyRange).catch(err => {
              if (!isOfflineError(err)) {
                console.warn('Could not clear range in cloud:', err);
              }
            });
          }
        }
      });
    } finally {
      setSaving(false);
    }
  }, [playerId, rangeKey, setRange]);

  return {
    range,
    loading,
    saving,
    error,
    setRange,
    save,
    clear,
    undo,
    canUndo,
  };
}
