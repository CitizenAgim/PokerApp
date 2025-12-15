# Data Optimization & Lean Sync Plan

## Objective
Reduce Firebase read/write operations and storage costs by:
1. Only syncing session data when a session is finished (or updated after finishing).
2. Removing Table/Seat/Player data from the Cloud database (keeping it local-only).

## Strategy

### 1. Database Schema Changes (Implicit)
- The `sessions` collection in Firestore will no longer store the `table` map.
- `table`, `seats`, and `players` within a session will remain in `AsyncStorage` for local persistence during active play but will be stripped before cloud sync.

### 2. Logic Updates

#### A. Local Storage (`services/localStorage.ts`)
- **Current Behavior**: `saveSession` adds a pending sync item for every save.
- **New Behavior**: 
    - If `session.isActive === true`: Save to AsyncStorage, do **NOT** add to pending sync.
    - If `session.isActive === false`: Save to AsyncStorage, **ADD** to pending sync.

#### B. Cloud Sync Service (`services/sync.ts`)
- **Current Behavior**: `syncSession` sends the full session object, sometimes including `table`.
- **New Behavior**: 
    - Ensure the payload sent to `sessionsFirebase` explicitly excludes the `table` property.
    - Remove logic that calls `sessionsFirebase.updateTable`.

#### C. Firebase Service (`services/firebase/sessions.ts`)
- Remove/Deprecate:
    - `updateTable`
    - `updateButtonPosition`
    - `assignPlayerToSeat`
- Update `createSession` and `updateSession` to ensure they don't accidentally write table data if passed.

#### D. Hooks (`hooks/useSession.ts`)
- Remove direct calls to Firebase for table actions (`assignPlayerToSeat`, `updateButtonPosition`).
- Rely entirely on `localStorage` for active session state.
- Ensure `endSession` triggers the sync.

## Test Plan (TDD)

We will create a new test file `services/__tests__/optimization.test.ts` to verify these behaviors before implementation.

### Test Cases
1.  **Active Session Local-Only**: Calling `saveSession` with an active session should update `AsyncStorage` but **not** add an item to `pendingSync`.
2.  **Finished Session Syncs**: Calling `saveSession` with a finished session (`isActive: false`) **should** add an item to `pendingSync`.
3.  **No Table Data in Sync**: When `syncPendingChanges` processes a session, the data sent to the mocked Firebase service must **not** contain the `table` property.

## Implementation Steps
1.  Create `services/__tests__/optimization.test.ts` (Failing).
2.  Modify `services/localStorage.ts` to filter sync based on `isActive`.
3.  Modify `services/sync.ts` to strip `table` data.
4.  Modify `services/firebase/sessions.ts` to remove table-specific methods.
5.  Clean up `hooks/useSession.ts`.
6.  Run tests to confirm passing.
