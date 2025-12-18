import { auth } from '@/config/firebase';
import * as sessionsFirebase from '@/services/firebase/sessions';
import * as localStorage from '@/services/localStorage';
import { isOnline, syncPendingChanges } from '@/services/sync';
import { Position, Session, Table } from '@/types/poker';
import { calculatePosition } from '@/utils/positionCalculator';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// USE SESSIONS HOOK
// ============================================

interface UseSessionsResult {
  sessions: Session[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createSession: (
    location: string,
    gameType: string,
    smallBlind: number,
    bigBlind: number,
    buyIn: number,
    thirdBlind?: number,
    ante?: number,
    currency?: string
  ) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load from local first
      const localSessions = await localStorage.getSessions();
      // Sort local sessions by startTime descending
      localSessions.sort((a, b) => b.startTime - a.startTime);
      setSessions(localSessions);

      // Try to sync with cloud
      const userId = auth.currentUser?.uid;
      if (userId && await isOnline()) {
        try {
          const cloudSessions = await sessionsFirebase.getSessions(userId);
          
          // Merge (cloud wins on conflicts)
          const merged = mergeSessionsData(localSessions, cloudSessions);
          
          await localStorage.saveSessions(merged);
          
          setSessions(merged);
        } catch (cloudError) {
          console.warn('Could not sync sessions with cloud:', cloudError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async (
    location: string,
    gameType: string,
    smallBlind: number,
    bigBlind: number,
    buyIn: number,
    thirdBlind?: number,
    ante?: number,
    currency?: string
  ): Promise<Session> => {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('Not authenticated');

    const id = localStorage.generateId();
    const dateStr = new Date().toLocaleDateString();
    const name = `${dateStr} - ${gameType}`;
    const stakes = `${smallBlind}/${bigBlind}${thirdBlind ? `/${thirdBlind}` : ''}`;

    const session: Session = {
      id,
      name,
      location,
      gameType,
      smallBlind,
      bigBlind,
      thirdBlind,
      ante,
      buyIn,
      currency,
      stakes,
      startTime: Date.now(),
      isActive: true,
      createdBy: userId,
    };

    // Save locally
    await localStorage.saveSession(session);
    // Save location if new
    if (location) {
      await localStorage.saveLocation(location);
    }
    
    setSessions(prev => [session, ...prev]);

    // Try to sync to cloud
    // NOTE: We no longer sync active sessions to cloud immediately.
    // Sync happens when session is finished.
    /* 
    if (await isOnline()) {
      try {
        await sessionsFirebase.createSession(
          session,
          undefined,
          id
        );
      } catch (err) {
        console.warn('Could not sync session to cloud:', err);
      }
    }
    */

    return session;
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    await localStorage.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));

    if (await isOnline()) {
      try {
        await sessionsFirebase.deleteSession(id);
      } catch (err) {
        console.warn('Could not sync session deletion to cloud:', err);
      }
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    refresh: loadSessions,
    createSession,
    deleteSession,
  };
}

// ============================================
// USE SINGLE SESSION HOOK
// ============================================

interface UseSessionResult {
  session: Session | null;
  table: Table | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  endSession: (cashOut?: number, endTime?: number, startTime?: number, buyIn?: number) => Promise<void>;
  updateButtonPosition: (position: number) => Promise<void>;
  assignPlayerToSeat: (seatNumber: number, playerId: string | null, initialStack?: number, playerDetails?: Partial<TablePlayer>) => Promise<void>;
  updateSeatStack: (seatNumber: number, stack: number, playerName?: string) => Promise<void>;
  getPositionForSeat: (seatNumber: number) => Position | null;
  updateSessionDetails: (updates: { buyIn?: number; cashOut?: number; startTime?: number; endTime?: number }) => Promise<void>;
}

export function useSession(sessionId: string): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);

      // Load from local
      const localSession = await localStorage.getSession(sessionId);
      if (localSession) {
        setSession(localSession);
        if (localSession.table) {
          setTable(localSession.table);
        }
      }

      // Load current session with table
      const current = await localStorage.getCurrentSession();
      if (current && current.session.id === sessionId) {
        setTable(current.table);
      }

      // Try cloud
      if (await isOnline()) {
        try {
          const cloudSession = await sessionsFirebase.getSession(sessionId);
          if (cloudSession) {
            setSession(cloudSession);
            if (cloudSession.table) {
              setTable(cloudSession.table);
            }
          }
        } catch (err) {
          console.warn('Could not fetch session from cloud:', err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load session'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const endSession = useCallback(async (cashOut?: number, endTime?: number, startTime?: number, buyIn?: number): Promise<void> => {
    if (!session) return;

    const finalEndTime = endTime || Date.now();
    const finalStartTime = startTime || session.startTime;
    const finalBuyIn = buyIn !== undefined ? buyIn : session.buyIn;
    const duration = finalEndTime - finalStartTime;

    const updatedSession: Session = {
      ...session,
      isActive: false,
      startTime: finalStartTime,
      endTime: finalEndTime,
      cashOut,
      buyIn: finalBuyIn,
      duration,
    };

    await localStorage.saveSession(updatedSession);
    await localStorage.clearCurrentSession();
    setSession(updatedSession);

    // Trigger sync immediately
    syncPendingChanges().catch(err => console.warn('Background sync failed:', err));
  }, [session, sessionId]);

  const updateButtonPosition = useCallback(async (position: number): Promise<void> => {
    if (!table) return;

    const updatedTable: Table = {
      ...table,
      buttonPosition: position,
    };

    setTable(updatedTable);

    // Update current session
    if (session) {
      await localStorage.setCurrentSession({ session, table: updatedTable });
      
      // Also update the session in the main list to persist table state
      const updatedSession = { ...session, table: updatedTable };
      await localStorage.saveSession(updatedSession);
      setSession(updatedSession);
    }
  }, [table, session, sessionId]);

  const assignPlayerToSeat = useCallback(async (
    seatNumber: number,
    playerId: string | null,
    initialStack?: number,
    playerDetails?: Partial<TablePlayer>
  ): Promise<void> => {
    if (!table) return;

    const updatedSeats = table.seats.map(seat => {
      if (seat.seatNumber === seatNumber) {
        if (!playerId && !playerDetails) {
          // Clearing the seat
          return { ...seat, playerId: null, player: null };
        }
        
        // Assigning player
        const newSeat = { ...seat, playerId: playerId || undefined };
        
        // If we have player details (e.g. Unknown Player or just stack update)
        if (playerDetails || initialStack !== undefined) {
          newSeat.player = {
            ...(seat.player || {}),
            id: playerId || seat.player?.id || `temp-${Date.now()}`,
            name: playerDetails?.name || seat.player?.name || 'Unknown',
            isTemp: playerDetails?.isTemp ?? seat.player?.isTemp ?? false,
            ...playerDetails,
          };
          
          if (initialStack !== undefined) {
            newSeat.player.stack = initialStack;
          }
        }
        
        return newSeat;
      }
      return seat;
    });

    const updatedTable: Table = {
      ...table,
      seats: updatedSeats,
    };

    setTable(updatedTable);

    if (session) {
      await localStorage.setCurrentSession({ session, table: updatedTable });
      
      // Also update the session in the main list to persist table state
      const updatedSession = { ...session, table: updatedTable };
      await localStorage.saveSession(updatedSession);
      setSession(updatedSession);
    }
  }, [table, session, sessionId]);

  const updateSeatStack = useCallback(async (seatNumber: number, stack: number, playerName?: string): Promise<void> => {
    if (!table) return;

    const updatedSeats = table.seats.map(seat => {
      if (seat.seatNumber === seatNumber) {
        if (seat.player) {
          return {
            ...seat,
            player: {
              ...seat.player,
              stack
            }
          };
        } else if (seat.playerId) {
          // Create player object if missing (legacy migration)
          return {
            ...seat,
            player: {
              id: seat.playerId,
              name: playerName || 'Unknown',
              isTemp: false,
              stack
            }
          };
        }
      }
      return seat;
    });

    const updatedTable: Table = {
      ...table,
      seats: updatedSeats,
    };

    setTable(updatedTable);

    if (session) {
      await localStorage.setCurrentSession({ session, table: updatedTable });
      const updatedSession = { ...session, table: updatedTable };
      await localStorage.saveSession(updatedSession);
      setSession(updatedSession);
    }
  }, [table, session, sessionId]);

  const getPositionForSeat = useCallback((seatNumber: number): Position | null => {
    if (!table) return null;
    return calculatePosition(seatNumber, table.buttonPosition, 9);
  }, [table]);

  const updateSessionDetails = useCallback(async (updates: {
    buyIn?: number;
    cashOut?: number;
    startTime?: number;
    endTime?: number;
  }): Promise<void> => {
    if (!session) return;

    const updatedSession: Session = {
      ...session,
      ...updates,
      table: table || session.table,
    };

    // Recalculate duration if times changed or if it was already ended
    if (updatedSession.endTime && updatedSession.startTime) {
      updatedSession.duration = updatedSession.endTime - updatedSession.startTime;
    }

    setSession(updatedSession);
    await localStorage.saveSession(updatedSession);

    // If this is the current active session, update that too
    const current = await localStorage.getCurrentSession();
    if (current && current.session.id === sessionId) {
      await localStorage.setCurrentSession({ ...current, session: updatedSession });
    }

    // Trigger sync immediately if session is finished
    if (!updatedSession.isActive) {
      syncPendingChanges().catch(err => console.warn('Background sync failed:', err));
    }
  }, [session, sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return {
    session,
    table,
    loading,
    error,
    refresh: loadSession,
    endSession,
    updateButtonPosition,
    assignPlayerToSeat,
    updateSeatStack,
    getPositionForSeat,
    updateSessionDetails,
  };
}

// ============================================
// USE CURRENT SESSION HOOK
// ============================================

interface UseCurrentSessionResult {
  currentSession: localStorage.CurrentSessionData | null;
  loading: boolean;
  startSession: (session: Session) => Promise<void>;
  endSession: (cashOut?: number, endTime?: number, startTime?: number, buyIn?: number) => Promise<void>;
  clearSession: () => Promise<void>;
}

export function useCurrentSession(): UseCurrentSessionResult {
  const [currentSession, setCurrentSession] = useState<localStorage.CurrentSessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const current = await localStorage.getCurrentSession();
      setCurrentSession(current);
      setLoading(false);
    };
    load();
  }, []);

  const startSession = useCallback(async (session: Session): Promise<void> => {
    // Create initial table with empty seats
    const table: Table = {
      sessionId: session.id,
      buttonPosition: 1,
      seats: Array.from({ length: 9 }, (_, i) => ({
        index: i,
        seatNumber: i + 1,
        position: undefined,
      })),
    };

    const data: localStorage.CurrentSessionData = { session, table };
    await localStorage.setCurrentSession(data);
    setCurrentSession(data);

    // Update session in list with initial table
    const sessionWithTable = { ...session, table };
    await localStorage.saveSession(sessionWithTable);

    // Table data is local only
    /*
    // Sync initial table to cloud
    if (await isOnline()) {
      try {
        await sessionsFirebase.updateTable(session.id, table);
      } catch (err) {
        console.warn('Could not sync initial table to cloud:', err);
      }
    }
    */
  }, []);

  const endSession = useCallback(async (cashOut?: number, endTime?: number, startTime?: number, buyIn?: number): Promise<void> => {
    if (currentSession) {
      const finalEndTime = endTime || Date.now();
      const finalStartTime = startTime || currentSession.session.startTime;
      const finalBuyIn = buyIn !== undefined ? buyIn : currentSession.session.buyIn;
      const duration = finalEndTime - finalStartTime;

      const updatedSession: Session = {
        ...currentSession.session,
        isActive: false,
        startTime: finalStartTime,
        endTime: finalEndTime,
        cashOut,
        buyIn: finalBuyIn,
        duration,
      };
      await localStorage.saveSession(updatedSession);
      
      // Trigger sync immediately
      syncPendingChanges().catch(err => console.warn('Background sync failed:', err));
    }
    await localStorage.clearCurrentSession();
    setCurrentSession(null);
  }, [currentSession]);

  const clearSession = useCallback(async (): Promise<void> => {
    await localStorage.clearCurrentSession();
    setCurrentSession(null);
  }, []);

  return {
    currentSession,
    loading,
    startSession,
    endSession,
    clearSession,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mergeSessionsData(local: Session[], cloud: Session[]): Session[] {
  const sessionMap = new Map<string, Session>();

  for (const session of local) {
    sessionMap.set(session.id, session);
  }

  for (const cloudSession of cloud) {
    const localSession = sessionMap.get(cloudSession.id);
    
    if (!localSession) {
      // New session from cloud
      sessionMap.set(cloudSession.id, cloudSession);
    } else {
      // Conflict resolution
      
      // 1. If local is ended and cloud is active, KEEP LOCAL.
      // This handles the case where we just ended it but cloud hasn't updated yet.
      if (!localSession.isActive && cloudSession.isActive) {
        continue;
      }
      
      // 2. If local is active and cloud is ended, TAKE CLOUD.
      // This handles the case where another device ended it.
      if (localSession.isActive && !cloudSession.isActive) {
        sessionMap.set(cloudSession.id, cloudSession);
        continue;
      }
      
      // 3. Otherwise, trust Cloud as source of truth for other fields
      // (like table state, name edits, etc), but preserve the ID.
      sessionMap.set(cloudSession.id, cloudSession);
    }
  }

  return Array.from(sessionMap.values()).sort(
    (a, b) => b.startTime - a.startTime
  );
}
