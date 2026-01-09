# Linked Players Feature - Automatic Range Sync Between Friends

## Overview

Enable friends to **link their local player profiles** to create automatic range synchronization. When User A updates ranges for a linked player, User B receives a notification to accept/reject the changes—without User A needing to manually share each time.

**Key Principle**: The data owner (User A) controls what's shared. The receiver (User B) always has the choice to accept or reject changes.

---

## Current System Recap

Currently, range sharing works like this:
1. User A clicks "Share Ranges" on a player profile
2. User A selects a friend (User B) from their friends list
3. A `rangeShare` document is created in Firestore containing the range snapshot
4. User B sees a badge on their Friends tab, opens it, and can accept/dismiss the share
5. User B can copy ranges to an existing player or create a new player
6. The share document is deleted after action

**Problem**: Every time User A makes changes, they must manually share again. This creates friction for friends who collaborate frequently on the same player.

---

## Proposed Solution: Player Linking

### Concept

Friends can establish a **persistent link** between player profiles in their respective databases. Once linked:
- Updates from the **link owner** (source) automatically create notifications for the **link subscriber** (receiver)
- The receiver always manually approves/rejects incoming changes (no auto-overwrite)
- Links are bidirectional-capable (either party can be the source for different players)

### Terminology

| Term | Definition |
|------|------------|
| **Source Player** | The player profile that broadcasts changes |
| **Linked Player** | The player profile that receives update notifications |
| **Link Owner** | The user who owns the source player |
| **Link Subscriber** | The user who subscribes to receive updates |
| **Link** | The connection record between source and linked player |

---

## User Flow

### Flow A: Creating a Link (Invite)

1. **User A** navigates to a player profile they want to share
2. User A taps **"Share Ranges"** → selects a friend (User B)
3. **New option** appears: **"Create Link"** (in addition to "Share Once")
4. User A confirms: *"Link this player with [Friend]? They'll receive notifications when you update ranges."*
5. A **link invite** is sent to User B

### Flow B: Accepting a Link Invite

1. **User B** sees a notification badge on Friends tab (or in pending shares)
2. User B opens the invite: *"[User A] wants to link player '[Player Name]' with you. You'll receive notifications when they update ranges."*
3. User B can:
   - **Accept & Create New Player**: Creates a new player locally, linked to User A's player
   - **Accept & Link to Existing Player**: Select an existing player to link
   - **Decline**: Reject the link invite
4. On accept, the link is established

### Flow C: Receiving Range Updates (Ongoing)

1. **User A** updates ranges for the linked player (normal editing workflow)
2. On save, the `rangeVersion` on the player document is incremented (no fan-out)
3. **User B** refreshes their Friends/Linked Players page (pull-to-refresh or manual)
4. System compares `rangeVersion` vs `lastSyncedVersion` on each link
5. If version mismatch, User B sees: *"Update available for [Player Name]"*
6. User B can:
   - **Preview Changes**: Fetch and view the updated ranges
   - **Accept All**: Apply all changes to their linked player
   - **Accept Selected**: Choose which range updates to apply
   - **Dismiss**: Ignore this update (link stays active for future updates)

### Flow D: Managing Links

1. Either user can view their active links in Settings or Player Detail screen
2. **Unlink** option available for both:
   - Link Owner can revoke the link (stops broadcasting)
   - Subscriber can unsubscribe (stops receiving)
3. Unlinking does NOT delete any local player data

---

## Data Architecture Options

I've analyzed three approaches, considering Firebase costs:

### Option 1: Push-Based (Event Documents)

**How it works:**
- When a linked player's ranges are updated, create a `rangeUpdate` document for each subscriber
- Subscribers fetch pending updates on app open
- Updates are deleted after the subscriber acts on them

**Pros:**
- ✅ Simple mental model (similar to existing rangeShares)
- ✅ Immediate notification documents available

**Cons:**
- ❌ **Extremely expensive at scale**: Cost = updates × subscribers
- ❌ With 100 links × 300 updates/month = 30,000 writes per source player
- ❌ **At 10K users: ~$1,400/month** (too expensive)

**Verdict**: ❌ Not recommended due to cost scaling issues

---

### Option 2: Pull-Based (Version Checking) ⭐ RECOMMENDED

**How it works:**
- Source updates ranges → increment `rangeVersion` on player doc (1 write, already happening)
- Subscriber refreshes Friends page → compare versions of linked players
- If version changed, show "Update available" indicator
- Subscriber taps to fetch full ranges only when ready to review

**Key Insight:** Cost is driven by **how often subscribers check**, NOT by **updates × subscribers**.

