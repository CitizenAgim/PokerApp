# AI Context & Progress Summary

> **META INSTRUCTION FOR AI AGENTS:**
> This file serves as the primary context handover. **You must update this file** whenever you complete a significant task, change architecture, or resolve a blocker. Keep the "Last Updated" date current.

**Last Updated:** December 5, 2025 (Compliance Update)

## Project Overview
Poker Range Manager app built with **React Native (Expo)** and **Firebase**.
- **Architecture:** Offline-first. Reads/writes to local `AsyncStorage` immediately, syncs to Firestore in background.
- **Core Philosophy:** **Personal Utility**. All social/sharing features have been removed to ensure GDPR compliance and simplify the app model. Data is strictly private to the user.
- **State Management:** Custom hooks (`useRange`, `usePlayer`) with local state + persistence.

## Recent Implementations

### 1. Compliance & Privacy Refactor
- **Social Removal:** Deleted all "Friends" and "Sharing" features.
    - Removed `sharedWith` fields from Firestore and Types.
    - Deleted `services/firebase/friends.ts` and `hooks/useFriends.ts`.
    - Removed Share UI from Player Details.
- **Data Isolation:** Updated Firestore security rules (conceptually) and Sync logic to ensure users can only access their own data.

### 2. Range Editor Logic
- **Selection Logic:** Removed auto-selection logic (previously "Gap/Shape" logic). Selecting a hand now only toggles that specific hand.
- **Undo/Redo:** Added history stack to `useRange.ts` and UI controls in the header.

### 3. Synchronization Engine (`services/sync.ts`)
- **Offline Handling:** Suppressed "client is offline" errors to reduce console noise.
- **Data Integrity:** Added `fullSync()` on app start to handle uninstall/reinstall scenarios.
- **Sanitization:** Fixed `undefined` field crashes by defaulting optional fields (notes, photoUrl) to `null` before Firestore writes.

## Current Status & Blockers
- **Firestore:** Fully configured for single-user mode.
- **Authentication:** Code is ready but **blocked** by missing `GOOGLE_IOS_CLIENT_ID`.
    - *Action Required:* User needs to generate iOS Client ID in Google Cloud Console and update `app/(auth)/login.tsx` and `signup.tsx`.

## Next Steps for AI Agent
1. **Auth Configuration:** Ask user for the new iOS Client ID and replace the placeholder `YOUR_IOS_CLIENT_ID_HERE` in auth files.
2. **Verification:** Once Auth is fixed, verify that `fullSync` correctly pulls data from Firestore on a fresh install.
3. **Cleanup:** Ensure no dead code remains from the social features refactor.
