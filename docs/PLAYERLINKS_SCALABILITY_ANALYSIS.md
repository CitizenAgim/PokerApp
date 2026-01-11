# PlayerLinks Scalability Analysis & Migration Plan

## Executive Summary

This document analyzes the scalability of the PlayerLinks feature and provides an optimized migration strategy that **preserves the cost-efficient pull-based architecture** while enabling scale to 100k+ users.

**Key Principle**: The pull-based sync model (see LINKED_PLAYERS_FEATURE_PLAN.md) must be preserved - it provides **99.6% cost savings** over push-based alternatives (~$1.50/month vs $1,400/month at 10k users).

---

## Current Architecture Analysis

### What's Working Well ✅

1. **Pull-based sync**: Cost scales with refresh frequency, not update count
2. **Version-based updates**: `rangeVersion` field avoids document fan-out
3. **Client-side caching**: 5-min TTL reduces Firestore reads by ~80%
4. **Fill-empty-only sync**: Protects existing user data
5. **Friend-based security**: Leverages existing friends subcollection

### Current Bottlenecks at Scale 🚨

| Issue | Current State | Impact at 10k+ Users |
|-------|--------------|---------------------|
| Collection structure | Root `/playerLinks/{linkId}` | 1M+ documents in single collection |
| Query pattern | OR queries (`userAId` OR `userBId`) | Expensive, requires 2 internal queries |
| Real-time listeners | 2 listeners per user | 20k+ active connections |
| Composite indexes | 6+ indexes required | Index storage costs, write overhead |
| Security rules | Complex participant checks | Slower rule evaluation |

### Cost Impact at Scale

**Current structure at 10k users with 100 links each:**
```
Collection size: 10,000 users × 50 links avg = 500,000 documents
OR query cost: Each query reads ~500k docs to find ~50 matches
Daily reads (3 refreshes): 10,000 × 3 × 10 reads = 300,000 reads
Monthly: 9M reads = $3.24/month (just for link checks)
```

**Problem**: Query efficiency degrades as collection grows. At 100k users:
```
Collection size: 5M documents
Query scans: 5M docs for each OR query
Monthly reads: 90M+ reads = $32+/month (10x increase)
```

---

## Recommended Solution: User-Scoped Subcollections

### New Data Structure

```typescript
// FROM: Root collection (current)
/playerLinks/{linkId}

// TO: User-scoped subcollections (optimized)
/users/{userId}/playerLinks/{linkId}

// Each link stored in BOTH users' subcollections
// Enables single-query access without OR operations
```

### Why This Structure?

| Aspect | Root Collection | Subcollection | Winner |
|--------|----------------|---------------|--------|
| Query complexity | OR across millions | Simple query on ~100 docs | ✅ Subcollection |
| Index requirements | 6+ composite | 1-2 simple | ✅ Subcollection |
| Real-time efficiency | 2 listeners | 1 listener | ✅ Subcollection |
| Security rules | Complex checks | Path-based | ✅ Subcollection |
| Data locality | Scattered | Co-located with user | ✅ Subcollection |
| Pull-based model | ✅ Preserved | ✅ Preserved | 🤝 Both |

### Data Model (Optimized)

