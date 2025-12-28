# Database Migration Plan: Flat Collections → User Subcollections

## Overview

This document outlines the database restructuring plan for scalability and the future friends/sharing feature.

**Current Status**: Single user (development). Plan to support thousands of users.

**Decision**: Delete existing data and start fresh with optimized structure.

---

## Requirements Summary

### Core Requirements
1. **Scalability**: Support 10,000+ daily active users efficiently
2. **Cost Optimization**: Minimize Firestore reads/writes
3. **Security**: User data isolated by default

### Friends & Sharing Feature (Future)

| Aspect | Requirement |
|--------|-------------|
| **What can be shared** | Everything: players, ranges, notes, sessions, hands |
| **Granularity** | Selective per item, controlled via user settings |
| **Default permission** | Read + Copy (no edit) |
| **Future permission** | Collaborative editing with special privileges |
| **Sharing direction** | Mutual + Selective (friends see each other's shared data, can hide specific items) |
| **Data ownership** | Snapshot/copy by default |
| **Merge feature** | Optional, disabled by default, opt-in via settings |

### Use Cases
- **A)** "We play at the same casino, let's pool our notes on regulars"
- **B)** "I'm a coach sharing my range charts with students"
- **C)** "We're in a study group analyzing hands together"

---

## Current Structure (Flat - DEPRECATED)

```
firestore/
├── hands/{handId}
│   ├── sessionId
│   ├── userId          ← Required for filtering
│   └── ...hand data
│
├── playerRanges/{rangeId}
│   ├── playerId
│   └── ranges{}        ← NO USER ID! Security issue
│
├── players/{playerId}
│   ├── createdBy       ← Required for filtering
│   └── ...player data
│
├── sessions/{sessionId}
│   ├── createdBy       ← Required for filtering
│   └── ...session data
│
└── users/{userId}
    └── ...user profile
```

### Problems with Flat Structure

1. **Query Efficiency**: Every query must filter by `createdBy`/`userId`
   - Firestore scans ALL documents, charges for reads, THEN filters
   - With 10K users × 100 sessions each = 1M session docs to scan

2. **Cost**: Composite indexes required for every filtered+sorted query
   - Index: `createdBy` + `startTime` (sessions)
   - Index: `userId` + `timestamp` (hands)
   - Each index = storage costs

3. **Security Hole**: `playerRanges` has no `createdBy` field
   - Any authenticated user can read ALL player ranges

---

## Target Structure (Subcollections + Sharing Support)

```
firestore/
│
├── users/{userId}
│   │
│   ├── (user document fields)
│   │   ├── email
│   │   ├── displayName
│   │   ├── createdAt
│   │   └── settings: {
│   │         defaultSharePermission: 'read-copy' | 'read-only'
│   │         mergeEnabled: false
│   │         sharePlayersDefault: false
│   │         shareSessionsDefault: false
│   │       }
│   │
│   ├── players/{playerId}                    ← User's own players
│   │   ├── name
│   │   ├── notes
│   │   ├── notesList[]
│   │   ├── locations[]
│   │   ├── ranges: {}                        ← Embedded (no separate collection)
│   │   ├── isShared: boolean                 ← Available to friends?
│   │   ├── createdAt
│   │   └── updatedAt
│   │
│   ├── sessions/{sessionId}                  ← User's own sessions
│   │   ├── name
│   │   ├── location
│   │   ├── stakes
│   │   ├── buyIn
│   │   ├── cashOut
│   │   ├── startTime
│   │   ├── endTime
│   │   ├── isActive
│   │   ├── isShared: boolean                 ← Available to friends?
│   │   ├── table: {}                         ← Embedded table state
│   │   │
│   │   └── hands/{handId}                    ← Nested under session
│   │       ├── timestamp
│   │       ├── heroPosition
│   │       ├── heroCards
│   │       ├── villainPositions[]
│   │       ├── action
│   │       ├── street
│   │       ├── potSize
│   │       ├── result
│   │       └── notes
│   │
│   ├── friends/{friendUserId}                ← Accepted friendships
│   │   ├── since: timestamp
│   │   ├── permissions: 'read-copy' | 'read-only' | 'collaborative'
│   │   └── nickname: string (optional)
│   │
│   └── imports/{importId}                    ← Data copied FROM friends
│       ├── sourceUserId
│       ├── sourceType: 'player' | 'session'
│       ├── sourceId
│       ├── importedAt
│       └── data: { ... }                     ← Snapshot of shared data
│
└── friendRequests/{requestId}                ← Global collection for discovery
    ├── fromUserId
    ├── toUserId
    ├── status: 'pending' | 'accepted' | 'declined'
    ├── createdAt
    └── message (optional)
```

