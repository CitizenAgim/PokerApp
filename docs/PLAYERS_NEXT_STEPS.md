# Players Section - Implementation Plan

## Overview
Focus on complete CRUD operations for Players and their Ranges with **offline-first architecture** that supports:
- Users without an account (local-only storage)
- Users with an account (local + Firebase sync)
- Future account creation (sync existing local data to cloud)

---

## Current State Analysis

### ✅ Already Implemented
- **Local Storage**: Full CRUD for players and ranges (`services/localStorage.ts`)
- **Firebase Services**: Full CRUD for players and ranges (`services/firebase/`)
- **Sync Queue**: Pending changes queue for offline support
- **Hooks**: `usePlayers`, `usePlayer`, `usePlayerRanges`, `useRange`
- **UI Screens**: Player list, create player, player detail, range editor

### ❌ Issues / Gaps
1. **Authentication Required**: `createPlayer` throws error if no user logged in
2. **No Edit Player UI**: Edit button exists but doesn't work
3. **No Guest Mode**: Can't use app without Firebase account
4. **No "Sync on Login"**: If user creates account later, local data isn't synced

---

## Feature 1: Guest Mode (No Account Required)

### Description
Allow users to use the app fully without creating an account. All data stored locally. When they create an account later, local data syncs to Firebase.

### Requirements
- [ ] Add "Continue as Guest" button on login screen
- [ ] Remove authentication requirement from `createPlayer`
- [ ] Use a local guest ID when no user is logged in
- [ ] Track whether data was created in "guest mode"
- [ ] Add manual "Sync to Cloud" button in profile/settings (visible when logged in)
- [ ] Handle ID conflicts (local IDs vs Firebase IDs)

### UI Flow
1. Login screen shows: "Sign In" | "Sign Up" | **"Continue as Guest"**
2. Guest users go directly to main app
3. Profile/Settings shows "Sign In to sync your data" prompt for guests
4. After login, show "Sync Now" button to manually sync local data

### Files to Modify
- `app/(auth)/login.tsx` - Add "Continue as Guest" button
- `app/(main)/profile.tsx` - Add "Sync to Cloud" button
- `hooks/usePlayer.ts` - Allow guest mode
- `services/localStorage.ts` - Add guest mode flag
- `services/sync.ts` - Add manual sync function

### Test Cases

#### TC1.1: Create Player as Guest
- **Given**: User is not logged in (no Firebase account)
- **When**: User creates a player "Mike"
- **Then**: Player is saved locally, no error thrown

#### TC1.2: View Players as Guest
- **Given**: User is not logged in with 3 local players
- **When**: User opens Players screen
- **Then**: All 3 players display correctly

#### TC1.3: Edit Range as Guest
- **Given**: User is not logged in, player "Mike" exists
- **When**: User edits Mike's early/open-raise range
- **Then**: Range saves locally, persists after app restart

#### TC1.4: Manual Sync Button
- **Given**: User logged in with local data from guest mode
- **When**: User taps "Sync to Cloud" button in profile
- **Then**: All local players sync to Firebase, success message shown

#### TC1.5: Already Logged In User
- **Given**: User is logged in with Firebase account
- **When**: User creates a player
- **Then**: Player saves locally AND syncs to Firebase

#### TC1.6: Offline with Account
- **Given**: User is logged in but device is offline
- **When**: User creates/edits players
- **Then**: Changes save locally, sync when back online

---

## Feature 2: Edit Player

### Description
Allow users to edit existing player information (name, notes, photo) from the player detail screen.

### Requirements
- [ ] Create edit modal on player detail screen
- [ ] Pre-populate form with existing player data
- [ ] All fields editable: name, notes, photoUrl
- [ ] Validate name is not empty
- [ ] Save changes to local storage
- [ ] Sync to Firebase if user is logged in and online
- [ ] Show loading state while saving
- [ ] Show confirmation dialog before destructive actions

### UI/UX
- Bottom sheet modal (consistent with share modal)
- Reuse input styles from new player screen
- "Are you sure?" confirmation for delete actions