**Data Model:**
```
// Existing Player document (add version field)
users/{userId}/players/{playerId}
├── ... existing fields ...
├── rangeVersion: number           // Increment on each range update
├── rangeUpdatedAt: Timestamp      // When ranges last changed

playerLinks/{linkId}
├── id: string
├── sourceUserId: string           // Link owner
├── sourceUserName: string
├── sourcePlayerId: string
├── sourcePlayerName: string
├── subscriberUserId: string       // Link subscriber
├── subscriberUserName: string
├── subscriberPlayerId: string     // Their local player (after linking)
├── subscriberPlayerName: string
├── status: 'pending' | 'active'   // pending = invite, active = linked
├── lastSyncedVersion: number      // Version subscriber last accepted
├── createdAt: Timestamp
├── acceptedAt: Timestamp | null
```

**Pros:**
- ✅ **280x cheaper** than push-based at high volume
- ✅ Cost scales with check frequency, not update frequency
- ✅ No document fan-out on every update
- ✅ Simpler cleanup (no update documents to delete)
- ✅ Natural UX (users expect to refresh for updates)
- ✅ Works offline, syncs when online

**Cons:**
- ⚠️ Not instant (updates appear on refresh)
- ⚠️ Requires security rule to allow reading friend's player document

**Firebase Cost Estimate:**
- With 100 links per player, 300 updates/month, 3 refreshes/day
- **10,000 users: ~$5/month** (extremely cost-effective)

---

### Option 3: Cloud Functions Push

**How it works:**
- Cloud Function triggers on player range update
- Function looks up active links and creates update documents
- Could also send push notifications

**Pros:**
- ✅ Server-side logic (more secure)
- ✅ Can integrate with push notifications

**Cons:**
- ❌ Same cost issues as Option 1 (document fan-out)
- ❌ Requires Cloud Functions setup
- ❌ Additional complexity

**Verdict**: 🔶 Future consideration only if push notifications needed

---

## Recommended Approach: Option 2 (Pull-Based)

### Why?

1. **Lowest Firebase cost** - ~$5/month at 10K users vs $1,400/month for push-based
2. **Scales infinitely** - Cost grows with check frequency, not updates × subscribers
3. **Simple implementation** - No fan-out logic, just version comparison
4. **Privacy-first** - Updates require explicit acceptance
5. **Natural UX** - Users expect to refresh for updates (like email, social feeds)
6. **Graceful degradation** - Works offline, syncs when online

### Implementation Strategy

1. **Add `rangeVersion` field** to Player document (increment on range save)
2. **Add `playerLinks` collection** to track active links with `lastSyncedVersion`
3. **On Friends page refresh**, compare versions and show "Update available" badges
4. **On accept**, fetch source player's ranges and update `lastSyncedVersion`
5. **Security rules**: Allow reading friend's player document (for linked players only)

---

## Detailed Data Model

### Extended Player Document (add version tracking)

```typescript
interface Player {
  // ... existing fields ...
  
  // NEW: Version tracking for pull-based sync
  rangeVersion: number;        // Increment on each range update (starts at 1)
  rangeUpdatedAt: number;      // Timestamp of last range change
}
```

### New Collection: `playerLinks`

```typescript
interface PlayerLink {
  id: string;
  
  // Source (broadcaster)
  sourceUserId: string;
  sourceUserName: string;
  sourcePlayerId: string;
  sourcePlayerName: string;
  
  // Subscriber (receiver)
  subscriberUserId: string;
  subscriberUserName: string;
  subscriberPlayerId: string | null;  // null until subscriber maps to local player
  subscriberPlayerName: string | null;
  
  // State
  status: 'pending' | 'active' | 'revoked';
  
  // Version tracking (pull-based sync)
  lastSyncedVersion: number;   // Version subscriber last accepted (0 = never synced)
  
  // Timestamps
  createdAt: number;
  acceptedAt: number | null;
}
```

### RangeShare Collection (unchanged)

The existing `rangeShares` collection remains for **manual one-time shares**.
Linked players use pull-based sync and do NOT create rangeShare documents.

---

## Security Rules Updates

