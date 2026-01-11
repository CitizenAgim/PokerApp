# PlayerLinks Implementation - Subcollection Architecture

## Overview

This document describes the **production-ready** PlayerLinks implementation using user-scoped subcollections. This architecture prioritizes **speed, reliability, and security** while maintaining cost efficiency at scale.

**Status**: Ready for implementation (fresh build, no migration needed)

---

## Architecture Decision

### Chosen Approach: User-Scoped Subcollections

```typescript
// Data Structure
/users/{userId}/playerLinks/{linkId}

// Each link is stored in BOTH users' subcollections
// Uses writeBatch() for atomic dual-writes
```

### Why This Structure?

| Aspect | Root Collection | Subcollection (Chosen) |
|--------|----------------|------------------------|
| Query speed | 200-400ms (OR query) | 50-100ms (direct query) |
| Real-time listeners | 2 per user | 1 per user |
| Index requirements | 6+ composite | 1-2 simple |
| Security rules | Complex participant checks | Simple path-based |
| Reliability | Single point | Atomic dual-write with batch |

### Data Model

```typescript
// Path: /users/{userId}/playerLinks/{linkId}
interface UserPlayerLink {
  id: string;                    // Same linkId in both users' subcollections
  status: 'pending' | 'active';
  
  // Perspective flag (replaces userA/userB confusion)
  isInitiator: boolean;          // true if this user created the link
  
  // My side (the user whose subcollection this is in)
  myPlayerId: string | null;     // null for pending links received
  myPlayerName: string | null;
  myLastSyncedVersion: number;
  
  // Their side (the linked friend)
  theirUserId: string;
  theirUserName: string;
  theirPlayerId: string | null;  // null for pending links from initiator
  theirPlayerName: string | null;
  
  // Timestamps
  createdAt: number;
  acceptedAt: number | null;
}
```

**Benefits:**
1. No more `userAId`/`userBId` confusion - just `my*` and `their*`
2. Single query to get all links: `collection(db, 'users', userId, 'playerLinks')`
3. Consistent perspective regardless of who created the link
4. Smaller documents (no duplicate user info)

---

## Configuration

```typescript
// types/sharing.ts
export const PLAYER_LINKS_CONFIG = {
  MAX_LINKS_PER_USER: 100,      // Reduced from 250 for reliability
  CACHE_TTL_MS: 5 * 60 * 1000,  // 5 minutes
  UPDATE_CHECK_BATCH_SIZE: 10,  // Batch parallel requests
} as const;
```

---

## Stability Features

### 1. Atomic Dual-Writes with writeBatch()

All operations that touch both subcollections use `writeBatch()` for atomicity:

```typescript
const batch = writeBatch(db);
batch.set(getUserPlayerLinkDoc(userAId, linkId), userALink);
batch.set(getUserPlayerLinkDoc(userBId, linkId), userBLink);
await batch.commit(); // Both succeed or both fail
```

### 2. Error Handling on Subscriptions

```typescript
return onSnapshot(
  linksRef,
  (snapshot) => { /* success */ },
  (error) => {
    console.error('PlayerLinks subscription error:', error);
    onError?.(error);
  }
);
```

### 3. Batched Update Checks

Instead of 100 parallel requests, batch them:

```typescript
const BATCH_SIZE = 10;
for (let i = 0; i < links.length; i += BATCH_SIZE) {
  const batch = links.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(link => checkForUpdates(link)));
}
```

### 4. Single Real-Time Listener

One listener per user instead of two (no OR query merge):

```typescript
const unsubscribe = onSnapshot(
  collection(db, 'users', userId, 'playerLinks'),
  callback
);
```

---

## Implementation Checklist

### Phase 1: Types & Configuration
- [ ] Update `UserPlayerLink` type in `types/sharing.ts`
- [ ] Set `MAX_LINKS_PER_USER: 100`
- [ ] Add `UPDATE_CHECK_BATCH_SIZE: 10`

