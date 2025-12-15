import { syncPendingChanges } from '../sync';
import * as localStorage from '../localStorage';
import * as sessionsFirebase from '../firebase/sessions';
import { auth } from '@/config/firebase';

// Mock dependencies
jest.mock('../localStorage', () => ({
  getPendingSync: jest.fn(),
  removePendingSync: jest.fn(),
  removePendingSyncByTargetId: jest.fn(),
}));
jest.mock('../firebase/sessions', () => ({
  updateSession: jest.fn(),
  createSession: jest.fn(),
  deleteSession: jest.fn(),
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
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn(),
}));

describe('Sync Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should keep item in pending queue if updateSession fails', async () => {
    // Setup pending item
    const pendingItem = {
      id: 'sync_123',
      collection: 'sessions',
      operation: 'update',
      timestamp: Date.now(),
      data: {
        id: 'session_123',
        name: 'Test Session',
        startTime: Date.now(),
        isActive: false,
        createdBy: 'test-user-id'
      }
    };

    (localStorage.getPendingSync as jest.Mock).mockResolvedValue([pendingItem]);
    
    // Mock updateSession to fail
    (sessionsFirebase.updateSession as jest.Mock).mockRejectedValue(new Error('Network Error'));

    // Run sync
    await syncPendingChanges();

    // Verify updateSession was called
    expect(sessionsFirebase.updateSession).toHaveBeenCalled();

    // Verify removePendingSync was NOT called
    expect(localStorage.removePendingSync).not.toHaveBeenCalled();
  });

  it('should remove item from pending queue if updateSession succeeds', async () => {
    // Setup pending item
    const pendingItem = {
      id: 'sync_123',
      collection: 'sessions',
      operation: 'update',
      timestamp: Date.now(),
      data: {
        id: 'session_123',
        name: 'Test Session',
        startTime: Date.now(),
        isActive: false,
        createdBy: 'test-user-id'
      }
    };

    (localStorage.getPendingSync as jest.Mock).mockResolvedValue([pendingItem]);
    
    // Mock updateSession to succeed
    (sessionsFirebase.updateSession as jest.Mock).mockResolvedValue(undefined);

    // Run sync
    await syncPendingChanges();

    // Verify updateSession was called
    expect(sessionsFirebase.updateSession).toHaveBeenCalled();

    // Verify removePendingSync WAS called
    expect(localStorage.removePendingSync).toHaveBeenCalledWith('sync_123');
  });
});