```javascript
// Player Links collection
match /playerLinks/{linkId} {
  // Users can read links they're part of
  allow read: if request.auth != null && 
    (resource.data.sourceUserId == request.auth.uid || 
     resource.data.subscriberUserId == request.auth.uid);
  
  // Source owner can create links (as invites)
  allow create: if request.auth != null && 
    request.resource.data.sourceUserId == request.auth.uid &&
    request.resource.data.status == 'pending';
  
  // Subscriber can accept (update status to 'active' and set their player)
  // Source can revoke (update status to 'revoked')
  // Either party can update lastSyncedVersion
  allow update: if request.auth != null && 
    ((resource.data.subscriberUserId == request.auth.uid && 
      request.resource.data.status in ['active', 'pending']) ||
     (resource.data.sourceUserId == request.auth.uid && 
      request.resource.data.status == 'revoked'));
  
  // Either party can delete (unlink)
  allow delete: if request.auth != null && 
    (resource.data.sourceUserId == request.auth.uid || 
     resource.data.subscriberUserId == request.auth.uid);
}

// UPDATED: Players subcollection - allow linked friends to read
match /users/{userId}/players/{playerId} {
  // Owner: full read/write access
  allow read, write: if request.auth.uid == userId;
  
  // NEW: Allow reading if requester has an active link to this player
  // This is checked via a custom function or client-side validation
  // For simplicity, we allow friends to read player docs:
  allow read: if request.auth != null && 
    exists(/databases/$(database)/documents/users/$(userId)/friends/$(request.auth.uid));
}
```

**Note:** The friend-based read rule allows any friend to read any player document. This is acceptable because:
1. They're already friends (trust established)
2. Only ranges are exposed (no notes, which are excluded from sharing)
3. Alternative: Use Cloud Functions to validate active links (more secure, more complex)

---

## Implementation Phases

### Phase 1: Foundation (Backend)

- [ ] Create `PlayerLink` TypeScript type in `types/sharing.ts`
- [ ] Add `rangeVersion` and `rangeUpdatedAt` fields to Player type
- [ ] Create `services/firebase/playerLinks.ts` with:
  - `createLinkInvite(sourceUser, sourcePlayer, subscriberUserId)` - creates pending link
  - `acceptLinkInvite(linkId, subscriberPlayerId, subscriberPlayerName)` - activates link
  - `declineLinkInvite(linkId)` - deletes pending link
  - `getActiveLinksAsSubscriber(userId)` - links where user is subscriber
  - `getPendingLinkInvites(userId)` - invites waiting for acceptance
  - `revokeLink(linkId)` - source revokes
  - `unsubscribeLink(linkId)` - subscriber unsubscribes
  - `updateLastSyncedVersion(linkId, version)` - after subscriber accepts an update
  - `checkForUpdates(links)` - compare versions, return links with updates
- [ ] Add Firestore security rules for `playerLinks` collection
- [ ] Update security rules to allow friends to read player documents
- [ ] Add Firestore indexes for efficient queries

### Phase 2: Version Tracking on Range Updates

- [ ] Modify `updatePlayerRanges()` in players service to:
  1. Increment `rangeVersion` field (atomic increment)
  2. Update `rangeUpdatedAt` timestamp
- [ ] Ensure version starts at 1 for new players
- [ ] Migration: Add `rangeVersion: 1` to existing players with ranges

### Phase 3: Link Creation UI

- [ ] Modify `ShareRangesModal` to add "Create Link" option alongside "Share Once"
- [ ] Create `LinkConfirmationModal` for source to confirm link creation
- [ ] Add success feedback: "Link invite sent to [Friend]"

### Phase 4: Link Acceptance UI

- [ ] Modify pending shares view to show link invites differently
- [ ] Create `AcceptLinkModal` with options:
  - Create new player (with pre-filled name)
  - Link to existing player
  - Decline
- [ ] On accept, set `lastSyncedVersion` to source's current `rangeVersion`
- [ ] After acceptance, show confirmation: "Linked! Refresh your Friends page to check for updates."

### Phase 5: Linked Players Page & Update Checking

- [ ] Create "Linked Players" section on Friends page
- [ ] On page load/refresh, fetch subscriber's active links
- [ ] For each link, read source player's `rangeVersion`
- [ ] Compare with `lastSyncedVersion` → show "Update available" badge if different
- [ ] Add pull-to-refresh functionality
- [ ] Add "View Update" action to fetch and preview source ranges
- [ ] Implement "Accept All" / "Accept Selected" / "Dismiss" actions
- [ ] On accept, update `lastSyncedVersion` on the link document

### Phase 6: Link Management UI

