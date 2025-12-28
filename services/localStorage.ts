import { Player, PlayerRanges, Range, Session, Table } from '@/types/poker';
import { normalizeLocation } from '@/utils/text';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// STORAGE KEYS
// ============================================

const KEYS = {
  PLAYERS: '@pokerapp/players',
  PLAYER_RANGES: '@pokerapp/playerRanges',
  SESSIONS: '@pokerapp/sessions',
  CURRENT_SESSION: '@pokerapp/currentSession',
  PENDING_SYNC: '@pokerapp/pendingSync',
  USER_PREFERENCES: '@pokerapp/preferences',
  LOCATIONS: '@pokerapp/locations',
  LAST_SESSION_CONFIG: '@pokerapp/lastSessionConfig',
} as const;

// ============================================
// USER PREFERENCES
// ============================================

export interface UserPreferences {
  themeMode: 'system' | 'light' | 'dark';
  language: 'en';
  currency: 'EUR' | 'USD' | 'GBP';
  country: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  themeMode: 'system',
  language: 'en',
  currency: 'USD',
  country: 'US',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
};

export async function getUserPreferences(): Promise<UserPreferences> {
  const prefs = await getItem<UserPreferences>(KEYS.USER_PREFERENCES);
  return { ...DEFAULT_PREFERENCES, ...prefs };
}

export async function saveUserPreferences(prefs: Partial<UserPreferences>): Promise<void> {
  const current = await getUserPreferences();
  const updated = { ...current, ...prefs };
  await setItem(KEYS.USER_PREFERENCES, updated);
}

// ============================================
// SYNC QUEUE TYPES
// ============================================

export type SyncOperation = 'create' | 'update' | 'delete';

export interface PendingSyncItem {
  id: string;
  collection: 'players' | 'playerRanges' | 'sessions';
  operation: SyncOperation;
  data?: unknown;
  timestamp: number;
}

// ============================================
// GENERIC HELPERS
// ============================================

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return null;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key}:`, error);
    throw error;
  }
}

async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key}:`, error);
    throw error;
  }
}

// ============================================
// PLAYERS
// ============================================

export async function getPlayers(): Promise<Player[]> {
  const players = await getItem<Player[]>(KEYS.PLAYERS);
  return players || [];
}

export async function getPlayer(id: string): Promise<Player | null> {
  const players = await getPlayers();
  return players.find(p => p.id === id) || null;
}

export async function savePlayer(player: Player): Promise<void> {
  const players = await getPlayers();
  const index = players.findIndex(p => p.id === player.id);
  
  if (index >= 0) {
    players[index] = { ...player, updatedAt: Date.now() };
  } else {
    players.push({ ...player, createdAt: Date.now(), updatedAt: Date.now() });
  }
  
  await setItem(KEYS.PLAYERS, players);
  await addPendingSync('players', index >= 0 ? 'update' : 'create', player);
}

export async function deletePlayer(id: string): Promise<void> {
  const players = await getPlayers();
  const filtered = players.filter(p => p.id !== id);
  await setItem(KEYS.PLAYERS, filtered);
  
  // Also delete associated ranges
  await deletePlayerRanges(id);
  await addPendingSync('players', 'delete', { id });
}

// ============================================
// PLAYER RANGES
// ============================================

export async function getAllPlayerRanges(): Promise<Record<string, PlayerRanges>> {
  const ranges = await getItem<Record<string, PlayerRanges>>(KEYS.PLAYER_RANGES);
  return ranges || {};
}

export async function getPlayerRanges(playerId: string): Promise<PlayerRanges | null> {
  const allRanges = await getAllPlayerRanges();
  return allRanges[playerId] || null;
}

export async function savePlayerRanges(playerRanges: PlayerRanges): Promise<void> {
  const allRanges = await getAllPlayerRanges();
  const isNew = !allRanges[playerRanges.playerId];
  
  allRanges[playerRanges.playerId] = {
    ...playerRanges,
    lastObserved: Date.now(),
  };
  
  await setItem(KEYS.PLAYER_RANGES, allRanges);
  await addPendingSync('playerRanges', isNew ? 'create' : 'update', playerRanges);
}

