# Sync Notification Issue Analysis & Test Plan

## Issue Description

**Context:**
- User A and User B are linked on a specific player.
- User A acts as the "Editor" (makes changes).
- User B acts as the "Follower" (syncs changes).

**Scenario:**
1. User A updates ranges for the linked player (version increments, e.g., v1 -> v2).
2. User B receives a notification of the update.
3. User B syncs the changes and saves them locally.
    - User B does *not* make any new manual edits, only merges A's changes.
4. **The Bug:** User A now receives a "New Updates" notification from User B.

**Expected Behavior:**
- User A should **not** receive a notification after User B syncs, because User B has not added any *new* information that User A doesn't already have.
- User B's "version" of the player should not increment generally, or if it does, the system should recognize it's just a sync.
- Ideally, the system should know that User A is already "ahead" or "in sync" with B.

**Actual Behavior:**
- User A sees a notification implying User B has updates.

## Technical Analysis

The logic resides primarily in `services/firebase/playerLinks.ts`.

When User B syncs (via `syncRangesFromLink` or `syncSelectedRangesFromLink`), the following happens:
1. B fetches A's ranges.
2. B merges ranges into B's player.
3. B saves B's player using `updatePlayerRanges(..., incrementVersion = false)`.
    - This is intended to keep B's version static so A doesn't see an update.
4. B updates the Link Documents for **BOTH** users:
    - B's Link Doc: Sets `myLastSyncedVersion` to A's version (confirming B has A's data).
    - A's Link Doc: Sets `myLastSyncedVersion` to B's version.

The logic for A seeing a notification is in `checkForUpdates`:
```typescript
const hasUpdates = theirVersion > link.myLastSyncedVersion;
```

**Potential Failure Points:**
1. **Version Mismatch:** Even though `incrementVersion: false` is passed, `updatePlayerRanges` might be incrementing the version due to a logic error or default parameter handling.
2. **Stale Data:** When B writes to A's Link Doc, it writes `myVersion` (fetched before the merge). If B's version *did* increment during the merge (unexpectedly), B writes the *old* version to A's doc. A then sees B's *new* version (via `checkForUpdates`) which is > the *old* version written to A's doc.
3. **Implicit Save:** The UI might be triggering a separate `save`/`update` call after the sync that *does* increment the version.

## Test Cases

Create a new test file `services/firebase/__tests__/sync_notification_bug.test.ts` to reproduce this scenario specifically.

### Test Case 1: Sync Should Not Trigger Reverse Notification

Describes the exact flow reported by the user.

```typescript
import { createPlayerLink, syncRangesFromLink, checkForUpdates, toUserPlayerLink } from '../playerLinks';
import { createPlayer, updatePlayerRanges, getPlayer } from '../players';
import { db, auth } from '@/config/firebase';
// ... other mocks and setup

describe('Sync Notification Bug', () => {
  const userA = 'user_a_id';
  const userB = 'user_b_id';
  let playerAId: string;
  let playerBId: string;
  let linkId: string;

  beforeEach(async () => {
    // Setup: Create players for A and B
    const playerA = await createPlayer(userA, { name: 'Player A' });
    playerAId = playerA.id;
    
    const playerB = await createPlayer(userB, { name: 'Player B' });
    playerBId = playerB.id;

    // Create Link
    const link = await createPlayerLink({
      initiatorUserId: userA,
      initiatorPlayerId: playerAId,
      recipientUserId: userB,
      // ... other params
    });
    linkId = link.id;
    
    // Accept link (mocking the flow)
    // ... setup active link state
  });

  it('should not notify User A when User B syncs changes from User A', async () => {
    // 1. User A updates ranges (Version 0 -> 1)
    await updatePlayerRanges(userA, playerAId, {
      'early_open-raise': { 'AA': 'colored' }
    });

    // Verify A is v1
    const pA = await getPlayer(userA, playerAId);
    expect(pA?.rangeVersion).toBe(1);

    // 2. User B syncs from User A
    // This function acts as User B
    await syncRangesFromLink(linkId, userB);

    // Verify B's version did NOT increment (should remain 0 or initial)
    const pB = await getPlayer(userB, playerBId);
    expect(pB?.rangeVersion).toBe(0); // expecting no increment

    // 3. User A checks for updates from User B
    // We need to fetch the link as User A sees it
    const linkDocA = await getPlayerLinkDoc(userA, linkId); // Implementation detail helper
    const linkA = toUserPlayerLink(linkDocA.data());

    // Check logic
    const updateStatus = await checkForUpdates(linkA);

    // EXPECTATION: No updates found
    expect(updateStatus.hasUpdates).toBe(false);
  });
});
```

### Test Case 2: Verify `updatePlayerRanges` with incrementVersion=false

Isolate the version increment logic.

```typescript
it('should not increment version when incrementVersion is false', async () => {
  const player = await createPlayer(userA, { name: 'Test Player' });
  const initialVersion = player.rangeVersion || 0;

  await updatePlayerRanges(
    userA, 
    player.id, 
    { 'early_call': { 'KK': 'colored' } }, 
    false // explicitly false
  );

  const updatedPlayer = await getPlayer(userA, player.id);
  expect(updatedPlayer?.rangeVersion).toBe(initialVersion);
  expect(updatedPlayer?.ranges['early_call']).toBeDefined();
});
```

## Implementation Plan (Next Steps)

1.  **Run these tests.** If Test Case 1 fails (i.e., `hasUpdates` is true), debug whether:
    - B's version incremented unexpectedly.
    - A's `myLastSyncedVersion` wasn't updated correctly.
2.  **Verify UI Logic:** Check if the "Save" button in the Sync Modal or the flow after sync implicitly calls `updatePlayer` (which increments version).
3.  **Fix:**
    - if B's version increments: Ensure `incrementVersion: false` is respected.
    - if notification logic is unexpected: adjust `checkForUpdates` to account for equality if necessary (though strictly `>` is correct).
