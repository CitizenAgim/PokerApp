# Range Sharing Feature Implementation Plan

## Overview

Add the ability for users to share player ranges with their friends. This feature allows a user to send all ranges associated with a player profile to a friend. The recipient can then either copy the ranges to an existing player in their database or create a new player with the shared information.

**Important**: Only ranges are shared, NOT notes or personal information.

### Privacy & Compliance Rationale

Notes are explicitly **excluded** from sharing to ensure compliance with:

1. **GDPR (General Data Protection Regulation)**
   - Notes may contain personal opinions, identifiable information about real people
   - Sharing notes without consent could constitute unauthorized processing of personal data
   - Ranges are abstract statistical data with no personal information

2. **Apple App Store Guidelines**
   - Section 5.1.1: Apps must protect user privacy and not share personal data without consent
   - Notes could contain sensitive observations about individuals

3. **Google Play Developer Policy**
   - User Data policy: Apps must be transparent about data sharing
   - Personal information requires explicit consent before sharing

**By only sharing ranges (pure statistical/strategic data), we avoid any privacy concerns while still enabling valuable collaboration.**

---

## User Flow

### Sending a Range

1. User navigates to a **Player's Profile** (Player Detail screen)
2. User taps a **"Share Ranges"** button
3. A modal appears showing the user's friends list
4. User selects a friend to share with
5. Confirmation: "Share [Player Name]'s ranges with [Friend Name]?"
6. On confirm, the range share is sent

### Receiving a Range

1. In the **Friends** screen, friends with pending range shares show a **notification badge** (e.g., a small icon/dot)
2. User taps on the friend item to see the pending shares
3. A **"Shared Ranges"** modal or screen appears showing:
   - Player name
   - Number of defined ranges
   - Preview of which positions/actions have ranges
   - Sent date
4. User can choose to:
   - **"Copy to Existing Player"** → Opens player picker to select a player
   - **"Create New Player"** → Creates a new player with the shared name and ranges
   - **"Dismiss"** → Deletes the share request without action

---
‹
## Data Model

### New Firestore Collection: `rangeShares`

```
rangeShares/{shareId}
├── id: string                      // Auto-generated document ID
├── fromUserId: string              // Sender's user ID
├── fromUserName: string            // Sender's display name (denormalized)
├── toUserId: string                // Recipient's user ID
├── toUserName: string              // Recipient's display name (denormalized)
├── playerName: string              // Name of the player whose ranges are being shared
├── ranges: Record<string, Range>   // The actual range data (sparse storage)
├── rangeKeys: string[]             // List of range keys for preview (e.g., ["early_open-raise", "late_3bet"])
├── rangeCount: number              // Number of defined ranges (for quick display)
├── createdAt: Timestamp
```

### Why This Structure?

1. **Separate collection**: Allows efficient querying for pending shares per user
2. **Denormalized names**: Reduces reads (no need to fetch user docs for display)
3. **Embedded ranges**: The range data is copied at share time (snapshot), not linked
4. **No status field**: Shares are deleted immediately after accept/decline (saves storage)
5. **rangeKeys array**: Enables showing which positions/actions are included without parsing ranges
6. **rangeCount**: Quick count display without parsing

---

## UI Components

### 1. Share Button on Player Detail Screen

**Location**: [app/player-details/[id].tsx](../app/player-details/[id].tsx) (or similar)

Add a "Share Ranges" button in the header or action bar:
```
┌────────────────────────────────────┐
│  ← Player Name               [⋮]  │  ← Menu or share icon
└────────────────────────────────────┘
```

Or as a dedicated button in the player detail view.

### 2. Friend Selection Modal

**New Component**: `ShareRangesModal.tsx`

```
┌────────────────────────────────────┐
│           Share Ranges             │
│         with a Friend              │
├────────────────────────────────────┤
│  Select a friend:                  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 👤 Mike T.          [Select] │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ 👤 Lisa K.          [Select] │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Cancel]                          │
└────────────────────────────────────┘
```

### 3. Friend Item with Share Notification

**Modify**: [app/(main)/friends/index.tsx](../app/(main)/friends/index.tsx)

Add a notification indicator on friend items:

```
┌──────────────────────────────────────────┐
│  👤 Mike T.                    🔔 (2)    │  ← Badge showing 2 pending shares
│      ABC123                              │
└──────────────────────────────────────────┘
```

### 4. Pending Shares View

**New Screen or Modal**: `SharedRangesScreen.tsx` or `PendingSharesModal.tsx`

When tapping a friend with pending shares:

```
┌────────────────────────────────────┐
│  ← Shared from Mike T.             │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │  "Villain1" Ranges            │  │
│  │  8 ranges defined             │  │
│  │  • Early: Open-Raise, 3-Bet   │  │
│  │  • Late: Open-Raise, Call     │  │
│  │  Sent: Jan 2, 2026            │  │
│  │                               │  │
│  │  [Copy to Player] [Create New]│  │
│  │  [Dismiss]                    │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### 5. Player Selection Modal (for "Copy to Player")

**New Component**: `SelectPlayerModal.tsx`

```
┌────────────────────────────────────┐
│      Copy Ranges to Player         │
├────────────────────────────────────┤
│  🔍 Search players...              │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🔴 Villain1          [Select] │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ 🟢 Fish2             [Select] │  │
│  └──────────────────────────────┘  │
│                                    │
│  ℹ️ Only EMPTY positions will be  │
│     filled. Your existing ranges   │
│     will NOT be changed.           │
│                                    │
│  [Cancel]                          │
└────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Backend Foundation

- [ ] Create `RangeShare` TypeScript type in `types/friends.ts` or new `types/sharing.ts`
- [ ] Create `services/firebase/rangeSharing.ts` with:
  - `sendRangeShare(fromUser, toUserId, playerName, ranges)` - creates or replaces share
  - `getPendingSharesForUser(userId)` - all pending shares received
  - `getPendingSharesFromFriend(userId, friendId)` - shares from specific friend
  - `getPendingSharesCount(userId)` - total count for Friends tab badge
  - `getPendingSharesCountByFriend(userId)` - count per friend for individual badges
  - `subscribeToPendingSharesCount(userId, callback)` - real-time total badge updates
  - `deleteRangeShare(shareId)` - removes share after accept/decline/dismiss
- [ ] Add Firestore security rules for `rangeShares` collection
- [ ] Add Firestore index for efficient queries

### Phase 2: Sending Ranges

- [ ] Create `useRangeSharing` hook in `hooks/useRangeSharing.ts`
- [ ] Create `ShareRangesModal` component
- [ ] Add "Share Ranges" button to player detail screen
- [ ] Implement friend selection and share sending flow
- [ ] Add success/error feedback (toast or alert)

### Phase 3: Receiving Ranges - Notification

- [ ] Modify `useFriends` hook to include pending shares count per friend
- [ ] Update friends list UI to show notification badges
- [ ] Subscribe to real-time updates for share count

### Phase 4: Receiving Ranges - View & Action

- [ ] Create `PendingSharesScreen` or modal to view shares from a friend
- [ ] Create `SelectPlayerModal` for "Copy to Player" flow
- [ ] Implement "Copy to Existing Player" functionality:
  - **Fill empty slots only** - shared ranges only added where player has no range
  - User's existing observations are NEVER overwritten
  - Show info message: "X new ranges added, Y skipped (you already have observations)"
- [ ] Implement "Create New Player" functionality:
  - Prompt user for player name (pre-fill with shared name)
  - Prompt user to select color
  - Copy all ranges to new player
- [ ] Implement "Dismiss" functionality
- [ ] Update local storage and sync after import

### Phase 5: Polish

- [ ] Add loading states for all async operations
- [ ] Add empty states (no pending shares)
- [ ] Add error handling and user feedback
- [ ] Add pull-to-refresh on pending shares list
- [ ] Consider adding share history (optional)

### Phase 6: Legal & Compliance Updates

- [ ] Update **Terms of Service** (`app/legal/terms.tsx` or equivalent):
  - Add section about range sharing between friends
  - Clarify that shared data is limited to statistical range data only
  - Note that notes/personal observations are never shared
  - User responsibility for ranges they choose to share

- [ ] Update **Privacy Policy** (`app/legal/privacy.tsx` or equivalent):
  - Add "Data Sharing with Friends" section
  - Specify what data can be shared: ranges only (position/action hand selections)
  - Specify what is NOT shared: notes, player colors, personal observations
  - Explain that sharing requires explicit user action (not automatic)
  - GDPR compliance: ranges contain no personal data about third parties
  - Data retention: shared ranges are deleted after recipient accepts/declines

---

## Files to Create

```
types/
└── sharing.ts                          # RangeShare type definitions

services/firebase/
└── rangeSharing.ts                     # Range sharing service

hooks/
└── useRangeSharing.ts                  # Hook for range sharing operations

components/sharing/
├── ShareRangesModal.tsx                # Modal to select friend and share
├── PendingSharesModal.tsx              # Modal showing pending shares from a friend
└── SelectPlayerModal.tsx               # Modal to select player for copying ranges

styles/sharing/
└── index.styles.ts                     # Styles for sharing components

app/(main)/friends/
└── shared-ranges.tsx                   # (Optional) Dedicated screen for viewing shares
```

## Files to Modify