```typescript
// Path: /users/{userId}/playerLinks/{linkId}
interface UserPlayerLink {
  // Link identification
  id: string;                    // Same linkId in both users' subcollections
  status: 'pending' | 'active';
  
  // Perspective flag (replaces complex userA/userB logic)
  isInitiator: boolean;          // true if this user created the link
  
  // My side (the user whose subcollection this is in)
  myPlayerId: string;
  myPlayerName: string;
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

**Benefits of this model:**
1. No more `userAId`/`userBId` confusion - just `my*` and `their*`
2. Single query to get all links: `collection(db, 'users', userId, 'playerLinks')`
3. Consistent perspective regardless of who created the link
4. Smaller documents (no duplicate user info)

---

## Cost Analysis: Current vs Optimized

### Assumptions (High Volume)
- 10,000 → 100,000 users
- Average 50 active links per user
- 3 refreshes per day with 5-min cache
- 300 range updates per player per month

### Current Structure Costs

**At 10,000 users:**
| Operation | Calculation | Monthly Cost |
|-----------|-------------|--------------|
| Link queries (OR) | 10k × 3/day × 30 × 10 reads | $3.24 |
| Version checks | 10k × 3 × 30 × 5 reads | $1.62 |
| Range syncs | 10k × 10 syncs × 3 ops | $0.50 |
| Index storage | 6 composite indexes | $0.50 |
| **Total** | | **~$6/month** |

**At 100,000 users:**
| Operation | Calculation | Monthly Cost |
|-----------|-------------|--------------|
| Link queries (OR) | 100k × 3/day × 30 × 10 reads | $32.40 |
| Version checks | 100k × 3 × 30 × 5 reads | $16.20 |
| Range syncs | 100k × 10 syncs × 3 ops | $5.00 |
| Index storage | 6 composite indexes | $2.00 |
| **Total** | | **~$56/month** |

### Optimized Structure Costs

**At 10,000 users:**
| Operation | Calculation | Monthly Cost |
|-----------|-------------|--------------|
| Link queries (simple) | 10k × 3/day × 30 × 2 reads | $0.65 |
| Version checks | 10k × 3 × 30 × 5 reads | $1.62 |
| Range syncs | 10k × 10 syncs × 3 ops | $0.50 |
| Index storage | 2 simple indexes | $0.15 |
| **Total** | | **~$3/month** |

**At 100,000 users:**
| Operation | Calculation | Monthly Cost |
|-----------|-------------|--------------|
| Link queries (simple) | 100k × 3/day × 30 × 2 reads | $6.48 |
| Version checks | 100k × 3 × 30 × 5 reads | $16.20 |
| Range syncs | 100k × 10 syncs × 3 ops | $5.00 |
| Index storage | 2 simple indexes | $0.50 |
| **Total** | | **~$28/month** |

### Cost Comparison Summary

| Scale | Current | Optimized | Savings |
|-------|---------|-----------|---------|
| 1,000 users | ~$0.60 | ~$0.30 | 50% |
| 10,000 users | ~$6.00 | ~$3.00 | 50% |
| 50,000 users | ~$28.00 | ~$14.00 | 50% |
| 100,000 users | ~$56.00 | ~$28.00 | 50% |

**Note**: The pull-based architecture keeps costs extremely low at any scale. The subcollection optimization primarily improves **query performance** and **scalability**, with cost savings as a bonus.

---

## Implementation Plan

### Phase 0: Preparation (Week 1)

**Tasks:**
1. Create new TypeScript types for `UserPlayerLink`
2. Add helper functions for subcollection paths
3. Update security rules (keep old rules, add new)
4. Create new indexes for subcollection

**New Security Rules:**
```javascript
// Add to firestore.rules
match /users/{userId}/playerLinks/{linkId} {
  // Owner has full access to their links
  allow read, write: if isOwner(userId);
  
  // Friend can create a link TO this user (pending link)
  allow create: if isAuthenticated() && 
    exists(/databases/$(database)/documents/users/$(userId)/friends/$(request.auth.uid)) &&
    request.resource.data.theirUserId == request.auth.uid &&
    request.resource.data.status == 'pending';
}
```

**New Indexes (firestore.indexes.json):**
```json
{
  "collectionGroup": "playerLinks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "playerLinks", 
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "theirUserId", "order": "ASCENDING" }
  ]
}
```

### Phase 1: Dual-Write Implementation (Week 2)

**Service Layer Changes:**

```typescript
// services/firebase/playerLinks.ts

// NEW: Subcollection helpers
function getUserPlayerLinksCollection(userId: string) {
  return collection(db, 'users', userId, 'playerLinks');
}

function getUserPlayerLinkDoc(userId: string, linkId: string) {
  return doc(db, 'users', userId, 'playerLinks', linkId);
}

// Convert root link to user perspective
function toUserPlayerLink(
  link: PlayerLink, 
  userId: string
): UserPlayerLink {
  const isInitiator = link.userAId === userId;
  
  return {
    id: link.id,
    status: link.status,
    isInitiator,
    myPlayerId: isInitiator ? link.userAPlayerId : link.userBPlayerId!,
    myPlayerName: isInitiator ? link.userAPlayerName : link.userBPlayerName!,
    myLastSyncedVersion: isInitiator ? link.userALastSyncedVersion : link.userBLastSyncedVersion,
    theirUserId: isInitiator ? link.userBId : link.userAId,
    theirUserName: isInitiator ? link.userBName : link.userAName,
    theirPlayerId: isInitiator ? link.userBPlayerId : link.userAPlayerId,
    theirPlayerName: isInitiator ? link.userBPlayerName : link.userAPlayerName,
    createdAt: link.createdAt,
    acceptedAt: link.acceptedAt,
  };
}

