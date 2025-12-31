# Friends Feature Implementation Plan

## Overview
Add a social "Friends" feature to PokerApp that allows users to connect with other players. This lays the groundwork for future sharing capabilities (notes, ranges).

---

## Confirmed Decisions

| Question | Decision |
|----------|----------|
| Friend Code Format | Short 6-char alphanumeric (`A3X9K2`) |
| Username Search | No - friend codes only |
| Friend Limits | Yes, cap at 100 friends |
| Blocking | No |
| Request Expiry | No auto-expiry (manual decline only) |
| Auto-accept | No - requires acceptance |

---

## 1. UI Changes

### Bottom Tab Bar
Add a new "Friends" tab between **Results** and **Settings**:

```
Home | Players | Sessions | Results | [Friends] | Settings
```

- **Icon**: `people-circle` (Ionicons)
- **Badge**: Show notification count for pending friend requests

---

## 2. Friend Code Generation System

### Format
- **6 alphanumeric characters** (uppercase letters + digits)
- **Character set**: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 chars)
  - Excludes confusing characters: `0/O`, `1/I/L` to avoid typos
- **Example**: `A3X9K2`, `HN7P4M`, `2WK8RJ`

### Capacity Analysis
```
Characters: 32 (A-Z minus O,I,L + 2-9)
Length: 6 characters
Total combinations: 32^6 = 1,073,741,824 (over 1 billion)

For 1 million users:
- Usage: 0.093% of total space
- Collision probability: Extremely low
- Even at 10 million users: Only 0.93% usage
```

**✅ 1 billion+ codes is more than enough for millions of users.**

### Uniqueness Guarantee

The code generation uses a **check-and-retry** approach with Firestore:

```typescript
async function generateUniqueFriendCode(): Promise<string> {
  const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CODE_LENGTH = 6;
  const MAX_ATTEMPTS = 10;
  
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // 1. Generate random code
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }
    
    // 2. Check if code already exists in Firestore
    const existingUser = await db
      .collection('users')
      .where('friendCode', '==', code)
      .limit(1)
      .get();
    
    // 3. If not found, code is unique - return it
    if (existingUser.empty) {
      return code;
    }
    
    // 4. If found, retry with new code
    console.log(`Code collision on attempt ${attempt + 1}, retrying...`);
  }
  
  throw new Error('Failed to generate unique friend code after max attempts');
}
```

### Additional Safeguards

1. **Firestore Index**: Create index on `friendCode` field for fast lookups
2. **Unique Constraint**: Security rules prevent duplicate codes
3. **Transaction**: Use Firestore transaction when creating user to ensure atomicity
4. **Retry Logic**: Multiple attempts in case of rare collision

### When Codes Are Generated
- **New users**: Code generated at account creation
- **Existing users**: One-time migration to generate codes for users without one
- **Code is permanent**: Never changes (users can share it and it stays valid)

---

## 3. Database Model (Firestore)

### Updated User Document
```
users/{userId}
├── id: string
├── email: string
├── displayName: string
├── photoUrl?: string
├── friendCode: string          // NEW: Unique 6-char code (e.g., "A3X9K2")
├── friendsCount: number        // NEW: Track count for 100 limit
├── createdAt: number
```

### Friend Requests Collection
```
friendRequests/{requestId}
├── id: string
├── fromUserId: string
├── fromUserName: string        // Denormalized for display
├── fromUserCode: string        // Denormalized for display
├── toUserId: string
├── toUserName: string          // Denormalized for display
├── status: 'pending' | 'accepted' | 'declined'
├── createdAt: number
├── updatedAt: number
```

### Friends Subcollection (under each user)
```
users/{userId}/friends/{friendUserId}
├── userId: string
├── displayName: string         // Denormalized
├── friendCode: string          // Denormalized
├── addedAt: number
```