### Key Design Decisions

#### 1. Ranges Embedded in Players
- No separate `playerRanges` collection
- Single read to get player + all their ranges
- Firestore 1MB limit is plenty (~50KB max for full range data)

#### 2. Hands Nested Under Sessions
- Path: `/users/{userId}/sessions/{sessionId}/hands/{handId}`
- Natural grouping: hands always belong to a session
- Easy to query all hands for a session
- Easy to delete session + all hands

#### 3. Friends as Subcollection
- `/users/{userId}/friends/{friendUserId}`
- Each user maintains their own friend list
- Permissions stored per-friend
- Mutual friendship = both users have each other in their `friends` subcollection

#### 4. Sharing Model: Snapshot/Copy
- When User A shares Player X with User B:
  1. User B sees Player X in User A's shared data (read access via security rules)
  2. User B can "import" (copy) to their own `/users/{B}/imports/`
  3. Import is a snapshot - no live sync by default
  4. Future: merge feature links two users' data on the same player

#### 5. `isShared` Flag
- Simple boolean on players/sessions
- If `true`, friends with appropriate permissions can view
- User can toggle per-item what to share

---

## Security Rules (With Sharing Support)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Check if requester is a friend of the user
    function isFriend(userId) {
      return exists(/databases/$(database)/documents/users/$(userId)/friends/$(request.auth.uid));
    }
    
    // Check if item is shared
    function isShared() {
      return resource.data.isShared == true;
    }

    // =============================================
    // USER DOCUMENT + SETTINGS
    // =============================================
    match /users/{userId} {
      allow read: if isAuthenticated();  // Basic profile visible to all authenticated
      allow write: if isOwner(userId);
      
      // =============================================
      // PLAYERS (with sharing)
      // =============================================
      match /players/{playerId} {
        // Owner: full access
        allow read, write: if isOwner(userId);
        // Friends: read if shared
        allow read: if isAuthenticated() && isFriend(userId) && isShared();
      }
      
      // =============================================
      // SESSIONS (with sharing)
      // =============================================
      match /sessions/{sessionId} {
        allow read, write: if isOwner(userId);
        allow read: if isAuthenticated() && isFriend(userId) && isShared();
        
        // Hands inherit session access
        match /hands/{handId} {
          allow read, write: if isOwner(userId);
          // Friends can read hands if session is shared
          allow read: if isAuthenticated() && isFriend(userId) && 
            get(/databases/$(database)/documents/users/$(userId)/sessions/$(sessionId)).data.isShared == true;
        }
      }
      
      // =============================================
      // FRIENDS LIST
      // =============================================
      match /friends/{friendId} {
        allow read, write: if isOwner(userId);
        // Friend can read their own entry (to see permissions granted)
        allow read: if request.auth.uid == friendId;
      }
      
      // =============================================
      // IMPORTS (copied data from friends)
      // =============================================
      match /imports/{importId} {
        allow read, write: if isOwner(userId);
      }
    }
    
    // =============================================
    // FRIEND REQUESTS (global for discovery)
    // =============================================
    match /friendRequests/{requestId} {
      allow read: if isAuthenticated() && 
        (resource.data.fromUserId == request.auth.uid || 
         resource.data.toUserId == request.auth.uid);
      allow create: if isAuthenticated() && 
        request.resource.data.fromUserId == request.auth.uid;
      allow update: if isAuthenticated() && 
        resource.data.toUserId == request.auth.uid;
      allow delete: if isAuthenticated() && 
        (resource.data.fromUserId == request.auth.uid || 
         resource.data.toUserId == request.auth.uid);
    }
  }
}
```

---

## Sharing Feature Workflows

### Adding a Friend

```
1. User A searches for User B (by email or username)
2. User A sends friend request → creates /friendRequests/{id}
3. User B sees pending request
4. User B accepts → 
   - Update /friendRequests/{id}.status = 'accepted'
   - Create /users/{A}/friends/{B} with default permissions
   - Create /users/{B}/friends/{A} with default permissions
