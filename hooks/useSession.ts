import { auth } from '@/config/firebase';
import * as sessionsFirebase from '@/services/firebase/sessions';
import * as localStorage from '@/services/localStorage';
import { isOnline } from '@/services/sync';
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
    ante?: number
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
          
          for (const session of merged) {
            await localStorage.saveSessionFromCloud(session);
          }
          
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
    ante?: number
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
  endSession: () => Promise<void>;
  updateButtonPosition: (position: number) => Promise<void>;
  assignPlayerToSeat: (seatNumber: number, playerId: string | null) => Promise<void>;
  getPositionForSeat: (seatNumber: number) => Position | null;
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

  const endSession = useCallback(async (): Promise<void> => {
    if (!session) return;

    const updatedSession: Session = {
      ...session,
      isActive: false,
      endTime: Date.now(),
    };

    await localStorage.saveSession(updatedSession);
    await localStorage.clearCurrentSession();
    setSession(updatedSession);

    if (await isOnline()) {
      try {
        await sessionsFirebase.endSession(sessionId);
      } catch (err) {
        console.warn('Could not end session in cloud:', err);
      }
    }
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
    }

    if (await isOnline()) {
      try {
        await sessionsFirebase.updateButtonPosition(sessionId, position);
      } catch (err) {
        console.warn('Could not update button position in cloud:', err);
      }
    }
  }, [table, session, sessionId]);

  const assignPlayerToSeat = useCallback(async (
    seatNumber: number,
    playerId: string | null
  ): Promise<void> => {
    if (!table) return;

    const updatedSeats = table.seats.map(seat => {
      if (seat.seatNumber === seatNumber) {
        return { ...seat, playerId: playerId || undefined };
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
    }

    if (await isOnline()) {
      try {
        await sessionsFirebase.assignPlayerToSeat(sessionId, seatNumber, playerId);
      } catch (err) {
        console.warn('Could not assign player in cloud:', err);
      }
    }
  }, [table, session, sessionId]);

  const getPositionForSeat = useCallback((seatNumber: number): Position | null => {
    if (!table) return null;
    return calculatePosition(seatNumber, table.buttonPosition, 9);
  }, [table]);

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
    getPositionForSeat,
  };
}

// ============================================
// USE CURRENT SESSION HOOK
// ============================================

interface UseCurrentSessionResult {
  currentSession: localStorage.CurrentSessionData | null;
  loading: boolean;
  startSession: (session: Session) => Promise<void>;
  endSession: () => Promise<void>;
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
        seatNumber: i + 1,
        position: undefined,
      })),
    };

    const data: localStorage.CurrentSessionData = { session, table };
    await localStorage.setCurrentSession(data);
    setCurrentSession(data);
  }, []);

  const endSession = useCallback(async (): Promise<void> => {
    if (currentSession) {
      const updatedSession: Session = {
        ...currentSession.session,
        isActive: false,
        endTime: Date.now(),
      };
      await localStorage.saveSession(updatedSession);
      
      if (await isOnline()) {
        try {
          await sessionsFirebase.endSession(currentSession.session.id);
        } catch (err) {
          console.warn('Could not end session in cloud:', err);
        }
      }
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

  for (const session of cloud) {
    const existing = sessionMap.get(session.id);
    if (!existing || session.startTime > existing.startTime) {
      sessionMap.set(session.id, session);
    }
  }

  return Array.from(sessionMap.values()).sort(
    (a, b) => b.startTime - a.startTime
  );
}