### Files to Modify
- `app/(main)/players/[id]/index.tsx` - Add edit modal

### Test Cases

#### TC2.1: Open Edit Modal
- **Given**: User is on player detail screen
- **When**: User taps "Edit" button
- **Then**: Edit modal opens with current name and notes pre-filled

#### TC2.2: Edit Name Successfully
- **Given**: Edit modal is open
- **When**: User changes name to "New Name" and taps Save
- **Then**: Modal closes, player name updates in UI, change persists after app restart

#### TC2.3: Edit with Empty Name
- **Given**: Edit modal is open
- **When**: User clears the name field and taps Save
- **Then**: Error message appears, save is blocked

#### TC2.4: Edit Notes
- **Given**: Edit modal is open with player who has no notes
- **When**: User adds notes "Plays tight preflop" and saves
- **Then**: Notes appear on player detail screen

#### TC2.5: Cancel Edit
- **Given**: Edit modal is open with unsaved changes
- **When**: User taps outside modal or Cancel button
- **Then**: Modal closes, original values remain unchanged

#### TC2.6: Offline Edit (with account)
- **Given**: Device is offline, user has account
- **When**: User edits player and saves
- **Then**: Changes save locally, sync to Firebase when online

#### TC2.7: Edit as Guest
- **Given**: User has no account
- **When**: User edits player and saves
- **Then**: Changes save locally only (no sync attempt)

---

## Feature 3: Photo Upload

### Description
Allow users to add/change a player's photo using camera or photo library.