### Phase 2: Service Layer (`services/firebase/playerLinks.ts`)
- [ ] Add subcollection helper functions
- [ ] Implement `createPlayerLink` with `writeBatch()`
- [ ] Implement `acceptPlayerLink` with `writeBatch()`
- [ ] Implement `removePlayerLink` with `writeBatch()`
- [ ] Implement `getPlayerLinks` (simple subcollection query)
- [ ] Implement `subscribeToPlayerLinks` (single listener with error handler)
- [ ] Implement `syncRangesFromLink` with `writeBatch()`
- [ ] Implement batched `checkForUpdates`

### Phase 3: Hook Layer (`hooks/usePlayerLinks.ts`)
- [ ] Update to use new service functions
- [ ] Add error state handling
- [ ] Implement batched update checking
- [ ] Remove dual-listener merge logic

### Phase 4: Security & Indexes
- [ ] Update `firestore.rules` with subcollection rules
- [ ] Update `firestore.indexes.json` (remove old, add new)
- [ ] Deploy rules: `firebase deploy --only firestore:rules`
- [ ] Deploy indexes: `firebase deploy --only firestore:indexes`

### Phase 5: Cleanup
- [ ] Delete test links from root `/playerLinks` collection
- [ ] Remove legacy playerLinks indexes from `firestore.indexes.json`

---

## Security Rules

```javascript
// firestore.rules - Add under /users/{userId}
match /playerLinks/{linkId} {
  // Helper: check if requester is the linked friend
  function isLinkedFriend() {
    return resource.data.theirUserId == request.auth.uid;
  }
  
  // Owner has full read access
  allow read: if isOwner(userId);
  
  // Owner can create links they initiate
  allow create: if isOwner(userId) && 
    request.resource.data.isInitiator == true;
  
  // Friend can create pending link TO this user (they become theirUserId in recipient's view)
  allow create: if isAuthenticated() &&
    exists(/databases/$(database)/documents/users/$(userId)/friends/$(request.auth.uid)) &&
    request.resource.data.theirUserId == request.auth.uid &&
    request.resource.data.isInitiator == false &&
    request.resource.data.status == 'pending';
  
  // Owner can update their links (sync version, etc.)
  allow update: if isOwner(userId);
  
  // Friend can accept pending link (update status to active)
  allow update: if isAuthenticated() &&
    isLinkedFriend() &&
    resource.data.status == 'pending' &&
    request.resource.data.status == 'active';
  
  // Friend can update their sync status on active links
  allow update: if isAuthenticated() &&
    isLinkedFriend() &&
    resource.data.status == 'active' &&
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['theirLastSyncedVersion']);
  
  // Owner can delete their links
  allow delete: if isOwner(userId);
  
  // Friend can delete (unlink from their side)
  allow delete: if isAuthenticated() && isLinkedFriend();
}
```

---

## Firestore Indexes

**New indexes (add to firestore.indexes.json):**
```json
{
  "collectionGroup": "playerLinks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Indexes to REMOVE after implementation:**
- `playerLinks` with `userAId` + `createdAt`
- `playerLinks` with `userBId` + `createdAt`  
- `playerLinks` with `userBId` + `status`
- `playerLinks` with `userAId` + `userAPlayerId`
- `playerLinks` with `userBId` + `userBPlayerId`

---

## Cost Estimates

| Scale | Monthly Cost | Notes |
|-------|-------------|-------|
| 1,000 users | ~$0.30 | Well under free tier |
| 10,000 users | ~$3-5 | Minimal cost |
| 50,000 users | ~$15-20 | Still very affordable |
| 100,000 users | ~$30-40 | Linear scaling |

---

## Performance Targets

| Metric | Target | Current (Root) |
|--------|--------|---------------|
| Link query latency | <100ms | 200-400ms |
| Real-time listeners per user | 1 | 2 |
| Update check (100 links) | <2s batched | 10s+ parallel |
| Memory per user | ~50KB | ~100KB |

---

## Summary

This implementation provides:

1. ✅ **Speed**: Single query, no OR operations (~2-4x faster)
2. ✅ **Reliability**: Atomic writes, error handling, batched operations
3. ✅ **Security**: Path-based rules, friend validation
4. ✅ **Scalability**: Linear scaling to 100k+ users
5. ✅ **Cost efficiency**: ~$30-40/month at 100k users 