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
// CONNECTIVITY CHECK
// ============================================

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  } catch {
    return false;
  }
}

// ============================================
// SYNC PENDING CHANGES
// ============================================

export async function syncPendingChanges(): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.log('No user logged in, skipping sync');
    return;
  }

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

  setSyncStatus('syncing');

  try {
    for (const item of pending) {
      try {
        await syncItem(item, userId);
        await localStorage.removePendingSync(item.id);
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error);
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
        await playersFirebase.createPlayer(
          {
            name: player.name,
            photoUrl: player.photoUrl,
            notes: player.notes,
            createdBy: userId,
            sharedWith: player.sharedWith || [],
          },
          player.id
        );
      } else {
        await playersFirebase.updatePlayer({
          id: player.id,
          name: player.name,
          photoUrl: player.photoUrl,
          notes: player.notes,
          sharedWith: player.sharedWith,
        });
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
      await sessionsFirebase.createSession(
        {
          name: newSession.name,
          location: newSession.location,
          stakes: newSession.stakes,
          createdBy: userId,
        },
        undefined,
        newSession.id
      );
      break;
    case 'update':
      const updatedSession = data as Session;
      await sessionsFirebase.updateSession(updatedSession.id, {
        name: updatedSession.name,
        location: updatedSession.location,
        stakes: updatedSession.stakes,
        isActive: updatedSession.isActive,
        endTime: updatedSession.endTime,
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
    // Pull players
    const cloudPlayers = await playersFirebase.getPlayers(userId);
    for (const player of cloudPlayers) {
      await localStorage.savePlayer(player);
    }

    // Pull ranges for each player
    for (const player of cloudPlayers) {
      const ranges = await rangesFirebase.getPlayerRanges(player.id);
      if (ranges) {
        await localStorage.savePlayerRanges(ranges);
      }
    }

    // Pull sessions
    const cloudSessions = await sessionsFirebase.getSessions(userId);
    for (const session of cloudSessions) {
      await localStorage.saveSession(session);
    }

    // Clear pending sync since we just pulled fresh data
    await localStorage.clearPendingSync();

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
  // Sync immediately
  syncPendingChanges();

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
