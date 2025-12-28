/**
 * Tests for Firebase Sessions Service - New Subcollection Structure
 * Path: /users/{userId}/sessions/{sessionId}
 * 
 * TDD Phase 3: Sessions Service
 */

// Mock Firebase - must be before imports
jest.mock('@/config/firebase', () => ({
  db: { type: 'mock-db' },
}));

// Mock firebase/firestore with inline mock implementations
jest.mock('firebase/firestore', () => {
  const mockFns = {
    getDocs: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    doc: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    serverTimestamp: jest.fn(() => ({ _serverTimestamp: true })),
  };
  
  return {
    ...mockFns,
    Timestamp: {
      fromMillis: (ms: number) => ({ toMillis: () => ms }),
    },
  };
});

// Get references to mocks after they're set up
import {
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  collection,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

const mockGetDocs = getDocs as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockDeleteDoc = deleteDoc as jest.Mock;
const mockDoc = doc as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockQuery = query as jest.Mock;
const mockWhere = where as jest.Mock;
const mockOrderBy = orderBy as jest.Mock;

// Import after mocks
import * as sessionsService from '../firebase/sessions';

describe('Sessions Service - Subcollection Structure', () => {
  const TEST_USER_ID = 'user-123';
  const TEST_SESSION_ID = 'session-456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue({ id: TEST_SESSION_ID });
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
  });

  describe('Collection Path', () => {
    it('should use /users/{userId}/sessions path for getSessions', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      await sessionsService.getSessions(TEST_USER_ID);

      // Verify collection is called with correct path segments
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(), // db
        'users',
        TEST_USER_ID,
        'sessions'
      );
    });

    it('should use /users/{userId}/sessions/{sessionId} path for getSession', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: TEST_SESSION_ID,
        data: () => ({
          name: 'Test Session',
          isActive: true,
          startTime: { toMillis: () => Date.now() },
        }),
      });

      await sessionsService.getSession(TEST_USER_ID, TEST_SESSION_ID);

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'sessions',
        TEST_SESSION_ID
      );
    });

    it('should use /users/{userId}/sessions path for createSession', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await sessionsService.createSession(TEST_USER_ID, {
        name: 'New Session',
        createdBy: TEST_USER_ID,
      });

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'sessions',
        expect.any(String) // auto-generated ID
      );
    });
  });

  describe('getSessions', () => {
    it('should return empty array if userId is empty', async () => {
      const result = await sessionsService.getSessions('');
      expect(result).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('should return all sessions for a user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          data: () => ({
            name: 'Session 1',
            location: 'Casino A',
            isActive: true,
            isShared: false,
            startTime: { toMillis: () => 1000 },
          }),
        },
        {
          id: 'session-2',
          data: () => ({
            name: 'Session 2',
            location: 'Casino B',
            isActive: false,
            isShared: true,
            startTime: { toMillis: () => 2000 },
            endTime: { toMillis: () => 3000 },
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockSessions });

      const result = await sessionsService.getSessions(TEST_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[0].name).toBe('Session 1');
      expect(result[1].isShared).toBe(true);
    });

    it('should order sessions by startTime desc', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      await sessionsService.getSessions(TEST_USER_ID);

      expect(mockOrderBy).toHaveBeenCalledWith('startTime', 'desc');
    });
  });

  describe('getActiveSessions', () => {
    it('should filter for active sessions only', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          data: () => ({
            name: 'Active Session',
            isActive: true,
            startTime: { toMillis: () => 1000 },
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockSessions });

      await sessionsService.getActiveSessions(TEST_USER_ID);

      expect(mockWhere).toHaveBeenCalledWith('isActive', '==', true);
    });
  });

  describe('getSession', () => {
    it('should return null if session does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await sessionsService.getSession(TEST_USER_ID, TEST_SESSION_ID);

      expect(result).toBeNull();
    });

    it('should return session with all fields including isShared', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: TEST_SESSION_ID,
        data: () => ({
          name: 'Test Session',
          location: 'Casino A',
          stakes: '1/2',
          buyIn: 200,
          cashOut: 350,
          isActive: false,
          isShared: true,
          startTime: { toMillis: () => 1000 },
          endTime: { toMillis: () => 5000 },
          duration: 4000,
        }),
      });

      const result = await sessionsService.getSession(TEST_USER_ID, TEST_SESSION_ID);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(TEST_SESSION_ID);
      expect(result?.name).toBe('Test Session');
      expect(result?.isShared).toBe(true);
      expect(result?.buyIn).toBe(200);
      expect(result?.cashOut).toBe(350);
    });
  });

  describe('createSession', () => {
    it('should create session with default isShared = false', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await sessionsService.createSession(TEST_USER_ID, {
        name: 'New Session',
        createdBy: TEST_USER_ID,
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'New Session',
          isShared: false,
          isActive: true,
        })
      );
    });

    it('should create session with provided sessionId', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const customId = 'custom-session-id';

      const result = await sessionsService.createSession(
        TEST_USER_ID,
        { name: 'Custom ID Session', createdBy: TEST_USER_ID },
        customId
      );

      expect(result.id).toBe(customId);
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'sessions',
        customId
      );
    });
  });

  describe('updateSession', () => {
    it('should update session fields', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await sessionsService.updateSession(TEST_USER_ID, TEST_SESSION_ID, {
        name: 'Updated Session',
        cashOut: 500,
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Updated Session',
          cashOut: 500,
        }),
        expect.objectContaining({ merge: true })
      );
    });

    it('should use correct document path', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await sessionsService.updateSession(TEST_USER_ID, TEST_SESSION_ID, {
        isActive: false,
      });

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'sessions',
        TEST_SESSION_ID
      );
    });
  });

  describe('endSession', () => {
    it('should mark session as inactive and set endTime', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const endTime = Date.now();

      await sessionsService.endSession(TEST_USER_ID, TEST_SESSION_ID, 500, endTime);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isActive: false,
          cashOut: 500,
        }),
        expect.objectContaining({ merge: true })
      );
    });
  });

  describe('deleteSession', () => {
    it('should delete session from correct path', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await sessionsService.deleteSession(TEST_USER_ID, TEST_SESSION_ID);

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'sessions',
        TEST_SESSION_ID
      );
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('toggleSessionSharing', () => {
    it('should toggle isShared field', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await sessionsService.toggleSessionSharing(TEST_USER_ID, TEST_SESSION_ID, true);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isShared: true,
        }),
        expect.objectContaining({ merge: true })
      );
    });
  });
});