// MODIFIED: Create with dual-write
export async function createPlayerLink(data: CreatePlayerLink): Promise<PlayerLink> {
  // ... existing validation ...
  
  const linkId = doc(getPlayerLinksCollection()).id;
  
  // 1. Write to root collection (existing)
  const rootLink = await createRootPlayerLink(linkId, data);
  
  // 2. Write to both users' subcollections (new)
  await Promise.all([
    writeUserPlayerLink(data.userAId, toUserPlayerLink(rootLink, data.userAId)),
    writeUserPlayerLink(data.userBId, toUserPlayerLink(rootLink, data.userBId)),
  ]);
  
  return rootLink;
}

// MODIFIED: Accept with dual-write
export async function acceptPlayerLink(
  linkId: string,
  userId: string,
  acceptData: AcceptPlayerLink
): Promise<PlayerLink> {
  // ... existing logic ...
  
  // Update both subcollections
  await Promise.all([
    updateUserPlayerLink(link.userAId, linkId, { 
      status: 'active',
      theirPlayerId: acceptData.userBPlayerId,
      theirPlayerName: acceptData.userBPlayerName,
      acceptedAt: Date.now(),
    }),
    updateUserPlayerLink(link.userBId, linkId, {
      status: 'active',
      myPlayerId: acceptData.userBPlayerId,
      myPlayerName: acceptData.userBPlayerName,
      acceptedAt: Date.now(),
    }),
  ]);
  
  return updatedLink;
}

// MODIFIED: Delete from both
export async function removePlayerLink(linkId: string, userId: string): Promise<void> {
  const link = await getPlayerLink(linkId);
  
  // Delete from root
  await deleteDoc(getPlayerLinkDoc(linkId));
  
  // Delete from both subcollections
  await Promise.all([
    deleteDoc(getUserPlayerLinkDoc(link.userAId, linkId)),
    deleteDoc(getUserPlayerLinkDoc(link.userBId, linkId)),
  ]);
}
```

### Phase 2: Hybrid Read Migration (Week 3)

```typescript
// NEW: Read from subcollection (optimized)
async function getUserPlayerLinksOptimized(userId: string): Promise<UserPlayerLink[]> {
  const linksRef = getUserPlayerLinksCollection(userId);
  const snapshot = await getDocs(linksRef);
  return snapshot.docs.map(doc => doc.data() as UserPlayerLink);
}

// HYBRID: Try subcollection first, fallback to root
export async function getPlayerLinks(userId: string): Promise<PlayerLink[]> {
  // Check if user has subcollection data
  const userLinks = await getUserPlayerLinksOptimized(userId);
  
  if (userLinks.length > 0) {
    // Convert back to PlayerLink format for backward compatibility
    return userLinks.map(ul => fromUserPlayerLink(ul, userId));
  }
  
  // Fallback to root collection (legacy)
  return getPlayerLinksLegacy(userId);
}

