import { auth } from '@/config/firebase';
import { Player, PlayerRanges, Session } from '@/types/poker';
import NetInfo from '@react-native-community/netinfo';
import * as playersFirebase from './firebase/players';
import * as rangesFirebase from './firebase/ranges';
import * as sessionsFirebase from './firebase/sessions';
import * as localStorage from './localStorage';

// ============================================
// SYNC STATUS
// ============================================

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

let syncStatus: SyncStatus = 'idle';
let syncListeners: ((status: SyncStatus) => void)[] = [];

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

export function addSyncListener(listener: (status: SyncStatus) => void): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener);
  };
}

function setSyncStatus(status: SyncStatus): void {
  syncStatus = status;
  syncListeners.forEach(l => l(status));
}

// ============================================
// CONNECTIVITY CHECK (cached for performance)
// ============================================

let cachedOnlineStatus: boolean | null = null;
let lastOnlineCheck = 0;
const ONLINE_CHECK_CACHE_MS = 5000; // Cache for 5 seconds

export async function isOnline(): Promise<boolean> {
  const now = Date.now();
  
  // Return cached value if fresh
  if (cachedOnlineStatus !== null && now - lastOnlineCheck < ONLINE_CHECK_CACHE_MS) {
    return cachedOnlineStatus;
  }
  
  try {
    const state = await NetInfo.fetch();
    // If isInternetReachable is null, it means the check is still pending.
    // We assume online if isConnected is true to avoid false positives on startup.
    cachedOnlineStatus = state.isConnected === true && (state.isInternetReachable === true || state.isInternetReachable === null);
    lastOnlineCheck = now;
    return cachedOnlineStatus;
  } catch {
    cachedOnlineStatus = false;
    lastOnlineCheck = now;
    return false;
  }
}

// Invalidate cache when network changes
NetInfo.addEventListener(state => {
  cachedOnlineStatus = state.isConnected === true && (state.isInternetReachable === true || state.isInternetReachable === null);
  lastOnlineCheck = Date.now();
});

// ============================================
// SYNC PENDING CHANGES
// ============================================

export async function syncPendingChanges(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.log('No user logged in, skipping sync');
    return;
  }
  
  console.log(`[Sync] Starting sync for user: ${userId}`);

  const online = await isOnline();
  if (!online) {
    setSyncStatus('offline');
    return;
  }

  const pending = await localStorage.getPendingSync();
  if (pending.length === 0) {
    setSyncStatus('idle');
    return;
  }

  if (syncStatus === 'syncing') {
    console.log('[Sync] Sync already in progress, skipping');
    return;
  }

  setSyncStatus('syncing');

  const skippedTargetIds = new Set<string>();

  try {
    for (const item of pending) {
      // Check if this item's target has been marked for skipping
      let currentTargetId: string | undefined;
      if (item.collection === 'players') {
        currentTargetId = (item.data as Player | { id: string })?.id;
      } else if (item.collection === 'sessions') {
        currentTargetId = (item.data as Session | { id: string })?.id;
      } else if (item.collection === 'playerRanges') {
        currentTargetId = (item.data as PlayerRanges | { playerId: string })?.playerId;
      }

      if (currentTargetId && skippedTargetIds.has(currentTargetId)) {
        console.log(`[Sync] Skipping item ${item.id} because target ${currentTargetId} was removed`);
        continue;
      }

      try {
        console.log(`[Sync] Processing item ${item.id} (${item.collection}/${item.operation})`);
        await syncItem(item, userId);
        await localStorage.removePendingSync(item.id);
      } catch (error: any) {
        console.error(`Error syncing item ${item.id}:`, error);
        
        // If document not found during update/delete, it's already gone from server
        // So we can safely remove it from pending sync
        if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
          console.log(`[Sync] Document not found, removing pending sync item ${item.id}`);
          
          // Extract target ID to remove ALL pending operations for this missing document
          let targetId: string | undefined;
          if (item.collection === 'players') {
            targetId = (item.data as Player | { id: string })?.id;
          } else if (item.collection === 'sessions') {
            targetId = (item.data as Session | { id: string })?.id;
          } else if (item.collection === 'playerRanges') {
            targetId = (item.data as PlayerRanges | { playerId: string })?.playerId;
          }

          if (targetId) {
             console.log(`[Sync] Removing all pending operations for target ${targetId}`);
             await localStorage.removePendingSyncByTargetId(item.collection, targetId);
             skippedTargetIds.add(targetId);
          } else {
             await localStorage.removePendingSync(item.id);
          }
        }
        // Continue with other items
      }
    }
    setSyncStatus('idle');
  } catch (error) {
    console.error('Sync error:', error);
    setSyncStatus('error');
  }
}

async function syncItem(
  item: localStorage.PendingSyncItem,
  userId: string
): Promise<void> {
  const { collection, operation, data } = item;

  switch (collection) {
    case 'players':
      await syncPlayer(operation, data as Player | { id: string }, userId);
      break;
    case 'playerRanges':
      await syncPlayerRanges(operation, data as PlayerRanges | { playerId: string });
      break;
    case 'sessions':
      await syncSession(operation, data as Session | { id: string }, userId);
      break;
  }
}