### Requirements
- [ ] Install expo-image-picker
- [ ] Request camera and photo library permissions
- [ ] Show action sheet: "Take Photo" / "Choose from Library" / "Remove Photo"
- [ ] Crop/resize image to reasonable size (e.g., 300x300)
- [ ] Store photo locally using expo-file-system (in app's document directory)
- [ ] Save photo path in player's `photoUrl` field (local file URI)
- [ ] Display photo in avatar instead of initial letter
- [ ] Handle permission denied gracefully
- [ ] Clean up orphaned photos when player is deleted

### Dependencies
- `expo-image-picker` package (needs to be installed)
- `expo-file-system` (already installed)

### Storage Strategy
Photos will be stored locally in the app's document directory:
- Path: `${FileSystem.documentDirectory}players/{playerId}.jpg`
- Player model stores the local file URI in `photoUrl`
- No cloud sync for photos (keeps it simple, saves bandwidth)

### Files to Create/Modify
- `app/(main)/players/[id]/index.tsx` - Add photo picker trigger
- `app/(main)/players/new.tsx` - Add photo picker for new players
- `services/photos.ts` - Local photo storage utilities (save, delete, resize)
- `components/ui/Avatar.tsx` - Reusable avatar component with image support
- `hooks/usePlayer.ts` - Handle photo deletion when player is deleted

### Test Cases

#### TC3.1: Add Photo from Camera
- **Given**: User is creating/editing a player
- **When**: User taps avatar → "Take Photo" → captures photo
- **Then**: Photo appears as player avatar

#### TC3.2: Add Photo from Library
- **Given**: User is creating/editing a player
- **When**: User taps avatar → "Choose from Library" → selects photo
- **Then**: Photo appears as player avatar

#### TC3.3: Remove Photo
- **Given**: Player has a photo
- **When**: User taps avatar → "Remove Photo"
- **Then**: Avatar reverts to initial letter

#### TC3.4: Permission Denied - Camera
- **Given**: User has denied camera permission
- **When**: User taps "Take Photo"
- **Then**: Alert shows explaining how to enable permission in Settings

#### TC3.5: Permission Denied - Library
- **Given**: User has denied photo library permission
- **When**: User taps "Choose from Library"
- **Then**: Alert shows explaining how to enable permission in Settings

#### TC3.6: Large Photo Handling
- **Given**: User selects a 10MB photo
- **When**: Photo is processed
- **Then**: Photo is resized/compressed to under 500KB

#### TC3.7: Photo Persistence
- **Given**: Player has a photo
- **When**: App is closed and reopened
- **Then**: Photo still displays correctly

#### TC3.8: Delete Player Cleans Up Photo
- **Given**: Player "Mike" has a photo saved locally
- **When**: User deletes player "Mike"
- **Then**: Photo file is deleted from device storage

---

## Feature 4: Shared Players View *(Deferred)*

*Will be implemented later when focusing on social features.*

---

## Implementation Order

### Phase 1: Guest Mode + Core CRUD
1. **Feature 1: Guest Mode** - Allow offline-first usage without account
2. **Feature 2: Edit Player** - Complete the CRUD operations

### Phase 2: Enhanced UX
3. **Feature 3: Photo Upload** - Better player identification

### Phase 3 (Future)
- Shared Players View *(deferred)*
- Duplicate Detection
- Range History
- Mini Range Preview

---

## Technical Architecture

### Data Flow (Offline-First)

```
┌─────────────────────────────────────────────────────────┐
│                      User Action                         │
│              (Create/Edit/Delete Player)                 │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Local Storage                          │
│              (AsyncStorage - Always first)               │
│                                                          │
│  • Immediate save                                        │
│  • Add to pending sync queue                             │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Sync Decision                         │
│                                                          │
│  if (user.loggedIn && device.online) {                  │
│    → Sync to Firebase                                    │
│  } else {                                                │
│    → Keep in pending queue                               │
│  }                                                       │
└─────────────────────────────────────────────────────────┘
```

### Guest User ID Strategy

```typescript
// When no Firebase user:
const guestUserId = 'guest_local';

// Player created as guest:
{
  id: '1234_abc',
  name: 'Mike',
  createdBy: 'guest_local',  // Marks as guest-created
  ...
}

// On first login, update createdBy to real userId and sync
```

### Sync on First Login

```typescript
// Manual sync triggered by user from profile screen
async function syncLocalDataToCloud(userId: string) {
  const localPlayers = await localStorage.getPlayers();
  const guestPlayers = localPlayers.filter(p => p.createdBy === 'guest_local');
  
  for (const player of guestPlayers) {
    // Update createdBy to real userId
    player.createdBy = userId;
    await localStorage.savePlayer(player);
    await firebase.createPlayer(player, player.id);
    
    // Also sync ranges for this player
    const ranges = await localStorage.getPlayerRanges(player.id);
    if (ranges) {
      await firebase.savePlayerRanges(ranges);
    }
  }
}
```

---

## Range Editor Behavior

### Flow
1. Create/Open a player → Range editor opens
2. Shows the player's saved hand selections (or empty grid if new player)
3. **Default selection**: "Early Position" + "Open Raise"
4. User selects/deselects hands for a specific position + action
5. Saves locally (and to Firebase if logged in)

### Key Points
- Each player has ranges organized by position (early/middle/late/blinds) + action (open-raise/call/3bet/etc.)
- Range editor always shows current saved state for selected position/action
- Changes persist immediately on save
- Default to Early Position + Open Raise when opening editor

---

## Data Deletion Behavior

### Confirmation Dialogs Required
- **Delete Player**: "Are you sure you want to delete [Player Name]? This will also delete all their saved ranges."
- **Clear Range**: "Are you sure you want to clear this range?"

### Cascade Deletes
- Deleting a player also deletes:
  - All their ranges (local and cloud)
  - Their photo file (if stored locally)

---

## Questions to Resolve

1. **Merge behavior**: When merging ranges, how to handle conflicts (same position/action)?

---

## Estimated Timeline

| Feature | Effort | Time Estimate |
|---------|--------|---------------|
| Guest Mode | Medium | 2-3 hours |
| Edit Player | Small | 1-2 hours |
| Photo Upload | Medium | 3-4 hours |
| Shared Players View | Medium | *(deferred)* |

**Total Phase 1-2**: ~6-9 hours