// NEW: Optimized real-time subscription (single listener!)
export function subscribeToPlayerLinksOptimized(
  userId: string,
  callback: (links: UserPlayerLink[]) => void
): () => void {
  const linksRef = getUserPlayerLinksCollection(userId);
  
  return onSnapshot(linksRef, (snapshot) => {
    const links = snapshot.docs.map(doc => doc.data() as UserPlayerLink);
    callback(links);
  });
}
```

### Phase 3: Background Migration (Week 4)

```typescript
// scripts/migratePlayerLinks.ts
async function migrateExistingLinks() {
  const allLinks = await getAllRootPlayerLinks();
  
  let migrated = 0;
  let failed = 0;
  
  for (const link of allLinks) {
    try {
      // Check if already migrated
      const existsA = await getDoc(getUserPlayerLinkDoc(link.userAId, link.id));
      const existsB = await getDoc(getUserPlayerLinkDoc(link.userBId, link.id));
      
      if (existsA.exists() && existsB.exists()) {
        continue; // Already migrated
      }
      
      // Migrate to both subcollections
      await Promise.all([
        setDoc(
          getUserPlayerLinkDoc(link.userAId, link.id),
          toUserPlayerLink(link, link.userAId)
        ),
        setDoc(
          getUserPlayerLinkDoc(link.userBId, link.id),
          toUserPlayerLink(link, link.userBId)
        ),
      ]);
      
      migrated++;
    } catch (error) {
      console.error(`Failed to migrate link ${link.id}:`, error);
      failed++;
    }
  }
  
  console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
}
```

### Phase 4: Cutover & Cleanup (Week 5-6)

**Step 1: Switch to subcollection-only reads**
```typescript
// Remove fallback, use only subcollection
export async function getPlayerLinks(userId: string): Promise<PlayerLink[]> {
  const userLinks = await getUserPlayerLinksOptimized(userId);
  return userLinks.map(ul => fromUserPlayerLink(ul, userId));
}
```

**Step 2: Remove dual-write (keep only subcollection writes)**
```typescript
export async function createPlayerLink(data: CreatePlayerLink): Promise<PlayerLink> {
  // Only write to subcollections
  const linkId = doc(collection(db, '_')).id;
  
  const userALink = createUserPlayerLinkData(linkId, data, true);
  const userBLink = createUserPlayerLinkData(linkId, data, false);
  
  await Promise.all([
    setDoc(getUserPlayerLinkDoc(data.userAId, linkId), userALink),
    setDoc(getUserPlayerLinkDoc(data.userBId, linkId), userBLink),
  ]);
  
  return fromUserPlayerLink(userALink, data.userAId);
}
```

**Step 3: Cleanup**
- Delete root `/playerLinks` collection documents
- Remove old composite indexes from `firestore.indexes.json`
- Remove old security rules for root collection
- Remove legacy fallback code

---

## Pull-Based Model Integration

The subcollection structure fully preserves the pull-based sync model:

### Version Checking (Unchanged)
```typescript
// Still reads their player doc (same as before)
async function checkForUpdates(link: UserPlayerLink): Promise<boolean> {
  const theirPlayer = await getPlayer(link.theirUserId, link.theirPlayerId!);
  return (theirPlayer?.rangeVersion || 0) > link.myLastSyncedVersion;
}
```

### Sync Operation (Minor update)
```typescript
async function syncRangesFromLink(
  linkId: string, 
  userId: string
): Promise<SyncRangesResult> {
  // Get link from subcollection (faster!)
  const linkDoc = await getDoc(getUserPlayerLinkDoc(userId, linkId));
  const link = linkDoc.data() as UserPlayerLink;
  
  // ... existing sync logic ...
  
  // Update my sync version in subcollection
  await updateDoc(getUserPlayerLinkDoc(userId, linkId), {
    myLastSyncedVersion: theirVersion,
  });
  
  // Also update their view of my sync status
  await updateDoc(getUserPlayerLinkDoc(link.theirUserId, linkId), {
    // They see that I've synced
  });
  
  return result;
}
```

### Client-Side Caching (Unchanged)
The 5-minute cache TTL strategy remains exactly the same.

---

## Security Rules (Complete)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...
    
    match /users/{userId} {
      // ... existing user rules ...
      
      // NEW: User-scoped playerLinks subcollection
      match /playerLinks/{linkId} {
        // Owner has full read access
        allow read: if isOwner(userId);
        
        // Owner can create links they initiate
        allow create: if isOwner(userId) && 
          request.resource.data.isInitiator == true;
        
        // Friend can create pending link TO this user
        allow create: if isAuthenticated() &&
          exists(/databases/$(database)/documents/users/$(userId)/friends/$(request.auth.uid)) &&
          request.resource.data.theirUserId == request.auth.uid &&
          request.resource.data.isInitiator == false &&
          request.resource.data.status == 'pending';
        
        // Owner can update their links
        allow update: if isOwner(userId);
        
        // Friend can update status from pending to active (accepting)
        allow update: if isAuthenticated() &&
          resource.data.theirUserId == request.auth.uid &&
          resource.data.status == 'pending' &&
          request.resource.data.status == 'active';
        
        // Owner can delete their links
        allow delete: if isOwner(userId);
        
        // Friend can delete (unlink from their side)
        allow delete: if isAuthenticated() &&
          resource.data.theirUserId == request.auth.uid;
      }
    }
    
    // LEGACY: Root playerLinks (read-only during migration)
    match /playerLinks/{linkId} {
      allow read: if isAuthenticated() && (
        resource.data.userAId == request.auth.uid || 
        resource.data.userBId == request.auth.uid
      );
      // No writes - all new writes go to subcollections
      allow write: if false;
    }
  }
}
```

