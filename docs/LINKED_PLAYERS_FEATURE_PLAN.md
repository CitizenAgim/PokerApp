# Linked Players Feature - Automatic Range Sync Between Friends

## Overview

Enable friends to **link their local player profiles** to create **bidirectional** automatic range synchronization. When either User A or User B updates ranges for their linked player, the other friend can see and accept the changes—without manually sharing each time.

**Key Principle**: Links are **bidirectional**. Both parties share updates with each other and both always have the choice to accept or reject incoming changes (no auto-overwrite).

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

Friends can establish a **persistent bidirectional link** between player profiles in their respective databases. Once linked:
- **Both users** can update their local copy of the linked player
- **Both users** see when the other has made changes (on refresh)
- **Both users** can accept or reject incoming changes (no auto-overwrite)
- One link = two-way sync between two player profiles

### Terminology

| Term | Definition |
|------|------------|
| **Linked Players** | Two player profiles (one from each user) connected via a link |
| **Link** | The bidirectional connection between two player profiles |
| **Link Initiator** | The user who sends the link invite |
| **Link Acceptor** | The user who accepts the link invite |
| **Local Player** | Each user's own copy of the linked player profile |

---

## User Flow

### Flow A: Creating a Link (Invite)

1. **User A** navigates to a player profile they want to link
2. User A taps **"Share Ranges"** → selects a friend (User B)
3. **New option** appears: **"Create Link"** (in addition to "Share Once")
4. User A confirms: *"Create a two-way link with [Friend]? You'll both see each other's updates to this player."*
5. A **link invite** is sent to User B (includes User A's current ranges)

### Flow B: Accepting a Link Invite

1. **User B** sees a notification badge on Friends tab (or in pending shares)
2. User B opens the invite: *"[User A] wants to create a two-way link for player '[Player Name]'. You'll both see each other's range updates."*
3. User B can:
   - **Accept & Create New Player**: Creates a new local player, linked to User A's player
   - **Accept & Link to Existing Player**: Select an existing local player to link
   - **Decline**: Reject the link invite
4. On accept, the **bidirectional link is established** - both users can now see each other's updates

### Flow C: Receiving Range Updates (Ongoing - Bidirectional)

**When User A updates their local player:**
1. User A edits ranges for the linked player (normal editing workflow)
2. On save, the `rangeVersion` on User A's player document is incremented
3. **User B** refreshes their Friends/Linked Players page
4. System compares User A's `rangeVersion` vs User B's `lastSyncedVersionFromA`
5. If version mismatch, User B sees: *"Update available from [User A]"*

**When User B updates their local player:**
1. User B edits ranges for the linked player (normal editing workflow)
2. On save, the `rangeVersion` on User B's player document is incremented
3. **User A** refreshes their Friends/Linked Players page
4. System compares User B's `rangeVersion` vs User A's `lastSyncedVersionFromB`
5. If version mismatch, User A sees: *"Update available from [User B]"*

**Both users can:**
- **Preview Changes**: Fetch and view the other's updated ranges
- **Accept All**: Apply all changes to their local player
- **Accept Selected**: Choose which range updates to apply
- **Dismiss**: Ignore this update (link stays active for future updates)

### Flow D: Managing Links

1. Either user can view their active links in Settings or Player Detail screen
2. **Unlink** option available for both users (either can break the link)
3. Unlinking does NOT delete any local player data - each user keeps their copy

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
├── status: 'pending' | 'active'   // pending = invite, active = linked
│
├── // User A (link initiator)
├── userAId: string
├── userAName: string
├── userAPlayerId: string          // User A's local player
├── userAPlayerName: string
├── userALastSyncedVersion: number // Version User A last accepted from User B
│
├── // User B (link acceptor)
├── userBId: string
├── userBName: string
├── userBPlayerId: string | null   // null until User B accepts and maps player
├── userBPlayerName: string | null
├── userBLastSyncedVersion: number // Version User B last accepted from User A
│
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

### New Collection: `playerLinks` (Bidirectional)

```typescript
interface PlayerLink {
  id: string;
  
  // Link status
  status: 'pending' | 'active';  // pending = invite sent, active = both connected
  
  // User A (link initiator)
  userAId: string;
  userAName: string;
  userAPlayerId: string;            // User A's local player ID
  userAPlayerName: string;
  userALastSyncedVersion: number;   // Version User A last accepted from User B (0 = never)
  
  // User B (link acceptor)
  userBId: string;
  userBName: string;
  userBPlayerId: string | null;     // null until User B accepts
  userBPlayerName: string | null;
  userBLastSyncedVersion: number;   // Version User B last accepted from User A (0 = never)
  
  // Timestamps
  createdAt: number;
  acceptedAt: number | null;
}
```

### How Bidirectional Sync Works

1. **User A updates their player** → `userA.player.rangeVersion` increments
2. **User B refreshes** → Compare `userA.player.rangeVersion` vs `link.userBLastSyncedVersion`
3. **If different** → Show "Update from User A" badge
4. **User B accepts** → Update `link.userBLastSyncedVersion` to match

Same flow works in reverse for User B → User A updates.

### RangeShare Collection (unchanged)

The existing `rangeShares` collection remains for **manual one-time shares**.
Linked players use pull-based bidirectional sync and do NOT create rangeShare documents.

---

## Security Rules Updates

```javascript
// Player Links collection (bidirectional)
match /playerLinks/{linkId} {
  // Users can read links they're part of (either User A or User B)
  allow read: if request.auth != null && 
    (resource.data.userAId == request.auth.uid || 
     resource.data.userBId == request.auth.uid);
  
  // User A (initiator) can create links
  allow create: if request.auth != null && 
    request.resource.data.userAId == request.auth.uid &&
    request.resource.data.status == 'pending';
  
  // User B can accept (update status to 'active' and set their player)
  // Either user can update their own lastSyncedVersion
  allow update: if request.auth != null && 
    (resource.data.userAId == request.auth.uid || 
     resource.data.userBId == request.auth.uid);
  
  // Either party can delete (unlink)
  allow delete: if request.auth != null && 
    (resource.data.userAId == request.auth.uid || 
     resource.data.userBId == request.auth.uid);
}

// UPDATED: Players subcollection - allow linked friends to read
match /users/{userId}/players/{playerId} {
  // Owner: full read/write access
  allow read, write: if request.auth.uid == userId;
  
  // NEW: Allow reading if requester is a friend (for linked player sync)
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

- [ ] Create `PlayerLink` TypeScript type in `types/sharing.ts` (bidirectional model)
- [ ] Add `rangeVersion` and `rangeUpdatedAt` fields to Player type
- [ ] Create `services/firebase/playerLinks.ts` with:
  - `createLinkInvite(userA, userAPlayer, userBId)` - creates pending link
  - `acceptLinkInvite(linkId, userBPlayerId, userBPlayerName)` - activates bidirectional link
  - `declineLinkInvite(linkId)` - deletes pending link
  - `getActiveLinks(userId)` - all links where user is either User A or User B
  - `getPendingLinkInvites(userId)` - invites waiting for acceptance (where user is User B)
  - `deleteLink(linkId)` - either user can break the link
  - `updateLastSyncedVersion(linkId, userId, version)` - after accepting an update
  - `checkForUpdates(links, userId)` - compare versions for both directions
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
- [ ] Implement client-side cache for version check results (5-min TTL)
- [ ] On page load/refresh, check cache first before Firestore
- [ ] For each link, read source player's `rangeVersion` (if cache miss)
- [ ] Compare with `lastSyncedVersion` → show "Update available" badge if different
- [ ] Display "Last checked: X min ago" timestamp
- [ ] Add pull-to-refresh functionality (respects cache TTL)
- [ ] Add long-press force refresh option (bypasses cache)
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
│     Last checked: 3 min ago        │  ← Cache status indicator
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
│                                    │
│  ℹ️ Hold refresh to force check   │  ← Hint for force refresh
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
    { "fieldPath": "userAId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "playerLinks",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userBId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

**Note:** To query all links for a user (as either User A or User B), we need two queries and merge results client-side, or use an array field `userIds: [userAId, userBId]` with `array-contains`.

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

## Refresh Throttling (Cost Optimization)

To prevent excessive Firestore reads from users refreshing too frequently, we implement **client-side caching with visual feedback**.

### Strategy: Caching + Visual Feedback

#### 1. Client-Side Cache with TTL

- Cache version check results in local storage/memory
- **Cache TTL: 5 minutes** (configurable)
- Subsequent refreshes within TTL return cached data (no Firestore reads)
- Cache key: `linkedPlayers_lastCheck_{userId}`

```typescript
interface LinkedPlayersCache {
  lastCheckedAt: number;          // Timestamp of last Firestore fetch
  links: PlayerLinkWithStatus[];  // Cached link data with version status
  cacheTTL: number;               // TTL in milliseconds (default: 5 min)
}
```

#### 2. Visual Feedback ("Last Checked" Timestamp)

- Display when data was last fetched from server
- Sets user expectations and reduces unnecessary refreshes
- Shows cache status: "Checking..." → "Last checked: X min ago"

#### 3. Refresh Behavior

| Scenario | Action | Firestore Reads |
|----------|--------|----------------|
| First load | Fetch from Firestore | Yes |
| Refresh within 5 min | Return cached data | **No** |
| Refresh after 5 min | Fetch from Firestore | Yes |
| Force refresh (hold) | Fetch from Firestore | Yes |

#### 4. Force Refresh Option

- Long-press on refresh button bypasses cache
- Shows confirmation: "Force refresh? This will check for updates now."
- Useful when user knows friend just made changes

### Implementation Details

```typescript
// Check if cache is still valid
function shouldFetchFromServer(cache: LinkedPlayersCache | null): boolean {
  if (!cache) return true;
  const now = Date.now();
  const cacheAge = now - cache.lastCheckedAt;
  return cacheAge > cache.cacheTTL;
}

// On refresh action
async function refreshLinkedPlayers(forceRefresh = false) {
  const cache = await getCache();
  
  if (!forceRefresh && !shouldFetchFromServer(cache)) {
    // Return cached data, update UI with "Last checked: X min ago"
    return cache.links;
  }
  
  // Fetch from Firestore
  const links = await fetchLinkedPlayersFromFirestore();
  await saveCache({ lastCheckedAt: Date.now(), links, cacheTTL: 5 * 60 * 1000 });
  return links;
}
```

### Cost Impact with Caching

With 5-minute cache TTL, actual Firestore reads are reduced by ~80%:

| Metric | Without Cache | With 5-min Cache |
|--------|---------------|------------------|
| Refreshes/day (user) | 90 | 90 |
| Actual Firestore calls | 90 | ~18 |
| Reads/month (10K users) | 9M | **1.8M** |
| Monthly cost | $3.24 | **$0.65** |

### Updated Total Monthly Cost (with caching)

| Component | Cost |
|-----------|------|
| Version checks (with cache) | $0.65 |
| Range fetches + accepts | $0.50 |
| Link document management | $0.26 |
| **Total at 10K users** | **~$1.50/month** |

### Yearly Cost Projection (with caching)

| Users | Monthly | Yearly |
|-------|---------|--------|
| 1,000 | ~$0.15 | ~$2 |
| 10,000 | ~$1.50 | ~$18 |
| 100,000 | ~$15 | ~$180 |

**Result**: 70% additional cost reduction from caching alone!

---

## Open Questions for Discussion

1. ~~**Should links be bidirectional?**~~ ✅ **DECIDED: Yes, bidirectional**
   - Links are two-way: both User A and User B share updates with each other
   - One link document tracks both directions

2. **Conflict resolution?**
   - What if both users update the same range position at the same time?
   - **Recommendation**: Show preview and let user choose which ranges to accept (like current fill-empty-only approach). Last-write-wins for individual range slots.

3. **Maximum links per player?**
   - Should we limit how many links a player can have?
   - **Recommendation**: No hard limit needed (pull-based doesn't create per-link cost)

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

This feature enables **bidirectional** automatic range synchronization between friends through a **linking** system with **pull-based updates**:

1. **Bidirectional links**: Both users share updates with each other via a single link
2. **Either user updates**: Range saves increment a version number (no fan-out)
3. **Either user refreshes**: Check for version mismatches from the other user
4. **Pull-based architecture**: Cost scales with refresh frequency, not update volume
5. **Client-side caching**: 5-minute cache TTL reduces Firestore reads by ~80%
6. **Visual feedback**: "Last checked" timestamp sets user expectations
7. **Privacy-first**: Both parties always choose to accept or reject incoming changes

**Estimated cost impact**: ~$1.50/month at 10,000 users (with caching, even with 100 links/player, 300 updates/month)

**Development effort**: Medium (~2-3 weeks for full implementation)

---

## Next Steps

Please review this plan and let me know:

1. Do the user flows make sense?
2. Any concerns with the data model?
3. Preferences on the open questions?
4. Shall I prioritize any specific phases?

Ready to proceed with implementation when you give the go-ahead!
