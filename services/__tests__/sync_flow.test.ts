import { Session } from '@/types/poker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as sessionsFirebase from '../firebase/sessions';
import * as localStorage from '../localStorage';
import * as syncService from '../sync';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../firebase/sessions', () => ({
  createSession: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
  updateTable: jest.fn(),
}));

jest.mock('../firebase/players', () => ({
  createPlayer: jest.fn(),
  updatePlayer: jest.fn(),
  deletePlayer: jest.fn(),
}));

jest.mock('../firebase/ranges', () => ({
  savePlayerRanges: jest.fn(),
  deletePlayerRanges: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  auth: { currentUser: { uid: 'test-user' } },
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn(),
}));

describe('Sync Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('should correctly sync a session that was created active and then ended', async () => {
    // 1. Create Active Session
    const activeSession: Session = {
      id: 'session-flow-1',
      isActive: true,
      startTime: 1000,
      name: 'Flow Session',
      createdBy: 'user-1',
      gameType: 'Texas Holdem',
      stakes: '1/2',
      smallBlind: 1,
      bigBlind: 2,
      buyIn: 100,
    };

    // Mock getSessions to return empty array initially
    let storedSessions: Session[] = [];
    let storedPending: any[] = [];

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
      if (key === '@pokerfiles/sessions') return Promise.resolve(JSON.stringify(storedSessions));
      if (key === '@pokerfiles/pendingSync') return Promise.resolve(JSON.stringify(storedPending));
      return Promise.resolve(null);
    });

    (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
      if (key === '@pokerfiles/sessions') storedSessions = JSON.parse(value);
      if (key === '@pokerfiles/pendingSync') storedPending = JSON.parse(value);
      return Promise.resolve();
    });

    // Save active session
    await localStorage.saveSession(activeSession);

    // Verify NO pending sync
    expect(storedPending.length).toBe(0);

    // 2. End Session
    const endedSession: Session = {
      ...activeSession,
      isActive: false,
      endTime: 2000,
      cashOut: 200,
      duration: 1000,
    };

    // Save ended session
    await localStorage.saveSession(endedSession);

    // Verify pending sync added (UPDATE operation)
    expect(storedPending.length).toBe(1);
    expect(storedPending[0].collection).toBe('sessions');
    expect(storedPending[0].operation).toBe('update');
    expect(storedPending[0].data.id).toBe('session-flow-1');

    // 3. Run Sync
    await syncService.syncPendingChanges();

    // Verify updateSession called with ALL data needed to create it if missing
    expect(sessionsFirebase.updateSession).toHaveBeenCalledTimes(1);
    
    // New signature: updateSession(userId, sessionId, updates)
    const updateCall = (sessionsFirebase.updateSession as jest.Mock).mock.calls[0];
    const userId = updateCall[0];
    const sessionId = updateCall[1];
    const updateData = updateCall[2];

    expect(userId).toBe('test-user');
    expect(sessionId).toBe('session-flow-1');
    
    // CRITICAL: Check if all fields are present in the update payload
    expect(updateData.createdBy).toBe('user-1');
    expect(updateData.name).toBe('Flow Session');
    expect(updateData.gameType).toBe('Texas Holdem');
    expect(updateData.stakes).toBe('1/2');
    expect(updateData.buyIn).toBe(100);
    expect(updateData.cashOut).toBe(200);
    expect(updateData.startTime).toBe(1000);
    expect(updateData.endTime).toBe(2000);
    expect(updateData.isActive).toBe(false);
  });
});