async function syncPlayer(
  operation: localStorage.SyncOperation,
  data: Player | { id: string },
  userId: string
): Promise<void> {
  switch (operation) {
    case 'create':
    case 'update':
      const player = data as Player;
      if (operation === 'create') {
        console.log(`[Sync] Creating player with createdBy: ${userId}`);
        await playersFirebase.createPlayer(
          {
            name: player.name,
            photoUrl: player.photoUrl || null,
            notes: player.notes || null,
            notesList: player.notesList || [],
            createdBy: userId,
          } as any,
          player.id
        );
      } else {
        await playersFirebase.updatePlayer({
          id: player.id,
          name: player.name,
          photoUrl: player.photoUrl || null,
          notes: player.notes || null,
          notesList: player.notesList || [],
        } as any);
      }
      break;
    case 'delete':
      await playersFirebase.deletePlayer((data as { id: string }).id);
      break;
  }
}

async function syncPlayerRanges(
  operation: localStorage.SyncOperation,
  data: PlayerRanges | { playerId: string }
): Promise<void> {
  switch (operation) {
    case 'create':
    case 'update':
      await rangesFirebase.savePlayerRanges(data as PlayerRanges);
      break;
    case 'delete':
      await rangesFirebase.deletePlayerRanges((data as { playerId: string }).playerId);
      break;
  }
}

async function syncSession(
  operation: localStorage.SyncOperation,
  data: Session | { id: string },
  userId: string
): Promise<void> {
  switch (operation) {
    case 'create':
      const newSession = data as Session;
      // Strip table data before syncing
      const { table: _, ...sessionData } = newSession;
      
      await sessionsFirebase.createSession(
        {
          name: sessionData.name,
          location: sessionData.location,
          stakes: sessionData.stakes,
          createdBy: userId,
        },
        undefined, // No table data
        sessionData.id
      );
      break;
    case 'update':
      const updatedSession = data as Session;
      // Strip table data before syncing
      const { table: __, ...updatedSessionData } = updatedSession;

      await sessionsFirebase.updateSession(updatedSessionData.id, {
        ...updatedSessionData,
        // Ensure timestamps are numbers
        startTime: updatedSessionData.startTime,
        endTime: updatedSessionData.endTime,
      });
      break;
    case 'delete':
      await sessionsFirebase.deleteSession((data as { id: string }).id);
      break;
  }
}

// ============================================
// PULL FROM CLOUD
// ============================================

export async function pullFromCloud(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.log('No user logged in, skipping pull');
    return;
  }

  const online = await isOnline();
  if (!online) {
    setSyncStatus('offline');
    return;
  }

  setSyncStatus('syncing');

  try {
    const pending = await localStorage.getPendingSync();
    
    const pendingPlayerIds = new Set(
      pending
        .filter(p => p.collection === 'players')
        .map(p => (p.data as Player | { id: string })?.id)
        .filter(Boolean)
    );

    const pendingSessionIds = new Set(
      pending
        .filter(p => p.collection === 'sessions')
        .map(p => (p.data as Session | { id: string })?.id)
        .filter(Boolean)
    );

    // Pull players
    const cloudPlayers = await playersFirebase.getPlayers(userId);
    for (const player of cloudPlayers) {
      if (pendingPlayerIds.has(player.id)) continue;
      await localStorage.savePlayerFromCloud(player);
    }

    // Pull ranges for each player
    for (const player of cloudPlayers) {
      // Note: We don't have granular pending checks for ranges easily, 
      // but ranges are usually sub-collections. 
      // For now, we'll skip if player has pending changes to be safe, 
      // or we could check pending ranges.
      // Let's check pending ranges for this player.
      const hasPendingRanges = pending.some(
        p => p.collection === 'playerRanges' && 
        (p.data as PlayerRanges | { playerId: string })?.playerId === player.id
      );
      
      if (hasPendingRanges) continue;

      const ranges = await rangesFirebase.getPlayerRanges(player.id);
      if (ranges) {
        await localStorage.savePlayerRangesFromCloud(ranges);
      }
    }

    // Pull sessions
    const cloudSessions = await sessionsFirebase.getSessions(userId);
    for (const session of cloudSessions) {
      if (pendingSessionIds.has(session.id)) {
        // If we have pending changes (like ending the session), don't overwrite with cloud data
        continue;
      }
      await localStorage.saveSessionFromCloud(session);
    }

    // Clear pending sync since we just pulled fresh data
    // NOTE: We don't clear pending sync here anymore because we are using
    // save...FromCloud methods which don't add to pending sync.
    // However, if there were pending changes that conflicted, we might want to resolve them.
    // For now, we assume cloud is truth for initial pull.
    
    setSyncStatus('idle');
  } catch (error) {
    console.error('Pull error:', error);
    setSyncStatus('error');
  }
}

// ============================================
// FULL SYNC (PUSH + PULL)
// ============================================

export async function fullSync(): Promise<void> {
  // First push local changes
  await syncPendingChanges();
  
  // Then pull from cloud
  await pullFromCloud();
}

// ============================================
// AUTO SYNC SETUP
// ============================================

let syncInterval: ReturnType<typeof setInterval> | null = null;
let unsubscribeNetInfo: (() => void) | null = null;

export function startAutoSync(intervalMs: number = 30000): void {
  // Sync immediately (Full sync to ensure we get cloud data on startup)
  fullSync();

  // Set up interval
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  syncInterval = setInterval(syncPendingChanges, intervalMs);

  // Listen for network changes
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
  }
  unsubscribeNetInfo = NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable) {
      // We're back online, sync pending changes
      syncPendingChanges();
    } else {
      setSyncStatus('offline');
    }
  });
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}
