# Compliance & Cleanup Plan (GDPR/App Store)

**STATUS: EXECUTED (Codebase Updated)**
*Remaining Action: Update Firestore Security Rules in Firebase Console.*

To ensure the app is compliant with GDPR and App Store guidelines regarding user privacy and data sharing, we will remove all "Social" and "Sharing" features. The app will function as a strictly personal utility tool.

## 1. Database Schema Updates [COMPLETED]
We need to remove fields related to sharing from our data models.

### `types/poker.ts`
- **[x] Remove** `sharedWith: string[]` from `Player` interface.
- **[x] Remove** `User` interface (or strip `friends` field).
- **[x] Remove** `FriendRequest` interface.
- **[x] Remove** `FriendRequestStatus` type.

## 2. Firebase Service Cleanup [COMPLETED]
We need to delete code that handles friend logic and sharing permissions.

### `services/firebase/friends.ts`
- **[x] Delete** this entire file.

### `services/firebase/players.ts`
- **[x] Remove** `sharePlayer` function.
- **[x] Remove** `unsharePlayer` function.
- **[x] Update** `getPlayers` to only query `createdBy == userId` (remove the `sharedWith` query).
- **[x] Update** `toPlayer` and `toFirestoreData` to remove `sharedWith` mapping.

### `services/sync.ts`
- **[x] Remove** `sharedWith` from `syncPlayer` function.
- **[x] Remove** any logic related to syncing friend requests.

## 3. UI Cleanup [COMPLETED]
Remove screens and buttons related to friends and sharing.

### `app/(main)/friends/`
- **[x] Delete** this entire folder (`_layout.tsx`, `add.tsx`, `index.tsx`).

### `app/(main)/players/[id]/index.tsx` (Player Details)
- **[x] Remove** "Share" button from header.
- **[x] Remove** "Shared with..." section.
- **[x] Remove** `Share Modal` and all associated state (`showShareModal`, `friends`, `handleShareWithFriend`, etc.).
- **[x] Remove** `useFriends` hook usage.

### `app/(main)/profile.tsx`
- **[x] Remove** any "Friends" or "Friend Requests" sections if they exist.

## 4. Firestore Rules Update [PENDING - MANUAL ACTION]
Simplify security rules since sharing is no longer possible.

- **Update** `players` collection rule:
  ```javascript
  match /players/{playerId} {
    allow create: if isAuthenticated() && request.resource.data.createdBy == request.auth.uid;
    allow read, update, delete: if isAuthenticated() && resource.data.createdBy == request.auth.uid;
  }
  ```
- **Remove** `friendRequests` match block entirely.

## 5. Hooks Cleanup [COMPLETED]
- **[x] Delete** `hooks/useFriends.ts`.

## Summary of Impact
- **Positive:** No risk of leaking personal data to other users. No need for "Report User" or "Block User" features required by Apple for social apps. Simplified codebase.
- **Negative:** Users cannot collaborate on player notes (which was the original intent, but carries the legal risk).
