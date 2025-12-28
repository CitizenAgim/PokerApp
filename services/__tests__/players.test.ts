/**
 * Tests for Firebase Players Service - New Subcollection Structure
 * Path: /users/{userId}/players/{playerId}
 * 
 * TDD Phase 1: Players Service
 */

import { Range } from '@/types/poker';

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
import * as playersService from '../firebase/players';

describe('Players Service - Subcollection Structure', () => {
  const TEST_USER_ID = 'user-123';
  const TEST_PLAYER_ID = 'player-456';

  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue({ id: TEST_PLAYER_ID });
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
  });

  describe('Collection Path', () => {
    it('should use /users/{userId}/players path for getPlayers', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      await playersService.getPlayers(TEST_USER_ID);

      // Verify collection is called with correct path segments
      expect(mockCollection).toHaveBeenCalledWith(
        expect.anything(), // db
        'users',
        TEST_USER_ID,
        'players'
      );
    });

    it('should use /users/{userId}/players/{playerId} path for getPlayer', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: TEST_PLAYER_ID,
        data: () => ({
          name: 'Test Player',
          createdAt: { toMillis: () => Date.now() },
          updatedAt: { toMillis: () => Date.now() },
        }),
      });

      await playersService.getPlayer(TEST_USER_ID, TEST_PLAYER_ID);

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'players',
        TEST_PLAYER_ID
      );
    });

    it('should use /users/{userId}/players path for createPlayer', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await playersService.createPlayer(TEST_USER_ID, {
        name: 'New Player',
        createdBy: TEST_USER_ID,
      });

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'players',
        expect.any(String) // auto-generated ID
      );
    });
  });

  describe('getPlayers', () => {
    it('should return empty array if userId is empty', async () => {
      const result = await playersService.getPlayers('');
      expect(result).toEqual([]);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('should return all players for a user', async () => {
      const mockPlayers = [
        {
          id: 'player-1',
          data: () => ({
            name: 'Player 1',
            notes: 'Some notes',
            notesList: [],
            locations: ['Casino A'],
            isShared: false,
            createdAt: { toMillis: () => 1000 },
            updatedAt: { toMillis: () => 2000 },
          }),
        },
        {
          id: 'player-2',
          data: () => ({
            name: 'Player 2',
            isShared: true,
            createdAt: { toMillis: () => 1500 },
            updatedAt: { toMillis: () => 2500 },
          }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockPlayers });

      const result = await playersService.getPlayers(TEST_USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('player-1');
      expect(result[0].name).toBe('Player 1');
      expect(result[1].isShared).toBe(true);
    });

    it('should order players by updatedAt desc', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      await playersService.getPlayers(TEST_USER_ID);

      expect(mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    });
  });

  describe('getPlayer', () => {
    it('should return null if player does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      });

      const result = await playersService.getPlayer(TEST_USER_ID, TEST_PLAYER_ID);

      expect(result).toBeNull();
    });

    it('should return player with all fields including ranges', async () => {
      const mockRanges: Record<string, Range> = {
        'early_open-raise': { 'AA': 'manual-selected', 'KK': 'manual-selected' },
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: TEST_PLAYER_ID,
        data: () => ({
          name: 'Test Player',
          notes: 'Notes here',
          notesList: [{ id: '1', content: 'Note 1', timestamp: 1000 }],
          locations: ['Casino A'],
          color: '#ff0000',
          ranges: mockRanges,
          isShared: true,
          createdAt: { toMillis: () => 1000 },
          updatedAt: { toMillis: () => 2000 },
        }),
      });

      const result = await playersService.getPlayer(TEST_USER_ID, TEST_PLAYER_ID);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(TEST_PLAYER_ID);
      expect(result?.name).toBe('Test Player');
      expect(result?.ranges).toEqual(mockRanges);
      expect(result?.isShared).toBe(true);
    });
  });

  describe('createPlayer', () => {
    it('should create player with default isShared = false', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await playersService.createPlayer(TEST_USER_ID, {
        name: 'New Player',
        createdBy: TEST_USER_ID,
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'New Player',
          isShared: false,
        })
      );
    });

    it('should create player with provided playerId', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const customId = 'custom-player-id';

      const result = await playersService.createPlayer(
        TEST_USER_ID,
        { name: 'Custom ID Player', createdBy: TEST_USER_ID },
        customId
      );

      expect(result.id).toBe(customId);
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'players',
        customId
      );
    });

    it('should initialize empty ranges object', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      await playersService.createPlayer(TEST_USER_ID, {
        name: 'New Player',
        createdBy: TEST_USER_ID,
      });

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ranges: {},
        })
      );
    });
  });

  describe('updatePlayer', () => {
    it('should update player fields', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await playersService.updatePlayer(TEST_USER_ID, {
        id: TEST_PLAYER_ID,
        name: 'Updated Name',
        notes: 'Updated notes',
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Updated Name',
          notes: 'Updated notes',
        })
      );
    });

    it('should use correct document path', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await playersService.updatePlayer(TEST_USER_ID, {
        id: TEST_PLAYER_ID,
        name: 'Updated Name',
      });

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'players',
        TEST_PLAYER_ID
      );
    });
  });

  describe('updatePlayerRanges', () => {
    it('should update ranges field in player document', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const newRanges: Record<string, Range> = {
        'early_call': { 'AA': 'manual-selected' },
      };

      await playersService.updatePlayerRanges(TEST_USER_ID, TEST_PLAYER_ID, newRanges);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ranges: newRanges,
        })
      );
    });

    it('should update a specific range using dot notation', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      const rangeKey = 'early_open-raise';
      const range: Range = { 'AA': 'manual-selected', 'KK': 'manual-selected' };

      await playersService.updatePlayerRange(TEST_USER_ID, TEST_PLAYER_ID, rangeKey, range);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [`ranges.${rangeKey}`]: range,
        })
      );
    });
  });

  describe('deletePlayer', () => {
    it('should delete player from correct path', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await playersService.deletePlayer(TEST_USER_ID, TEST_PLAYER_ID);

      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        TEST_USER_ID,
        'players',
        TEST_PLAYER_ID
      );
      expect(mockDeleteDoc).toHaveBeenCalled();
    });
  });

  describe('togglePlayerSharing', () => {
    it('should toggle isShared field', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await playersService.togglePlayerSharing(TEST_USER_ID, TEST_PLAYER_ID, true);

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isShared: true,
        })
      );
    });
  });
});