```
app/player-details/[id].tsx             # Add "Share Ranges" button
  (or wherever player detail screen is located)

app/(main)/friends/index.tsx            # Add notification badge on friend items

hooks/useFriends.ts                     # Add pending shares count per friend

types/friends.ts                        # Export sharing types (or import from sharing.ts)

services/firebase/index.ts              # Export rangeSharing service

firestore.rules                         # Add rules for rangeShares collection

firestore.indexes.json                  # Add index for rangeShares queries

app/legal/terms.tsx                     # Update Terms of Service with range sharing

app/legal/privacy.tsx                   # Update Privacy Policy with data sharing details
```

---

## Security Rules

```javascript
// Range shares collection
match /rangeShares/{shareId} {
  // Users can read shares they sent or received
  allow read: if request.auth != null && 
    (resource.data.fromUserId == request.auth.uid || 
     resource.data.toUserId == request.auth.uid);
  
  // Users can create shares only as sender
  // Limit: max 20 pending shares per recipient (enforced in app layer)
  allow create: if request.auth != null && 
    request.resource.data.fromUserId == request.auth.uid;
  
  // Sender can update (for duplicate replacement)
  allow update: if request.auth != null && 
    resource.data.fromUserId == request.auth.uid;
  
  // Sender can delete pending shares, recipient can delete any
  allow delete: if request.auth != null && 
    (resource.data.fromUserId == request.auth.uid || 
     resource.data.toUserId == request.auth.uid);
}
```

---

## Firestore Indexes

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "rangeShares",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "toUserId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "rangeShares",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "toUserId", "order": "ASCENDING" },
    { "fieldPath": "fromUserId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "rangeShares",
  "queryScope": "COLLECTION", 
  "fields": [
    { "fieldPath": "fromUserId", "order": "ASCENDING" },
    { "fieldPath": "toUserId", "order": "ASCENDING" },
    { "fieldPath": "playerName", "order": "ASCENDING" }
  ]
}
```

The third index enables efficient duplicate detection when sending shares.

---

## Error Handling

| Scenario | User Message |
|----------|--------------|
| Not friends | "You can only share ranges with friends" |
| Player has no ranges | "This player has no ranges to share" |
| Network error | "Failed to send. Please check your connection." |
| Share limit reached | "This friend has too many pending shares. Ask them to clear some first." |
| Import failed | "Failed to import ranges. Please try again." |

---

## Confirmed Decisions

| Decision | Choice | Details |
|----------|--------|---------|
| **Merge vs Replace** | **Fill Empty Only** | When copying to existing player, shared ranges only fill empty slots. User's existing observations are never overwritten - only positions without ranges receive the shared data. |
| **Share limits** | **Max 20** | Maximum 20 pending shares per user to prevent abuse |
| **Duplicate detection** | **Replace** | If same player's ranges are shared to same friend again, replace the previous pending share |
| **Notification badges** | **Both** | Badge on Friends tab (total count) AND on individual friend items |
| **Range preview** | **Count + List** | Show count of ranges AND list of position/action combinations |
| **Player color** | **Not shared** | Only ranges are shared; recipient chooses their own color when creating/selecting player |

---

## Scalability & Cost Analysis

### Design for Scale (10,000+ users)

This feature is designed to scale efficiently:

1. **Sparse storage**: Ranges only store non-unselected hands (~85% size reduction)
2. **Document-per-share**: No growing arrays, predictable document size (~16KB avg)
3. **Efficient queries**: Indexed queries on `toUserId + status`
4. **Auto-cleanup**: Shares are deleted after import (not just marked accepted)
5. **20 share limit**: Prevents unbounded growth per user
6. **Duplicate replacement**: Prevents multiple pending shares for same player/friend combo

### Firestore Cost Estimate

| Metric | Per User/Month | 10,000 Users/Month |
|--------|----------------|---------------------|
| Reads | ~140 | ~1.4M |
| Writes | ~15 | ~150K |
| Storage | ~80KB peak | ~800MB peak |
| **Cost** | **~$0.0001** | **~$1-2 total** |

**Verdict**: ✅ Highly cost-effective. The feature adds negligible cost even at scale.

### Assumptions
- Average 20 friends per user
- ~5 shares sent/received per user per month
- ~8 ranges per share
- Daily app opens for real-time listener costs

---

## Summary

This feature enables collaborative poker study by allowing friends to share their player range analysis. The implementation:

- Uses a dedicated `rangeShares` collection for clean separation
- Snapshots the range data (not linked) for simplicity
- Shows notification badges on **both** Friends tab and individual friend items
- **Fills empty slots only** - never overwrites user's existing observations
- Only shares ranges (no notes, no color) for **GDPR/App Store compliance**
- **Replaces** duplicate shares to same friend for same player
- **Deletes** shares after action (no status tracking = less storage)
- **Max 20** pending shares per user

Ready to proceed when you give the go-ahead!
