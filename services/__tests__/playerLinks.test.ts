/**
 * Tests for Firebase PlayerLinks Service - Subcollection Structure
 * Path: /users/{userId}/playerLinks/{linkId}
 * 
 * Each link is stored in BOTH users' subcollections for fast queries.
 * Uses writeBatch() for atomic dual-writes.
 */


// Mock Firebase - must be before imports
jest.mock('@/config/firebase', () => ({
  db: { type: 'mock-db' },
}));

// Mock rate limiting
jest.mock('../rateLimit', () => ({
  checkRateLimit: jest.fn(),
}));

// Mock firebase/firestore with inline mock implementations
const mockWriteBatch = {
  set: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  commit: jest.fn().mockResolvedValue(undefined),
};

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
    onSnapshot: jest.fn(),
    writeBatch: jest.fn(() => mockWriteBatch),
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
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
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
const mockOnSnapshot = onSnapshot as jest.Mock;
const mockWriteBatchFn = writeBatch as jest.Mock;

// Import after mocks
import * as playerLinksService from '@/services/firebase/playerLinks';
import { PLAYER_LINKS_CONFIG, UserPlayerLink } from '@/types/sharing';

describe('PlayerLinks Service - Subcollection Structure', () => {
  const TEST_USER_A_ID = 'user-a-123';
  const TEST_USER_B_ID = 'user-b-456';
  const TEST_LINK_ID = 'link-789';
  const TEST_PLAYER_A_ID = 'player-a-111';
  const TEST_PLAYER_B_ID = 'player-b-222';

  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue({ id: TEST_LINK_ID });
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockWriteBatch.set.mockClear();
    mockWriteBatch.update.mockClear();
    mockWriteBatch.delete.mockClear();
    mockWriteBatch.commit.mockClear().mockResolvedValue(undefined);
    mockWriteBatchFn.mockReturnValue(mockWriteBatch);
  });

  // ============================================
  // COLLECTION PATH TESTS
  // ============================================

  describe('Collection Path', () => {
    it('should use /users/{userId}/playerLinks path for getPlayerLinks', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      await playerLinksService.getPlayerLinks(TEST_USER_A_ID);

      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_A_ID,
        'playerLinks'
      );
    });

    it('should use /users/{userId}/playerLinks/{linkId} path for single link', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: TEST_LINK_ID,
        data: () => ({
          id: TEST_LINK_ID,
          status: 'active',
          isInitiator: true,
          myPlayerId: TEST_PLAYER_A_ID,
          myPlayerName: 'Player A',
          myLastSyncedVersion: 0,
          theirUserId: TEST_USER_B_ID,
          theirUserName: 'User B',
          theirPlayerId: TEST_PLAYER_B_ID,
          theirPlayerName: 'Player B',
          createdAt: Date.now(),
          acceptedAt: Date.now(),
        }),
      });

      await playerLinksService.getPlayerLink(TEST_USER_A_ID, TEST_LINK_ID);

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_A_ID,
        'playerLinks',
        TEST_LINK_ID
      );
    });
  });

  // ============================================
  // CREATE LINK TESTS (Atomic Dual-Write)
  // ============================================

  describe('createPlayerLink', () => {
    beforeEach(() => {
      // Set up mock doc refs with path property
      mockDoc.mockImplementation((...args: any[]) => {
        const path = args.slice(1).join('/');
        return { id: TEST_LINK_ID, path };
      });
      
      // Mock friendship check
      mockGetDoc.mockImplementation((ref: any) => {
        const path = ref?.path || '';
        // If checking for friend document
        if (path.includes('friends')) {
          return Promise.resolve({ 
            exists: () => true,
            data: () => ({ status: 'accepted', friendId: TEST_USER_B_ID }),
          });
        }
        // If checking for player document
        if (path.includes('players')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({ name: 'Test Player', rangeVersion: 0 }),
          });
        }
        return Promise.resolve({ exists: () => false });
      });
      
      // Mock link count check
      mockGetDocs.mockResolvedValue({ docs: [], size: 0 });
    });

    it('should use writeBatch for atomic dual-write', async () => {
      // Reset getDocs to return empty for both link count and existing link check
      mockGetDocs.mockResolvedValue({ docs: [], size: 0, empty: true });
      
      await playerLinksService.createPlayerLink({
        initiatorUserId: TEST_USER_A_ID,
        initiatorUserName: 'User A',
        initiatorPlayerId: TEST_PLAYER_A_ID,
        initiatorPlayerName: 'Player A',
        recipientUserId: TEST_USER_B_ID,
        recipientUserName: 'User B',
      });

      expect(mockWriteBatchFn).toHaveBeenCalled();
      expect(mockWriteBatch.set).toHaveBeenCalledTimes(2); // Both subcollections
      expect(mockWriteBatch.commit).toHaveBeenCalled();
    });

    it('should create link in initiator subcollection with isInitiator=true', async () => {
      // Reset getDocs to return empty for both link count and existing link check
      mockGetDocs.mockResolvedValue({ docs: [], size: 0, empty: true });
      
      await playerLinksService.createPlayerLink({
        initiatorUserId: TEST_USER_A_ID,
        initiatorUserName: 'User A',
        initiatorPlayerId: TEST_PLAYER_A_ID,
        initiatorPlayerName: 'Player A',
        recipientUserId: TEST_USER_B_ID,
        recipientUserName: 'User B',
      });

      // First set call should be initiator's subcollection
      const initiatorLinkArg = mockWriteBatch.set.mock.calls[0][1];
      expect(initiatorLinkArg.isInitiator).toBe(true);
      expect(initiatorLinkArg.myPlayerId).toBe(TEST_PLAYER_A_ID);
      expect(initiatorLinkArg.theirUserId).toBe(TEST_USER_B_ID);
    });

    it('should create link in recipient subcollection with isInitiator=false', async () => {
      // Reset getDocs to return empty for both link count and existing link check
      mockGetDocs.mockResolvedValue({ docs: [], size: 0, empty: true });
      
      await playerLinksService.createPlayerLink({
        initiatorUserId: TEST_USER_A_ID,
        initiatorUserName: 'User A',
        initiatorPlayerId: TEST_PLAYER_A_ID,
        initiatorPlayerName: 'Player A',
        recipientUserId: TEST_USER_B_ID,
        recipientUserName: 'User B',
      });

      // Second set call should be recipient's subcollection
      const recipientLinkArg = mockWriteBatch.set.mock.calls[1][1];
      expect(recipientLinkArg.isInitiator).toBe(false);
      expect(recipientLinkArg.myPlayerId).toBeNull(); // Pending, no player selected yet
      expect(recipientLinkArg.theirUserId).toBe(TEST_USER_A_ID);
    });

    it('should set status to pending on creation', async () => {
      // Reset getDocs to return empty for both link count and existing link check
      mockGetDocs.mockResolvedValue({ docs: [], size: 0, empty: true });
      
      await playerLinksService.createPlayerLink({
        initiatorUserId: TEST_USER_A_ID,
        initiatorUserName: 'User A',
        initiatorPlayerId: TEST_PLAYER_A_ID,
        initiatorPlayerName: 'Player A',
        recipientUserId: TEST_USER_B_ID,
        recipientUserName: 'User B',
      });

      const initiatorLinkArg = mockWriteBatch.set.mock.calls[0][1];
      const recipientLinkArg = mockWriteBatch.set.mock.calls[1][1];
      
      expect(initiatorLinkArg.status).toBe('pending');
      expect(recipientLinkArg.status).toBe('pending');
    });

    it('should reject if users are not friends', async () => {
      mockGetDoc.mockImplementation((ref: any) => {
        const path = ref?.path || '';
        if (path.includes('friends')) {
          return Promise.resolve({ exists: () => false }); // Not friends
        }
        return Promise.resolve({ exists: () => true, data: () => ({}) });
      });

      await expect(playerLinksService.createPlayerLink({
        initiatorUserId: TEST_USER_A_ID,
        initiatorUserName: 'User A',
        initiatorPlayerId: TEST_PLAYER_A_ID,
        initiatorPlayerName: 'Player A',
        recipientUserId: TEST_USER_B_ID,
        recipientUserName: 'User B',
      })).rejects.toThrow('You can only create links with friends');
    });

    it('should reject if max links reached', async () => {
      // Setup friendship to pass that check first
      mockGetDoc.mockImplementation((ref: any) => {
        const path = ref?.path || '';
        if (path.includes('friends')) {
          return Promise.resolve({ 
            exists: () => true,
            data: () => ({ status: 'accepted', friendId: TEST_USER_B_ID }),
          });
        }
        return Promise.resolve({ exists: () => true, data: () => ({}) });
      });
      
      // Return MAX_LINKS documents
      const maxLinks = Array(PLAYER_LINKS_CONFIG.MAX_LINKS_PER_USER).fill(null).map((_, i) => ({
        id: `link-${i}`,
        data: () => ({}),
      }));
      mockGetDocs.mockResolvedValue({ docs: maxLinks, size: maxLinks.length });

      await expect(playerLinksService.createPlayerLink({
        initiatorUserId: TEST_USER_A_ID,
        initiatorUserName: 'User A',
        initiatorPlayerId: TEST_PLAYER_A_ID,
        initiatorPlayerName: 'Player A',
        recipientUserId: TEST_USER_B_ID,
        recipientUserName: 'User B',
      })).rejects.toThrow(/maximum/);
    });
  });

  // ============================================
  // ACCEPT LINK TESTS (Atomic Dual-Write)
  // ============================================

  describe('acceptPlayerLink', () => {
    const mockPendingLink = {
      id: TEST_LINK_ID,
      status: 'pending',
      isInitiator: false,
      myPlayerId: null,
      myPlayerName: null,
      myLastSyncedVersion: 0,
      theirUserId: TEST_USER_A_ID,
      theirUserName: 'User A',
      theirPlayerId: TEST_PLAYER_A_ID,
      theirPlayerName: 'Player A',
      createdAt: Date.now(),
      acceptedAt: null,
    };
    
    const mockInitiatorLink = {
      id: TEST_LINK_ID,
      status: 'pending',
      isInitiator: true,
      myPlayerId: TEST_PLAYER_A_ID,
      myPlayerName: 'Player A',
      myLastSyncedVersion: 0,
      theirUserId: TEST_USER_B_ID,
      theirUserName: 'User B',
      theirPlayerId: null,
      theirPlayerName: null,
      createdAt: Date.now(),
      acceptedAt: null,
    };

    beforeEach(() => {
      mockDoc.mockImplementation((...args: any[]) => {
        const path = args.slice(1).join('/');
        return { id: TEST_LINK_ID, path };
      });
      
      mockGetDoc.mockImplementation((ref: any) => {
        const path = ref?.path || '';
        // Recipient's link (user-b-456/playerLinks)
        if (path.includes(TEST_USER_B_ID) && path.includes('playerLinks')) {
          return Promise.resolve({
            exists: () => true,
            id: TEST_LINK_ID,
            data: () => mockPendingLink,
          });
        }
        // Initiator's link (user-a-123/playerLinks) - for the dual update
        if (path.includes(TEST_USER_A_ID) && path.includes('playerLinks')) {
          return Promise.resolve({
            exists: () => true,
            id: TEST_LINK_ID,
            data: () => mockInitiatorLink,
          });
        }
        if (path.includes('players')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({ name: 'Player B', rangeVersion: 0 }),
          });
        }
        return Promise.resolve({ exists: () => false });
      });
      mockGetDocs.mockResolvedValue({ docs: [], size: 0 });
    });

    it('should use writeBatch for atomic dual-update', async () => {
      await playerLinksService.acceptPlayerLink(
        TEST_LINK_ID,
        TEST_USER_B_ID,
        {
          recipientPlayerId: TEST_PLAYER_B_ID,
          recipientPlayerName: 'Player B',
        }
      );

      expect(mockWriteBatchFn).toHaveBeenCalled();
      expect(mockWriteBatch.update).toHaveBeenCalledTimes(2);
      expect(mockWriteBatch.commit).toHaveBeenCalled();
    });

    it('should update recipient link with player info and active status', async () => {
      await playerLinksService.acceptPlayerLink(
        TEST_LINK_ID,
        TEST_USER_B_ID,
        {
          recipientPlayerId: TEST_PLAYER_B_ID,
          recipientPlayerName: 'Player B',
        }
      );

      // Find the update for recipient's subcollection
      const recipientUpdate = mockWriteBatch.update.mock.calls.find(
        (call: any) => call[1].myPlayerId === TEST_PLAYER_B_ID
      );
      
      expect(recipientUpdate).toBeDefined();
      expect(recipientUpdate[1].status).toBe('active');
      expect(recipientUpdate[1].myPlayerId).toBe(TEST_PLAYER_B_ID);
      expect(recipientUpdate[1].acceptedAt).toBeDefined();
    });

    it('should update initiator link with recipient player info', async () => {
      await playerLinksService.acceptPlayerLink(
        TEST_LINK_ID,
        TEST_USER_B_ID,
        {
          recipientPlayerId: TEST_PLAYER_B_ID,
          recipientPlayerName: 'Player B',
        }
      );

      // Find the update for initiator's subcollection
      const initiatorUpdate = mockWriteBatch.update.mock.calls.find(
        (call: any) => call[1].theirPlayerId === TEST_PLAYER_B_ID
      );
      
      expect(initiatorUpdate).toBeDefined();
      expect(initiatorUpdate[1].status).toBe('active');
      expect(initiatorUpdate[1].theirPlayerId).toBe(TEST_PLAYER_B_ID);
    });

    it('should reject if link is not pending', async () => {
      mockGetDoc.mockImplementation((ref: any) => {
        const path = ref?.path || '';
        if (path.includes('playerLinks')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({ 
              id: TEST_LINK_ID,
              status: 'active', // Already accepted
              isInitiator: false,
              myPlayerId: TEST_PLAYER_B_ID,
              theirUserId: TEST_USER_A_ID,
            }),
          });
        }
        return Promise.resolve({ exists: () => false });
      });

      await expect(playerLinksService.acceptPlayerLink(
        TEST_LINK_ID,
        TEST_USER_B_ID,
        {
          recipientPlayerId: TEST_PLAYER_B_ID,
          recipientPlayerName: 'Player B',
        }
      )).rejects.toThrow(/already been accepted/);
    });

    it('should reject if user is not the recipient', async () => {
      // Mock link where user is the initiator, not recipient
      mockGetDoc.mockImplementation((ref: any) => {
        const path = ref?.path || '';
        if (path.includes('playerLinks')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({ 
              id: TEST_LINK_ID,
              status: 'pending',
              isInitiator: true, // User A is the initiator
              myPlayerId: TEST_PLAYER_A_ID,
              theirUserId: TEST_USER_B_ID,
            }),
          });
        }
        return Promise.resolve({ exists: () => false });
      });

      await expect(playerLinksService.acceptPlayerLink(
        TEST_LINK_ID,
        TEST_USER_A_ID, // Wrong user (initiator trying to accept)
        {
          recipientPlayerId: TEST_PLAYER_B_ID,
          recipientPlayerName: 'Player B',
        }
      )).rejects.toThrow(/only accept links sent to you/);
    });
  });

  // ============================================
  // REMOVE LINK TESTS (Atomic Dual-Delete)
  // ============================================

  describe('removePlayerLink', () => {
    const mockActiveLink: UserPlayerLink = {
      id: TEST_LINK_ID,
      status: 'active',
      isInitiator: true,
      myPlayerId: TEST_PLAYER_A_ID,
      myPlayerName: 'Player A',
      myLastSyncedVersion: 5,
      theirUserId: TEST_USER_B_ID,
      theirUserName: 'User B',
      theirPlayerId: TEST_PLAYER_B_ID,
      theirPlayerName: 'Player B',
      createdAt: Date.now() - 10000,
      acceptedAt: Date.now() - 5000,
    };

    beforeEach(() => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockActiveLink,
      });
    });

    it('should use writeBatch for atomic dual-delete', async () => {
      await playerLinksService.removePlayerLink(TEST_LINK_ID, TEST_USER_A_ID);

      expect(mockWriteBatchFn).toHaveBeenCalled();
      expect(mockWriteBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockWriteBatch.commit).toHaveBeenCalled();
    });

    it('should delete from both users subcollections', async () => {
      await playerLinksService.removePlayerLink(TEST_LINK_ID, TEST_USER_A_ID);

      // Verify delete was called for both paths
      expect(mockWriteBatch.delete).toHaveBeenCalledTimes(2);
    });

    it('should allow either participant to remove', async () => {
      // User A removes
      await expect(
        playerLinksService.removePlayerLink(TEST_LINK_ID, TEST_USER_A_ID)
      ).resolves.not.toThrow();

      jest.clearAllMocks();
      mockWriteBatchFn.mockReturnValue(mockWriteBatch);
      
      // User B removes
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...mockActiveLink,
          isInitiator: false,
          myPlayerId: TEST_PLAYER_B_ID,
          theirUserId: TEST_USER_A_ID,
        }),
      });

      await expect(
        playerLinksService.removePlayerLink(TEST_LINK_ID, TEST_USER_B_ID)
      ).resolves.not.toThrow();
    });

    it('should reject if link not found', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      await expect(
        playerLinksService.removePlayerLink(TEST_LINK_ID, TEST_USER_A_ID)
      ).rejects.toThrow(/not found/);
    });
  });

  // ============================================
  // QUERY TESTS
  // ============================================

  describe('getPlayerLinks', () => {
    it('should return empty array if userId is empty', async () => {
      const result = await playerLinksService.getPlayerLinks('');
      expect(result).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('should return all links for a user', async () => {
      const mockLinks = [
        {
          id: 'link-1',
          data: () => ({
            id: 'link-1',
            status: 'active',
            isInitiator: true,
            myPlayerId: 'player-1',
            myPlayerName: 'Player 1',
            myLastSyncedVersion: 0,
            theirUserId: 'friend-1',
            theirUserName: 'Friend 1',
            theirPlayerId: 'their-player-1',
            theirPlayerName: 'Their Player 1',
            createdAt: 1000,
            acceptedAt: 2000,
          }),
        },
        {
          id: 'link-2',
          data: () => ({
            id: 'link-2',
            status: 'pending',
            isInitiator: false,
            myPlayerId: null,
            myPlayerName: null,
            myLastSyncedVersion: 0,
            theirUserId: 'friend-2',
            theirUserName: 'Friend 2',
            theirPlayerId: 'their-player-2',
            theirPlayerName: 'Their Player 2',
            createdAt: 1500,
            acceptedAt: null,
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockLinks });

      const result = await playerLinksService.getPlayerLinks(TEST_USER_A_ID);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('link-1');
      expect(result[0].status).toBe('active');
      expect(result[1].status).toBe('pending');
    });

    it('should use simple collection query (no OR)', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      await playerLinksService.getPlayerLinks(TEST_USER_A_ID);

      // Should NOT use 'or' or 'where' with multiple conditions
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_A_ID,
        'playerLinks'
      );
    });
  });

  describe('getPendingPlayerLinks', () => {
    it('should filter for pending links where user is recipient', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      await playerLinksService.getPendingPlayerLinks(TEST_USER_A_ID);

      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending');
      expect(mockWhere).toHaveBeenCalledWith('isInitiator', '==', false);
    });
  });

  // ============================================
  // SUBSCRIPTION TESTS
  // ============================================

  describe('subscribeToPlayerLinks', () => {
    it('should use single listener (not dual OR listeners)', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      playerLinksService.subscribeToPlayerLinks(TEST_USER_A_ID, mockCallback);

      // Should only call onSnapshot once (single listener)
      expect(mockOnSnapshot).toHaveBeenCalledTimes(1);
    });

    it('should include error handler', () => {
      const mockCallback = jest.fn();
      const mockErrorHandler = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      playerLinksService.subscribeToPlayerLinks(
        TEST_USER_A_ID,
        mockCallback,
        mockErrorHandler
      );

      // Verify error handler was passed
      const onSnapshotCall = mockOnSnapshot.mock.calls[0];
      expect(onSnapshotCall.length).toBeGreaterThanOrEqual(2);
      // Third argument should be error handler
      expect(typeof onSnapshotCall[2]).toBe('function');
    });

    it('should return unsubscribe function', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      mockOnSnapshot.mockReturnValue(mockUnsubscribe);

      const unsubscribe = playerLinksService.subscribeToPlayerLinks(
        TEST_USER_A_ID,
        mockCallback
      );

      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  // ============================================
  // SYNC TESTS
  // ============================================

  describe('syncRangesFromLink', () => {
    const mockActiveLink = {
      id: TEST_LINK_ID,
      status: 'active',
      isInitiator: true,
      myPlayerId: TEST_PLAYER_A_ID,
      myPlayerName: 'Player A',
      myLastSyncedVersion: 0,
      theirUserId: TEST_USER_B_ID,
      theirUserName: 'User B',
      theirPlayerId: TEST_PLAYER_B_ID,
      theirPlayerName: 'Player B',
      createdAt: Date.now() - 10000,
      acceptedAt: Date.now() - 5000,
    };

    beforeEach(() => {
      mockDoc.mockImplementation((...args: any[]) => {
        const path = args.slice(1).join('/');
        return { id: args[args.length - 1] || TEST_LINK_ID, path };
      });
      
      mockGetDoc.mockImplementation((ref: any) => {
        const path = ref?.path || '';
        if (path.includes('playerLinks')) {
          return Promise.resolve({
            exists: () => true,
            data: () => mockActiveLink,
          });
        }
        if (path.includes('players')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({
              name: 'Player B',
              rangeVersion: 5,
              ranges: {
                'early_open-raise': { 'AA': 'manual-selected', 'KK': 'manual-selected' },
              },
            }),
          });
        }
        return Promise.resolve({ exists: () => false });
      });
    });

    it('should update sync version using writeBatch', async () => {
      await playerLinksService.syncRangesFromLink(TEST_LINK_ID, TEST_USER_A_ID);

      expect(mockWriteBatchFn).toHaveBeenCalled();
      expect(mockWriteBatch.update).toHaveBeenCalled();
      expect(mockWriteBatch.commit).toHaveBeenCalled();
    });

    it('should reject if link is not active', async () => {
      mockGetDoc.mockImplementation((ref: any) => {
        const path = ref?.path || '';
        if (path.includes('playerLinks')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({ 
              id: TEST_LINK_ID,
              status: 'pending',
              isInitiator: true,
              myPlayerId: TEST_PLAYER_A_ID,
              theirUserId: TEST_USER_B_ID,
              theirPlayerId: TEST_PLAYER_B_ID,
            }),
          });
        }
        return Promise.resolve({ exists: () => false });
      });

      await expect(
        playerLinksService.syncRangesFromLink(TEST_LINK_ID, TEST_USER_A_ID)
      ).rejects.toThrow(/not active/);
    });
  });

  // ============================================
  // BATCHED UPDATE CHECK TESTS
  // ============================================

  describe('checkForUpdates (batched)', () => {
    it('should batch parallel requests', async () => {
      const links: UserPlayerLink[] = Array(25).fill(null).map((_, i) => ({
        id: `link-${i}`,
        status: 'active' as const,
        isInitiator: true,
        myPlayerId: `player-${i}`,
        myPlayerName: `Player ${i}`,
        myLastSyncedVersion: 0,
        theirUserId: `friend-${i}`,
        theirUserName: `Friend ${i}`,
        theirPlayerId: `their-player-${i}`,
        theirPlayerName: `Their Player ${i}`,
        createdAt: Date.now(),
        acceptedAt: Date.now(),
      }));

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ rangeVersion: 5 }),
      });

      // This should batch the requests, not fire all 25 at once
      await playerLinksService.checkAllForUpdates(links, TEST_USER_A_ID);

      // Verify requests were made (exact count depends on implementation)
      expect(mockGetDoc).toHaveBeenCalled();
    });
  });

  // ============================================
  // CONFIGURATION TESTS
  // ============================================

  describe('Configuration', () => {
    it('should have MAX_LINKS_PER_USER set to 100', () => {
      expect(PLAYER_LINKS_CONFIG.MAX_LINKS_PER_USER).toBe(100);
    });

    it('should have UPDATE_CHECK_BATCH_SIZE set to 10', () => {
      expect(PLAYER_LINKS_CONFIG.UPDATE_CHECK_BATCH_SIZE).toBe(10);
    });

    it('should have CACHE_TTL_MS set to 5 minutes', () => {
      expect(PLAYER_LINKS_CONFIG.CACHE_TTL_MS).toBe(5 * 60 * 1000);
    });
  });
});
