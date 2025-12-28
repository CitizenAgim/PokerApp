# Plan to Remove Player Photos Feature

This document outlines the steps to completely remove the "player pictures" feature from the application.

## 1. Dependencies
- [ ] Remove `expo-image-picker` from `package.json`.
- [ ] Remove `expo-image-manipulator` from `package.json`.
- [ ] Run `npm install` or `yarn` to update `package-lock.json` or `yarn.lock`.

## 2. Files to Delete
- [ ] Delete `utils/image.ts`.

## 3. Type Definitions
- [ ] **`types/poker.ts`**:
    - Remove `photoUrl` optional property from `Player` interface.
    - Remove `photoUrl` optional property from `TablePlayer` interface.

## 4. Services & Data Layer
- [ ] **`services/firebase/players.ts`**:
    - Update `playerConverter` to stop reading/writing `photoUrl`.
    - Update `createPlayer` and `updatePlayer` functions to remove `photoUrl` handling.
- [ ] **`services/sync.ts`**:
    - Remove `photoUrl` from any sync logic or conflict resolution if present.
- [ ] **`services/guestMode.ts`**:
    - Remove `photoUrl` from guest mode player creation/updates.
- [ ] **`services/localStorage.ts`**:
    - Remove `ninjaMode` from `UserPreferences` interface.
    - Remove `ninjaMode` default value.

## 5. Hooks & Logic
- [ ] **`hooks/usePlayer.ts`**:
    - Remove `uploadImage` logic (or similar internal function).
    - Remove `photoUrl` from `addPlayer` and `editPlayer` arguments/logic.
- [ ] **`hooks/useSettings.ts`**:
    - Remove `ninjaMode` and `toggleNinjaMode` from return type.
- [ ] **`contexts/SettingsContext.tsx`**:
    - Remove `ninjaMode` state and `toggleNinjaMode` function.
    - Remove `ninjaMode` from context value.

## 6. UI Components & Screens
- [ ] **`components/PlayerDetailView.tsx`**:
    - Remove `ImagePicker` and `resizeImage` imports.
    - Remove `handlePickImage` function.
    - Remove the `Image` or `ExpoImage` component displaying the player photo.
    - Remove the "Edit Photo" button/touchable area.
    - Remove `ninjaMode` usage.
- [ ] **`components/table/PokerTable.tsx`**:
    - Remove `isNinjaMode` prop from `PokerTable` and `SeatView`.
    - Remove logic that hides photos based on `isNinjaMode`.
- [ ] **`app/(main)/players/new.tsx`**:
    - Remove `ImagePicker` and `resizeImage` imports.
    - Remove `handlePickImage` function.
    - Remove the UI section for adding a photo.
- [ ] **`app/(main)/sessions/[id].tsx`**:
    - Remove `ImagePicker` and `resizeImage` imports from the "Create Player" modal/section.
    - Remove `handlePickImage` function.
    - Remove the UI for adding a photo.
- [ ] **`app/(main)/settings.tsx`**:
    - Remove "Hide Pictures (Ninja Mode)" setting item and switch.
    - Remove `ninjaMode` and `toggleNinjaMode` from `useSettings` destructuring.
- [ ] **`app/record-hand.tsx`**:
    - Remove `photoUrl` usage in `handleAssignPlayer`.
    - Remove the `Image` component in the player picker list (if present).

## 7. Configuration
- [ ] **`app.json`**:
    - Check for and remove any `expo-image-picker` plugin configuration or permissions.

## 8. Verification
- [ ] Run the app and verify that:
    - Player creation works without asking for a photo.
    - Player details view does not show a broken image or photo placeholder.
    - Session player creation works.
    - No build errors related to missing `photoUrl` properties.