### Why This Structure?
1. **Friend requests as separate collection**: Easy to query all pending requests for a user
2. **Friends as subcollection**: Fast to load a user's friend list, scales well
3. **Denormalized data**: Reduces reads (we don't need to fetch user docs just to display names)
4. **friendsCount on user**: Quick check for 100-friend limit without counting subcollection

---

## 4. Finding Friends

### Method: Friend Code Only
- User enters a friend's 6-character code to send request
- **Case-insensitive**: `a3x9k2` matches `A3X9K2`
- **Pros**: Private, easy to share verbally/text, no email exposure
- **Cons**: Users need to exchange codes outside the app (acceptable tradeoff)

---

## 5. Friend Request Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│  User A     │────▶│  Friend Request │────▶│   User B    │
│  Sends      │     │  (pending)      │     │   Receives  │
└─────────────┘     └─────────────────┘     └─────────────┘
                            │
                 ┌──────────┴──────────┐
                 ▼                     ▼
          ┌──────────┐          ┌──────────┐
          │ Accepted │          │ Declined │
          └──────────┘          └──────────┘
                 │
                 ▼
    ┌─────────────────────────┐
    │ Create friend entries   │
    │ in BOTH users' lists    │
    │ Increment friendsCount  │
    └─────────────────────────┘
```

### Validation Rules
- Cannot send request to yourself
- Cannot send request if already friends
- Cannot send request if pending request already exists
- Cannot accept if either user has 100 friends (limit reached)

---

## 6. Notification System

### In-App Only (MVP)
- Badge count on Friends tab showing pending requests
- Notification list inside Friends screen
- Pull-to-refresh to check for new requests
- Real-time listener for pending requests count

Push notifications can be added later with Firebase Cloud Functions if needed.

---

## 7. Friends Screen Structure

```
┌────────────────────────────────────┐
│  Friends                    [+]    │  ← Add friend button
├────────────────────────────────────┤
│  🔔 Pending Requests (2)           │  ← Expandable section
│  ├── John D. wants to be friends   │
│  │   [Accept] [Decline]            │
│  └── Sarah M. wants to be friends  │
│       [Accept] [Decline]           │
├────────────────────────────────────┤
│  Your Friend Code: A3X9K2          │  ← Tap to copy
│  [Share Code]                      │
├────────────────────────────────────┤
│  My Friends (5/100)                │  ← Shows limit
│  ├── 👤 Mike T.                    │
│  ├── 👤 Lisa K.                    │
│  └── 👤 ...                        │
└────────────────────────────────────┘
```

---

## 8. Implementation Phases

### Phase 1: Foundation
- [ ] Add Friends tab to bottom navigation
- [ ] Create Friends screen (basic UI)
- [ ] Update User type with `friendCode` and `friendsCount` fields
- [ ] Implement friend code generation with uniqueness check
- [ ] Create migration for existing users (generate codes)
- [ ] Create Firestore security rules for friends data
- [ ] Add Firestore index on `friendCode` field

### Phase 2: Core Functionality
- [ ] Implement "Add Friend by Code" modal
- [ ] Create friend request service (send, accept, decline)
- [ ] Display pending friend requests (incoming)
- [ ] Display sent requests (outgoing) with cancel option
- [ ] Display friends list
- [ ] Add badge count for pending requests on tab
- [ ] Enforce 100 friend limit

### Phase 3: Polish
- [ ] Share friend code functionality (native share sheet)
- [ ] Copy friend code to clipboard with feedback
- [ ] Remove friend functionality with confirmation
- [ ] Empty states (no friends yet, no pending requests)
- [ ] Loading states and error handling
- [ ] Pull-to-refresh

### Phase 4: Future (Sharing Features)
- [ ] Share player notes with friends
- [ ] Share ranges with friends
- [ ] Push notifications for friend requests

---

## 9. Security Rules (Firestore)

```javascript
// Friend requests
match /friendRequests/{requestId} {
  // Users can read requests they sent or received
  allow read: if request.auth != null && 
    (resource.data.fromUserId == request.auth.uid || 
     resource.data.toUserId == request.auth.uid);
  
  // Users can create requests only as sender
  allow create: if request.auth != null && 
    request.resource.data.fromUserId == request.auth.uid &&
    request.resource.data.status == 'pending';
  
  // Only recipient can accept/decline, only sender can delete pending
  allow update: if request.auth != null && 
    resource.data.toUserId == request.auth.uid;
  
  allow delete: if request.auth != null && 
    resource.data.fromUserId == request.auth.uid &&
    resource.data.status == 'pending';
}

// Friends subcollection
match /users/{userId}/friends/{friendId} {
  allow read: if request.auth != null && 
    request.auth.uid == userId;
  
  // Write only through controlled operations (accept request)
  allow write: if request.auth != null && 
    request.auth.uid == userId;
}

// Prevent duplicate friend codes
match /users/{userId} {
  allow update: if request.auth != null && 
    request.auth.uid == userId &&
    // If friendCode is being set, ensure it doesn't change after initial set
    (!('friendCode' in resource.data) || 
     request.resource.data.friendCode == resource.data.friendCode);
}
```

---

## 10. Files to Create/Modify

### New Files
```
app/(main)/friends/
├── _layout.tsx          # Stack navigator for friends
├── index.tsx            # Main friends list screen
└── add.tsx              # Add friend by code screen

services/firebase/
└── friends.ts           # Friends service (CRUD operations)

hooks/
└── useFriends.ts        # Hook for friends data & operations

styles/friends/
└── index.styles.ts      # Styles for friends screens

types/
└── friends.ts           # Friend-related types
```

### Modified Files
```
app/(main)/_layout.tsx   # Add Friends tab to bottom nav
types/poker.ts           # Update User type with friendCode, friendsCount
services/firebase/index.ts # Export friends service
firestore.rules          # Add friends security rules
firestore.indexes.json   # Add index for friendCode queries
```

---

## 11. Error Handling

| Scenario | User Message |
|----------|--------------|
| Invalid code format | "Please enter a valid 6-character code" |
| Code not found | "No user found with this code" |
| Already friends | "You're already friends with this user" |
| Request already sent | "Friend request already sent" |
| Request to self | "You can't add yourself as a friend" |
| Friend limit reached (you) | "You've reached the 100 friend limit" |
| Friend limit reached (them) | "This user has reached their friend limit" |

---

## Summary

### Key Points
- **6-character alphanumeric codes** (32-char set, 1B+ combinations)
- **Uniqueness guaranteed** via Firestore check-and-retry
- **100 friend limit** tracked via `friendsCount` field
- **No auto-accept** - all requests require manual acceptance
- **No request expiry** - pending until accepted/declined
- **In-app notifications only** for MVP

Ready to proceed when you give the go-ahead!
