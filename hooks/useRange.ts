import * as rangesFirebase from '@/services/firebase/ranges';
import * as localStorage from '@/services/localStorage';
import { isOnline } from '@/services/sync';
import { Action, PlayerRanges, Position, Range } from '@/types/poker';
import { createEmptyRange } from '@/utils/handRanking';
import { useCallback, useEffect, useState } from 'react';

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
  const [ranges, setRanges] = useState<PlayerRanges | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load local data immediately on mount
  useEffect(() => {
    if (!playerId) return;
    
    let mounted = true;
    
    const loadLocal = async () => {
      try {
        const localRanges = await localStorage.getPlayerRanges(playerId);
        if (mounted) {
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

  // Background cloud sync (non-blocking)
  useEffect(() => {
    if (!playerId) return;
    
    let mounted = true;
    
    const syncCloud = async () => {
      try {
        if (await isOnline()) {
          const cloudRanges = await rangesFirebase.getPlayerRanges(playerId);
          if (cloudRanges && mounted) {
            const localRanges = await localStorage.getPlayerRanges(playerId);
            if (!localRanges || cloudRanges.lastObserved > localRanges.lastObserved) {
              await localStorage.savePlayerRanges(cloudRanges);
              setRanges(cloudRanges);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch ranges from cloud:', err);
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
      setRanges(localRanges);
      
      if (await isOnline()) {
        const cloudRanges = await rangesFirebase.getPlayerRanges(playerId);
        if (cloudRanges) {
          if (!localRanges || cloudRanges.lastObserved > localRanges.lastObserved) {
            await localStorage.savePlayerRanges(cloudRanges);
            setRanges(cloudRanges);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load ranges'));
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const getRange = useCallback((position: Position, action: Action): Range => {
    const key = rangesFirebase.getRangeKey(position, action);
    return ranges?.ranges[key] || createEmptyRange();
  }, [ranges]);

  const updateRange = useCallback(async (
    position: Position,
    action: Action,
    range: Range
  ): Promise<void> => {
    const key = rangesFirebase.getRangeKey(position, action);

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

    // Try to sync to cloud
    if (await isOnline()) {
      try {
        await rangesFirebase.updatePlayerRange(playerId, key, range);
      } catch (err) {
        console.warn('Could not sync range to cloud:', err);
      }
    }
  }, [playerId]);

  const clearRange = useCallback(async (
    position: Position,
    action: Action
  ): Promise<void> => {
    const key = rangesFirebase.getRangeKey(position, action);
    const emptyRange = createEmptyRange();

    await updateRange(position, action, emptyRange);

    // Also clear in cloud
    if (await isOnline()) {
      try {
        await rangesFirebase.clearPlayerRange(playerId, key);
      } catch (err) {
        console.warn('Could not clear range in cloud:', err);
      }
    }
  }, [playerId, updateRange]);

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
}

export function useRange(
  playerId: string,
  position: Position,
  action: Action
): UseRangeResult {
  const [range, setRange] = useState<Range>(createEmptyRange());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const rangeKey = rangesFirebase.getRangeKey(position, action);

  const loadRange = useCallback(async () => {
    if (!playerId) return;

    try {
      setLoading(true);
      setError(null);

      // Load from local
      const localRanges = await localStorage.getPlayerRanges(playerId);
      const localRange = localRanges?.ranges[rangeKey];
      
      if (localRange) {
        setRange(localRange);
      }

      // Try cloud
      if (await isOnline()) {
        try {
          const cloudRanges = await rangesFirebase.getPlayerRanges(playerId);
          const cloudRange = cloudRanges?.ranges[rangeKey];
          
          if (cloudRange) {
            setRange(cloudRange);
          }
        } catch (err) {
          console.warn('Could not fetch range from cloud:', err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load range'));
    } finally {
      setLoading(false);
    }
  }, [playerId, rangeKey]);

  const save = useCallback(async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);

      // Save locally
      await localStorage.updatePlayerRange(playerId, rangeKey, range);

      // Sync to cloud
      if (await isOnline()) {
        try {
          await rangesFirebase.updatePlayerRange(playerId, rangeKey, range);
        } catch (err) {
          console.warn('Could not save range to cloud:', err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save range'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [playerId, rangeKey, range]);

  const clear = useCallback(async (): Promise<void> => {
    const emptyRange = createEmptyRange();
    setRange(emptyRange);

    try {
      setSaving(true);
      await localStorage.updatePlayerRange(playerId, rangeKey, emptyRange);

      if (await isOnline()) {
        try {
          await rangesFirebase.clearPlayerRange(playerId, rangeKey);
        } catch (err) {
          console.warn('Could not clear range in cloud:', err);
        }
      }
    } finally {
      setSaving(false);
    }
  }, [playerId, rangeKey]);

  useEffect(() => {
    loadRange();
  }, [loadRange]);

  return {
    range,
    loading,
    saving,
    error,
    setRange,
    save,
    clear,
  };
}