5. Both users now see each other in friends list
```

### Sharing a Player

```
1. User A has Player "Mike" at /users/{A}/players/{mikeId}
2. User A toggles isShared = true
3. User B (friend) can now query /users/{A}/players where isShared == true
4. User B sees "Mike" in "Friends' Players" view
5. User B can view Mike's notes, ranges, etc. (read-only by default)
```

### Copying/Importing Shared Data

```
1. User B views User A's shared Player "Mike"
2. User B clicks "Import to My Players"
3. System creates /users/{B}/imports/{importId} with:
   - sourceUserId: A
   - sourceType: 'player'
   - sourceId: mikeId
   - importedAt: now
   - data: { ...snapshot of Mike's data }
4. User B can now edit their imported copy independently
5. Original stays unchanged in User A's data
```

### Future: Collaborative Mode

```
1. User A grants User B "collaborative" permission on Player "Mike"
2. Both users can edit the same player document
3. Changes sync in real-time (or via merge logic)
4. Conflict resolution: last-write-wins OR show both notes
```

---

## Migration Strategy

### Chosen Approach: Fresh Start

Since:
- Only one user (developer) currently
- Data volume is minimal
- New structure is significantly different

**Decision**: Delete all existing Firestore data and implement new structure from scratch.

### Steps

1. **Backup existing data** (optional, for reference)
   - Export via Firebase Console or `firebase firestore:export`

2. **Delete all collections** in Firebase Console:
   - `hands`
   - `playerRanges`
   - `players`
   - `sessions`
   - Keep `users` (just user profile)
   - Keep `friendRequests` (structure is fine)

3. **Update all Firebase services** to use new paths

4. **Update security rules** with new structure

5. **Test thoroughly**

---

## Implementation Checklist

### Phase 1: Firebase Services

- [ ] `services/firebase/players.ts` → `/users/{userId}/players`
- [ ] `services/firebase/ranges.ts` → Merge into players (embed ranges)
- [ ] `services/firebase/sessions.ts` → `/users/{userId}/sessions`
- [ ] `services/firebase/hands.ts` → `/users/{userId}/sessions/{sessionId}/hands`
- [ ] `services/firebase/friends.ts` → New service for friend management

### Phase 2: Hooks

- [ ] `hooks/usePlayer.ts` → Update collection paths
- [ ] `hooks/useRange.ts` → Read/write from player document
- [ ] `hooks/useSession.ts` → Update collection paths
- [ ] `hooks/useHands.ts` → Update to nested path

### Phase 3: Local Storage & Sync

- [ ] `services/localStorage.ts` → Update data structure
- [ ] `services/sync.ts` → Update sync logic for new paths

### Phase 4: Security Rules

- [ ] Deploy new `firestore.rules`
- [ ] Test owner access
- [ ] Test friend access (when implemented)

---

## Benefits Summary

### Performance & Cost

| Metric | Old (Flat) | New (Subcollections) |
|--------|------------|----------------------|
| Query efficiency | Scan all, filter | Direct access |
| Reads per query | O(n) all docs | O(1) user's docs |
| Indexes needed | Many composite | Fewer, simpler |
| Monthly cost (10K users) | ~$200-400 | ~$50-100 |

### Developer Experience

| Aspect | Old | New |
|--------|-----|-----|
| Security rules | Check `createdBy` everywhere | Path-based, simple |
| Query patterns | Always filter by user | Collection scoped to user |
| Data locality | Scattered | All under `/users/{userId}` |
| GDPR deletion | Multiple queries | One recursive delete |

### Future Features (Sharing)

| Feature | Old Structure | New Structure |
|---------|---------------|---------------|
| Share with friends | Complex, insecure | Built-in via `isShared` flag |
| View friend's data | Would need new collection | Security rules handle it |
| Import/copy data | Manual | `/imports` subcollection |
| Collaborative edit | Very complex | Planned via permissions |