export async function updatePlayerRange(
  playerId: string,
  rangeKey: string, // e.g., "early_open-raise"
  range: Range
): Promise<void> {
  const allRanges = await getAllPlayerRanges();
  const playerRanges = allRanges[playerId] || {
    playerId,
    ranges: {},
    lastObserved: Date.now(),
    handsObserved: 0,
  };
  
  playerRanges.ranges[rangeKey] = range;
  playerRanges.lastObserved = Date.now();
  playerRanges.handsObserved += 1;
  
  allRanges[playerId] = playerRanges;
  await setItem(KEYS.PLAYER_RANGES, allRanges);
  await addPendingSync('playerRanges', 'update', playerRanges);
}

export async function deletePlayerRanges(playerId: string): Promise<void> {
  const allRanges = await getAllPlayerRanges();
  delete allRanges[playerId];
  await setItem(KEYS.PLAYER_RANGES, allRanges);
  await addPendingSync('playerRanges', 'delete', { playerId });
}

// ============================================
// SESSIONS
// ============================================

export async function getSessions(): Promise<Session[]> {
  const sessions = await getItem<Session[]>(KEYS.SESSIONS);
  return sessions || [];
}

export async function getSession(id: string): Promise<Session | null> {
  const sessions = await getSessions();
  return sessions.find(s => s.id === id) || null;
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  
  await setItem(KEYS.SESSIONS, sessions);
  
  // Only sync if session is finished (not active)
  if (!session.isActive) {
    await addPendingSync('sessions', index >= 0 ? 'update' : 'create', session);
  }
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  await setItem(KEYS.SESSIONS, sessions);
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter(s => s.id !== id);
  await setItem(KEYS.SESSIONS, filtered);
  await addPendingSync('sessions', 'delete', { id });

  // Check if this was the current session and clear it if so
  const current = await getCurrentSession();
  if (current && current.session.id === id) {
    await clearCurrentSession();
  }
}

// ============================================
// LOCATIONS
// ============================================

export async function getLocations(): Promise<string[]> {
  const locations = await getItem<string[]>(KEYS.LOCATIONS);
  return locations || [];
}

export async function saveLocation(location: string): Promise<void> {
  const normalized = normalizeLocation(location);
  if (!normalized) return;

  const locations = await getLocations();
  // Check case-insensitively just in case, though normalization should handle it
  const exists = locations.some(l => l.toLowerCase() === normalized.toLowerCase());
  
  if (!exists) {
    locations.push(normalized);
    await setItem(KEYS.LOCATIONS, locations);
  }
}

// ============================================
// LAST SESSION CONFIG
// ============================================

export interface LastSessionConfig {
  location: string;
  gameType: string;
  smallBlind: string;
  bigBlind: string;
  thirdBlind: string;
  ante: string;
  buyIn: string;
  currency?: string;
}

export async function getLastSessionConfig(): Promise<LastSessionConfig | null> {
  return getItem<LastSessionConfig>(KEYS.LAST_SESSION_CONFIG);
}

export async function saveLastSessionConfig(config: LastSessionConfig): Promise<void> {
  await setItem(KEYS.LAST_SESSION_CONFIG, config);
}

// ============================================
// CLOUD SYNC HELPERS (No pending sync)
// ============================================

export async function savePlayerFromCloud(player: Player): Promise<void> {
  const players = await getPlayers();
  const index = players.findIndex(p => p.id === player.id);
  
  if (index >= 0) {
    players[index] = { ...player, updatedAt: Date.now() };
  } else {
    players.push({ ...player, createdAt: Date.now(), updatedAt: Date.now() });
  }
  
  await setItem(KEYS.PLAYERS, players);
}

export async function savePlayerRangesFromCloud(playerRanges: PlayerRanges): Promise<void> {
  const allRanges = await getAllPlayerRanges();
  
  allRanges[playerRanges.playerId] = {
    ...playerRanges,
    lastObserved: Date.now(),
  };
  
  await setItem(KEYS.PLAYER_RANGES, allRanges);
}

export async function saveSessionFromCloud(session: Session): Promise<void> {
  const sessions = await getSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.push(session);
  }
  
  await setItem(KEYS.SESSIONS, sessions);
}

// ============================================
// CURRENT SESSION (Active Session)
// ============================================

export interface CurrentSessionData {
  session: Session;
  table: Table;
}