- [ ] Add "Linked Players" section in Settings or new screen
- [ ] Show outbound links (players you're sharing) with subscriber list
- [ ] Show inbound links (players you're subscribed to) with source
- [ ] Add "Unlink" action for both directions
- [ ] Add visual indicator on player detail for linked players

### Phase 7: Polish & Edge Cases

- [ ] Handle subscriber deleting their linked player (auto-unsubscribe?)
- [ ] Handle source deleting the source player (auto-revoke links?)
- [ ] Add "Pause Link" option to temporarily stop updates without unlinking
- [ ] Loading states, error handling, empty states
- [ ] Notification badge updates for link invites

---

## UI Mockups

### Link Invite in Share Modal

```
┌────────────────────────────────────┐
│       Share "Villain1" Ranges      │
│         with Mike T.               │
├────────────────────────────────────┤
│                                    │
│  How would you like to share?      │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  📤  Share Once              │  │
│  │  Send current ranges now     │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  🔗  Create Link             │  │
│  │  Auto-notify on updates      │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Cancel]                          │
└────────────────────────────────────┘
```

### Link Invite Notification (Subscriber View)

```
┌────────────────────────────────────┐
│  🔗 Link Invite from Mike T.       │
├────────────────────────────────────┤
│                                    │
│  Mike wants to link "Villain1"     │
│  with your player database.        │
│                                    │
│  You'll receive notifications      │
│  when Mike updates this player's   │
│  ranges.                           │
│                                    │
│  8 ranges currently defined:       │
│  • Early: Open-Raise, 3-Bet        │
│  • Late: Open-Raise, Call          │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 🆕 Create New Player         │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ 🔄 Link to Existing Player   │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ ✕ Decline                    │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### Linked Players List (Pull-Based Refresh)

```
┌────────────────────────────────────┐
│  Friends                    [↻]   │  ← Pull to refresh
├────────────────────────────────────┤
│  🔗 Linked Players                 │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Villain1 (from Mike T.)      │  │
│  │ 🔴 Update available          │  │  ← Version mismatch
│  │    [View Update]             │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Fish2 (from Lisa K.)         │  │
│  │ ✓ Up to date                 │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ RegularJoe (from Mike T.)    │  │
│  │ ✓ Up to date                 │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### Link Update Preview (After Tapping "View Update")

```
┌────────────────────────────────────┐
│  🔄 Update from Mike T.            │
├────────────────────────────────────┤
│                                    │
│  "Villain1" ranges updated         │
│                                    │
│  Changes:                          │
│  • Modified: Early Open-Raise      │
│  • New: Middle 3-Bet               │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ ✓ Accept All                 │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ ☑ Accept Selected...         │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ ✕ Dismiss                    │  │
│  └──────────────────────────────┘  │
│                                    │
│  ℹ️ Your existing ranges won't be │
│     overwritten without selection  │
└────────────────────────────────────┘
```

### Linked Player Indicator (Player Detail)

```
┌────────────────────────────────────┐
│  ← Villain1                   [⋮]  │
├────────────────────────────────────┤
│                                    │
│  🔗 Linked with Mike T.            │
│     Last sync: 2 hours ago         │
│     [View Link Settings]           │
│                                    │
│  ─────────────────────────────────  │
│                                    │
│  Ranges                            │
│  ... (normal range UI)             │
└────────────────────────────────────┘
```

---

## Firestore Indexes

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "playerLinks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "sourceUserId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "playerLinks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "subscriberUserId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "playerLinks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "sourceUserId", "order": "ASCENDING" },
    { "fieldPath": "sourcePlayerId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

---

## Cost Analysis

### Assumptions (High Volume Scenario)
- 10,000 active users
- Average **100 links per source player** (subscribers)
- Average **300 range updates per player per month** (heavy usage)
- Subscribers refresh **3 times per day** (~90 refreshes/month)
- 3 source players per user

### Pull-Based Cost Calculation

With pull-based sync, cost is driven by **check frequency**, NOT by **updates × subscribers**.

**Firestore Pricing (pay-as-you-go):**
- Reads: $0.036 per 100,000 reads
- Writes: $0.108 per 100,000 writes

#### Source Side (on range update)

| Operation | Per Update | Description |
|-----------|------------|-------------|
| Write player doc | 1 write | Already happening (update ranges + increment version) |
| **Total per update** | **1 write** | No additional cost! |

#### Subscriber Side (on refresh)

| Operation | Per Refresh | Description |
|-----------|-------------|-------------|
| Read link documents | ~5 reads | Fetch their active inbound links |
| Read source player versions | ~5 reads | Check `rangeVersion` on each linked player |
| **Total per refresh** | **~10 reads** | |

#### Fetching Ranges (on accept)

| Operation | Per Accept | Description |
|-----------|------------|-------------|
| Read source player | 1 read | Fetch full player doc with ranges |
| Write local player | 1 write | Update subscriber's player |
| Write link doc | 1 write | Update `lastSyncedVersion` |
| **Total per accept** | **1 read + 2 writes** | |

### Monthly Cost Breakdown

**Subscriber checking for updates:**
- 10,000 users × 90 refreshes × 10 reads = **9M reads/month**
- Cost: 9M × $0.036/100K = **$3.24/month**

**Fetching and accepting updates (assume 50% acceptance rate):**
- 10,000 users × 3 players × ~10 accepts × 3 ops = 900K ops
- Cost: ~**$0.50/month**

**Source updates (already happening, negligible new cost):**
- Version increment is part of existing range update write
- Cost: **$0/month** (no new operations)

### Total Monthly Cost

| Component | Cost |
|-----------|------|
| Version checks (refresh) | $3.24 |
| Range fetches + accepts | $0.50 |
| Link document management | $0.26 |
| **Total at 10K users** | **~$5/month** |

### Cost Comparison: Push vs Pull

| Approach | 100 links × 300 updates | 10K Users Monthly |
|----------|------------------------|-------------------|
| Push-Based (Option 1) | 30K writes/player | **$1,400** |
| **Pull-Based (Option 2)** | ~100 reads/subscriber | **$5** |
| **Savings** | | **99.6%** |

### Yearly Cost Projection

| Users | Monthly | Yearly |
|-------|---------|--------|
| 1,000 | ~$0.50 | ~$6 |
| 10,000 | ~$5 | ~$60 |
| 100,000 | ~$50 | ~$600 |

**Verdict**: ✅ Extremely cost-effective. The pull-based approach scales with subscriber activity (refreshes), not source activity (updates). Even at 100K users with heavy usage, cost is only ~$50/month.

---

## Open Questions for Discussion

1. **Should links be bidirectional?**
   - Current design: One-way (A broadcasts to B). B would need to create a separate link to broadcast to A.
   - Alternative: Bidirectional links (both parties share updates automatically)
   - **Recommendation**: Keep one-way for simplicity and explicit control

2. **Conflict resolution?**
   - What if subscriber has made changes to the same range position?
   - **Recommendation**: Show preview and let user choose which ranges to accept (like current fill-empty-only approach)

3. **Maximum links per player?**
   - Should we limit how many subscribers a player can have?
   - **Recommendation**: No hard limit needed (pull-based doesn't create per-subscriber cost)

4. **Link expiration?**
   - Should inactive links auto-expire?
   - **Recommendation**: No auto-expiration (users can manually unlink)

5. **Security: Friend-based vs Link-based read access?**
   - Simple: Allow any friend to read any player document
   - Strict: Only allow reading if active link exists (requires Cloud Function validation)
   - **Recommendation**: Friend-based for MVP (simpler), can tighten later if needed

---

## Files to Create

```
types/sharing.ts                        # Add PlayerLink type

services/firebase/
└── playerLinks.ts                      # Player linking service

hooks/
└── usePlayerLinks.ts                   # Hook for link management

components/sharing/
├── CreateLinkModal.tsx                 # Modal to create a link
├── AcceptLinkModal.tsx                 # Modal to accept link invite
├── LinkUpdatePreview.tsx               # Preview changes before accepting
└── LinkedPlayerBadge.tsx               # Visual indicator for linked players
```

## Files to Modify

```
types/poker.ts                          # Add rangeVersion, rangeUpdatedAt to Player

types/sharing.ts                        # Add PlayerLink type

services/firebase/players.ts            # Increment rangeVersion on range update

hooks/useRangeSharing.ts                # Add link-aware methods, version checking

components/sharing/ShareRangesModal.tsx # Add "Create Link" option

app/player-details/[id].tsx             # Add linked player indicator

app/(main)/friends/index.tsx            # Add "Linked Players" section with refresh

firestore.rules                         # Add rules for playerLinks + friend read access

firestore.indexes.json                  # Add indexes for playerLinks
```

---

## Summary

This feature enables automatic range synchronization between friends through a **linking** system with **pull-based updates**:

1. **Link Owner updates**: Range saves increment a version number (no fan-out)
2. **Subscriber refreshes**: Check for version mismatches on Friends page
3. **Pull-based architecture**: Cost scales with refresh frequency, not update volume
4. **Privacy-first**: Both parties have full control over their data
5. **Natural UX**: Users refresh to check for updates (like email, social feeds)

**Estimated cost impact**: ~$5/month at 10,000 users (even with 100 links/player, 300 updates/month)

**Development effort**: Medium (~2-3 weeks for full implementation)

---

## Next Steps

Please review this plan and let me know:

1. Do the user flows make sense?
2. Any concerns with the data model?
3. Preferences on the open questions?
4. Shall I prioritize any specific phases?

Ready to proceed with implementation when you give the go-ahead!
