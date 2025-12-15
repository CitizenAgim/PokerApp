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
  updateTable: jest.fn(), // Should not be called
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

describe('Data Optimization & Lean Sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  describe('localStorage.saveSession', () => {
    it('should NOT add to pending sync if session is active', async () => {
      const activeSession: Session = {
        id: 'session-1',
        isActive: true,
        startTime: Date.now(),
        name: 'Active Session',
        createdBy: 'user-1',
      };

      // Mock getSessions to return empty array initially
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@pokerapp/sessions') return Promise.resolve('[]');
        if (key === '@pokerapp/pendingSync') return Promise.resolve('[]');
        return Promise.resolve(null);
      });

      await localStorage.saveSession(activeSession);

      // Verify session was saved to storage
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@pokerapp/sessions',
        expect.stringContaining('session-1')
      );

      // Verify NO pending sync was added
      // The second call to setItem would be for pendingSync if it was called
      const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const pendingSyncCall = setItemCalls.find(call => call[0] === '@pokerapp/pendingSync');
      expect(pendingSyncCall).toBeUndefined();
    });

    it('should ADD to pending sync if session is finished', async () => {
      const finishedSession: Session = {
        id: 'session-2',
        isActive: false,
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        name: 'Finished Session',
        createdBy: 'user-1',
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@pokerapp/sessions') return Promise.resolve('[]');
        if (key === '@pokerapp/pendingSync') return Promise.resolve('[]');
        return Promise.resolve(null);
      });

      await localStorage.saveSession(finishedSession);

      // Verify pending sync WAS added
      const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const pendingSyncCall = setItemCalls.find(call => call[0] === '@pokerapp/pendingSync');
      expect(pendingSyncCall).toBeDefined();
      
      const pendingData = JSON.parse(pendingSyncCall[1]);
      expect(pendingData[0].collection).toBe('sessions');
      expect(pendingData[0].data.id).toBe('session-2');
    });
  });

  describe('syncService.syncPendingChanges', () => {
    it('should strip table data when syncing a session', async () => {
      const sessionWithTable: Session & { table: any } = {
        id: 'session-3',
        isActive: false,
        startTime: Date.now(),
        name: 'Session With Table',
        createdBy: 'user-1',
        table: {
          seats: [{ id: 1, player: 'some-player' }],
          buttonPosition: 1
        }
      };

      const pendingItem = {
        id: 'sync-1',
        collection: 'sessions',
        operation: 'update',
        data: sessionWithTable,
        timestamp: Date.now()
      };

      // Mock pending sync retrieval
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@pokerapp/pendingSync') return Promise.resolve(JSON.stringify([pendingItem]));
        return Promise.resolve(null);
      });

      await syncService.syncPendingChanges();

      // Verify updateSession was called
      expect(sessionsFirebase.updateSession).toHaveBeenCalled();

      // Verify the data passed to updateSession does NOT contain table
      const updateCall = (sessionsFirebase.updateSession as jest.Mock).mock.calls[0];
      const sessionId = updateCall[0];
      const updateData = updateCall[1];
      
      expect(sessionId).toBe('session-3');
      expect(updateData.table).toBeUndefined();
      
      // Verify updateTable was NOT called
      expect(sessionsFirebase.updateTable).not.toHaveBeenCalled();
    });
  });
});