---

## Firestore Indexes (Optimized)

**Remove these indexes after migration:**
```json
// DELETE from firestore.indexes.json
{ "collectionGroup": "playerLinks", "fields": [{"fieldPath": "userAId"}, {"fieldPath": "createdAt"}] },
{ "collectionGroup": "playerLinks", "fields": [{"fieldPath": "userBId"}, {"fieldPath": "createdAt"}] },
{ "collectionGroup": "playerLinks", "fields": [{"fieldPath": "userBId"}, {"fieldPath": "status"}] },
{ "collectionGroup": "playerLinks", "fields": [{"fieldPath": "userAId"}, {"fieldPath": "userAPlayerId"}] },
{ "collectionGroup": "playerLinks", "fields": [{"fieldPath": "userBId"}, {"fieldPath": "userBPlayerId"}] }
```

**Keep only these indexes:**
```json
{
  "indexes": [
    {
      "collectionGroup": "playerLinks",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## Migration Timeline

| Week | Phase | Tasks | Risk Level |
|------|-------|-------|------------|
| 1 | Preparation | Types, rules, indexes | 🟢 Low |
| 2 | Dual-Write | Write to both structures | 🟡 Medium |
| 3 | Hybrid Reads | Read from subcollection first | 🟡 Medium |
| 4 | Background Migration | Migrate existing links | 🟡 Medium |
| 5 | Cutover | Switch to subcollection only | 🟠 High |
| 6 | Cleanup | Delete legacy data/code | 🟢 Low |

---

## Risk Mitigation

### 1. Feature Flag
```typescript
const USE_SUBCOLLECTION_LINKS = getFeatureFlag('playerLinksSubcollection');

export async function getPlayerLinks(userId: string) {
  if (USE_SUBCOLLECTION_LINKS) {
    return getPlayerLinksFromSubcollection(userId);
  }
  return getPlayerLinksFromRoot(userId);
}
```

### 2. Data Validation
```typescript
// During hybrid phase, compare results
async function validateMigration(userId: string) {
  const rootLinks = await getPlayerLinksFromRoot(userId);
  const subLinks = await getPlayerLinksFromSubcollection(userId);
  
  const rootIds = new Set(rootLinks.map(l => l.id));
  const subIds = new Set(subLinks.map(l => l.id));
  
  const missing = [...rootIds].filter(id => !subIds.has(id));
  if (missing.length > 0) {
    console.warn(`Missing links in subcollection: ${missing.join(', ')}`);
  }
}
```

### 3. Rollback Plan
- Keep root collection intact until Week 6
- Feature flag allows instant rollback
- Monitor error rates and latency during each phase

---

## Monitoring Metrics

Track these during migration:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Link query latency | >500ms | Investigate, consider rollback |
| Error rate | >1% | Pause migration, fix issues |
| Missing links | >0 | Re-run migration for user |
| Cost increase | >20% | Optimize queries |

---

## Summary

This migration plan:

1. ✅ **Preserves pull-based architecture** - No changes to sync model
2. ✅ **Maintains cost efficiency** - ~50% reduction in link-related costs
3. ✅ **Improves query performance** - Single query vs OR operations
4. ✅ **Simplifies security rules** - Path-based access control
5. ✅ **Enables scale to 100k+ users** - Linear scaling with user count
6. ✅ **Provides safe rollback** - Feature flagged with validation
7. ✅ **Follows existing patterns** - Same as players subcollection

**Estimated total cost at scale:**

| Users | Current System | After Migration |
|-------|---------------|-----------------|
| 10,000 | ~$6/month | ~$3/month |
| 50,000 | ~$28/month | ~$14/month |
| 100,000 | ~$56/month | ~$28/month |

The pull-based model continues to provide massive savings (99%+ vs push-based alternatives) while the subcollection structure ensures optimal performance at any scale. 