
import { checkForUpdates, syncRangesFromLink } from '../playerLinks'; 
import { createPlayer, getPlayer, updatePlayerRanges } from '../players';

// ============================================
// MOCKS
// ============================================

// Helper for timestamps
const mockTimestamp = (millis: number) => ({
    toMillis: () => millis
});

// Simulated Database State
const mockDbState: Record<string, any> = {};

// Mock Firestore
const mockWriteBatch = {
  set: jest.fn((docRef, data) => {
    mockDbState[docRef] = data;
  }),
  update: jest.fn((docRef, data) => {
    mockDbState[docRef] = { ...mockDbState[docRef], ...data };
  }),
  delete: jest.fn((docRef) => {
    delete mockDbState[docRef];
  }),
  commit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, ...pathSegments) => pathSegments.join('/')),
  doc: jest.fn((db, ...pathSegments) => pathSegments.join('/')),
  writeBatch: jest.fn(() => mockWriteBatch),
  getDoc: jest.fn((docRef) => {
    const data = mockDbState[docRef];
    return Promise.resolve({
        exists: () => !!data,
        data: () => data,
        id: docRef.split('/').pop()
    });
  }),
  setDoc: jest.fn((docRef, data) => {
    mockDbState[docRef] = data;
    return Promise.resolve();
  }),
  updateDoc: jest.fn((docRef, data) => {
    const current = mockDbState[docRef] || {};
    mockDbState[docRef] = { ...current, ...data };
    return Promise.resolve();
  }),
  getDocs: jest.fn((query) => {
      return Promise.resolve({ empty: true, docs: [] });
  }),
  query: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => mockTimestamp(1234567890)), // Return object with toMillis
  orderBy: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  db: 'mock-db',
  auth: { currentUser: { uid: 'user_b_id' } } // Default to B for sync action
}));

jest.mock('../../rateLimit', () => ({
  checkRateLimit: jest.fn()
}));

jest.mock('../../validation', () => ({
  validatePlayerData: jest.fn().mockReturnValue({ valid: true }),
  validateRange: jest.fn().mockReturnValue({ valid: true }),
  VALIDATION_LIMITS: { MAX_RANGES_PER_PLAYER: 100 }
}));

// ============================================
// TESTS
// ============================================

describe('Sync Notification Bug', () => {
  const userA = 'user_a_id';
  const userB = 'user_b_id';
  const playerAId = 'player_a_id';
  const playerBId = 'player_b_id';
  const linkId = 'link_123';

  beforeEach(async () => {
    // Clear DB
    for (const key in mockDbState) delete mockDbState[key];
    jest.clearAllMocks();

    // Seed User A's Player (Version 1, has ranges)
    mockDbState[`users/${userA}/players/${playerAId}`] = {
        name: 'Player A',
        ranges: {
            'early_open-raise': { 'AA': 'colored' }
        },
        rangeVersion: 1,
        createdAt: mockTimestamp(1000),
        updatedAt: mockTimestamp(2000)
    };

    // Seed User B's Player (Version 0, empty)
    mockDbState[`users/${userB}/players/${playerBId}`] = {
        name: 'Player B',
        ranges: {},
        rangeVersion: 0,
        createdAt: mockTimestamp(1000),
        updatedAt: mockTimestamp(1000)
    };

    // Seed Link for User A (User A's view)
    mockDbState[`users/${userA}/playerLinks/${linkId}`] = {
        id: linkId,
        status: 'active',
        isInitiator: true,
        myPlayerId: playerAId,
        myLastSyncedVersion: 0, // A is behind/linked to B
        theirUserId: userB,
        theirPlayerId: playerBId,
        createdAt: mockTimestamp(1000),
        // playerLinks.ts DOES check typeof number for createdAt, but let's be safe
    };

    // Seed Link for User B (User B's view)
    mockDbState[`users/${userB}/playerLinks/${linkId}`] = {
        id: linkId,
        status: 'active',
        isInitiator: false,
        myPlayerId: playerBId,
        myLastSyncedVersion: 0, // B hasn't synced A's changes yet
        theirUserId: userA,
        theirPlayerId: playerAId,
        createdAt: mockTimestamp(1000)
    };
  });

  it('should not notify User A when User B syncs changes from User A', async () => {
    // 1. User B syncs from User A
    // This executes the logic we fixed: syncRangesFromLink
    await syncRangesFromLink(linkId, userB);

    // 2. Refresh B's player from "DB" to check if validation update happened
    const pB = mockDbState[`users/${userB}/players/${playerBId}`];
    // console.log('Player B after sync:', pB);
    
    // NOTE: updatePlayerRanges does NOT increment version when 'false' is passed.
    // However, if the implementation of syncRangesFromLink RE-FETCHES the player,
    // it gets the version. 
    
    // 3. Check what was written to User A's link doc
    const linkDocA = mockDbState[`users/${userA}/playerLinks/${linkId}`];
    // console.log('Link Doc A after sync:', linkDocA);

    // This is the core fix: 
    // User A's link doc "myLastSyncedVersion" should match User B's "rangeVersion".
    // B's rangeVersion should be 0 (because we only synced, not created new content).
    expect(pB.rangeVersion).toBe(0); 
    expect(linkDocA.myLastSyncedVersion).toBe(pB.rangeVersion);

    // 4. Run checkForUpdates logic as User A
    // Simulate what A does in the UI
    const updateCheck = await checkForUpdates(linkDocA);

    // theirPlayerId in A's link points to B.
    // checkForUpdates compares B's live version vs A's 'myLastSyncedVersion'.
    // Live B version = 0.
    // A's last synced = 0 (updated by B during sync).
    // Result should be FALSE.
    expect(updateCheck.hasUpdates).toBe(false);
  });
});
