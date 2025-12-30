# Hands Data Restructure Plan

## Status: ✅ IMPLEMENTED

## Current Structure (Before)
```
/users/{userId}/
  ├── players/{playerId}
  ├── sessions/{sessionId}
  │   └── hands/{handId}  <-- Hands as subcollection of session
```

**Problems:**
1. Deleting a session deletes all hands (or orphans them)
2. Cannot save hands without an active session
3. Hands are tightly coupled to sessions

---

## New Structure (After)
```
/users/{userId}/
  ├── players/{playerId}
  ├── sessions/{sessionId}
  └── hands/{handId}  <-- Hands as top-level subcollection under user
        └── sessionId: string | null  <-- Optional reference to session
```

**Benefits:**
1. Hands persist independently of sessions
2. Can save hands without a session (sessionId = null) - future feature
3. Deleting a session does NOT delete associated hands
4. Can still query hands by sessionId when viewing a session
5. Can easily show "all hands" sorted by date

---

## Decisions Made

| Question | Answer |
|----------|--------|
| Standalone hand recording UI | Skip for now, add later |
| Session deletion behavior | Clear sessionId on hands (orphan them) |
| Display in Saved Hands | All hands in one list, sorted by date (most recent first) |
| Session info storage | Denormalize on hand (Option A) - store sessionName, stakes, location |
| Data migration | Not needed - user manually deleted existing hands |

---

## Schema Changes

### HandRecord (updated)
```typescript
interface HandRecord {
  id: string;
  userId: string;
  sessionId: string | null;  // null = standalone hand, not tied to session
  timestamp: number;
  street: Street;
  pot: number;
  sidePots: SidePot[];
  actions: HandAction[];
  seats: Seat[];
  communityCards: string[];
  handCards?: Record<number, string[]>;
  heroSeat?: number;
  winners?: number[];
  
  // Denormalized session info (for display without fetching session)
  sessionName?: string;
  stakes?: string;
  location?: string;
}
```

### SessionInfo (new helper interface)
```typescript
interface SessionInfo {
  sessionId: string;
  sessionName?: string;
  stakes?: string;
  location?: string;
}
```

---

## Files to Change

| File | Changes |
|------|---------|
| `services/firebase/hands.ts` | New collection path, updated queries, new functions |
| `firestore.rules` | Add rules for new hands collection |
| `services/firebase/sessions.ts` | Clear sessionId from hands when deleting session |
| `app/record-hand.tsx` | Pass session info when saving hand |
| `app/(main)/sessions/[id].tsx` | Use new `getHandsBySession()` function |
| `app/saved-hands.tsx` | Display session info on hand cards |

---

## Implementation Checklist

### 1. Update `services/firebase/hands.ts`
- [x] Change collection path to `/users/{userId}/hands`
- [x] Update `HandRecord` interface with nullable sessionId and session fields
- [x] Add `SessionInfo` interface
- [x] Create `getHandsBySession()` function
- [x] Update `saveHand()` to accept optional `SessionInfo`
- [x] Add `clearSessionFromHands()` function
- [x] Update `getUserHandsPaginated()` - simpler query now
- [x] Update `deleteHands()` and `deleteHandRecords()` for new path

### 2. Update `firestore.rules`
- [x] Add rules for `/users/{userId}/hands` collection
- [x] Mark old session hands subcollection as read-only (legacy)

### 3. Update `services/firebase/sessions.ts`
- [x] Import `clearSessionFromHands` from hands service
- [x] Update `deleteSession()` to clear sessionId from hands first

### 4. Update `app/record-hand.tsx`
- [x] Update import to include `SessionInfo`
- [x] Build `SessionInfo` object from session data
- [x] Pass session info to `saveHand()`

### 5. Update `app/(main)/sessions/[id].tsx`
- [x] Update import to use `getHandsBySession`
- [x] Update fetch call

### 6. Update `app/saved-hands.tsx`
- [x] Add session info display in hand cards
- [x] Add styles for session info row

---

## Testing Checklist

- [ ] Save a hand during a session → should have sessionId and session info
- [ ] View session → should show hands for that session only
- [ ] View Saved Hands → should show all hands with session info
- [ ] Delete a session → hands should remain but sessionId should be null
- [ ] Verify hands still display correctly after session deletion

---

## Future Enhancements
- Add "Quick Record Hand" button on home screen (standalone hands)
- Add filters to Saved Hands (by session, date range, etc.)
- Group hands by session in Saved Hands view