export async function getCurrentSession(): Promise<CurrentSessionData | null> {
  return getItem<CurrentSessionData>(KEYS.CURRENT_SESSION);
}

export async function setCurrentSession(data: CurrentSessionData): Promise<void> {
  await setItem(KEYS.CURRENT_SESSION, data);
}

export async function clearCurrentSession(): Promise<void> {
  await removeItem(KEYS.CURRENT_SESSION);
}

// ============================================
// SYNC QUEUE
// ============================================

export async function getPendingSync(): Promise<PendingSyncItem[]> {
  const pending = await getItem<PendingSyncItem[]>(KEYS.PENDING_SYNC);
  return pending || [];
}

async function addPendingSync(
  collection: PendingSyncItem['collection'],
  operation: SyncOperation,
  data: unknown
): Promise<void> {
  const pending = await getPendingSync();
  
  // Extract target ID
  let targetId: string | undefined;
  if (collection === 'players') {
    targetId = (data as Player | { id: string })?.id;
  } else if (collection === 'sessions') {
    targetId = (data as Session | { id: string })?.id;
  } else if (collection === 'playerRanges') {
    targetId = (data as PlayerRanges | { playerId: string })?.playerId;
  }

  if (targetId && pending.length > 0) {
    const lastItem = pending[pending.length - 1];
    
    // Check if last item matches target and collection
    let lastId: string | undefined;
    if (lastItem.collection === collection) {
        if (collection === 'players') {
            lastId = (lastItem.data as Player | { id: string })?.id;
        } else if (collection === 'sessions') {
            lastId = (lastItem.data as Session | { id: string })?.id;
        } else if (collection === 'playerRanges') {
            lastId = (lastItem.data as PlayerRanges | { playerId: string })?.playerId;
        }
    }

    if (lastId === targetId) {
        // Optimization: Merge consecutive updates
        if (operation === 'update' && (lastItem.operation === 'create' || lastItem.operation === 'update')) {
            // Update the last item's data
            pending[pending.length - 1] = {
                ...lastItem,
                data,
                timestamp: Date.now()
            };
            await setItem(KEYS.PENDING_SYNC, pending);
            return;
        }
    }
  }
  
  const item: PendingSyncItem = {
    id: `${collection}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    collection,
    operation,
    data,
    timestamp: Date.now(),
  };
  
  pending.push(item);
  await setItem(KEYS.PENDING_SYNC, pending);
}

export async function removePendingSync(id: string): Promise<void> {
  const pending = await getPendingSync();
  const filtered = pending.filter(p => p.id !== id);
  await setItem(KEYS.PENDING_SYNC, filtered);
}

export async function removePendingSyncByTargetId(
  collection: PendingSyncItem['collection'],
  targetId: string
): Promise<void> {
  const pending = await getPendingSync();
  const filtered = pending.filter(p => {
    // Keep item if collection doesn't match
    if (p.collection !== collection) return true;
    
    // Check ID in data based on collection type
    let id: string | undefined;
    if (collection === 'players') {
      id = (p.data as Player | { id: string })?.id;
    } else if (collection === 'sessions') {
      id = (p.data as Session | { id: string })?.id;
    } else if (collection === 'playerRanges') {
      id = (p.data as PlayerRanges | { playerId: string })?.playerId;
    }
    
    // Remove if ID matches targetId
    return id !== targetId;
  });
  
  if (filtered.length !== pending.length) {
    await setItem(KEYS.PENDING_SYNC, filtered);
  }
}

export async function clearPendingSync(): Promise<void> {
  await setItem(KEYS.PENDING_SYNC, []);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.PLAYERS,
    KEYS.PLAYER_RANGES,
    KEYS.SESSIONS,
    KEYS.CURRENT_SESSION,
    KEYS.PENDING_SYNC,
  ]);
}

export async function getStorageInfo(): Promise<{
  playersCount: number;
  sessionsCount: number;
  pendingSyncCount: number;
  hasActiveSession: boolean;
}> {
  const [players, sessions, pending, current] = await Promise.all([
    getPlayers(),
    getSessions(),
    getPendingSync(),
    getCurrentSession(),
  ]);
  
  return {
    playersCount: players.length,
    sessionsCount: sessions.length,
    pendingSyncCount: pending.length,
    hasActiveSession: current !== null,
  };
}

// Generate a unique ID
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
