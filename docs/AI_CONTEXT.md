# AI Context & Progress Summary

> **META INSTRUCTION FOR AI AGENTS:**
> This file serves as the primary context handover. **You must update this file** whenever you complete a significant task, change architecture, or resolve a blocker. Keep the "Last Updated" date current.

**Last Updated:** December 3, 2025

## Project Overview
Poker Range Manager app built with **React Native (Expo)** and **Firebase**.
- **Architecture:** Offline-first. Reads/writes to local `AsyncStorage` immediately, syncs to Firestore in background.
- **State Management:** Custom hooks (`useRange`, `usePlayer`) with local state + persistence.

## Recent Implementations

### 1. Range Editor Logic
- **Auto-Selection:** Implemented "Gap/Shape" logic in `handRanking.ts`. Selecting a hand (e.g., 89s) auto-selects superior hands with the same shape (e.g., 9Ts, JQs) and vertical kickers.
- **Undo/Redo:** Added history stack to `useRange.ts` and UI controls in the header.

### 2. Synchronization Engine (`services/sync.ts`)
- **Offline Handling:** Suppressed "client is offline" errors to reduce console noise.
- **Data Integrity:** Added `fullSync()` on app start to handle uninstall/reinstall scenarios.
- **Sanitization:** Fixed `undefined` field crashes by defaulting optional fields (notes, photoUrl) to `null` before Firestore writes.

### 3. Infrastructure
- **Database:** Firestore setup in `eur3` (Europe) region.
- **Security:** Production rules applied (User-centric data isolation).
- **Auth:** Google Sign-In implemented using `expo-auth-session/providers/google`.

## Current Status & Blockers
- **Firestore:** Fully configured.
- **Authentication:** Code is ready but **blocked** by missing `GOOGLE_IOS_CLIENT_ID`.
    - *Action Required:* User needs to generate iOS Client ID in Google Cloud Console and update `app/(auth)/login.tsx` and `signup.tsx`.

## Next Steps for AI Agent
1. **Auth Configuration:** Ask user for the new iOS Client ID and replace the placeholder `YOUR_IOS_CLIENT_ID_HERE` in auth files.
2. **Verification:** Once Auth is fixed, verify that `fullSync` correctly pulls data from Firestore on a fresh install.
3. **Feature Work:** Proceed with remaining features in `IMPLEMENTATION_PLAN.md` (e.g., Session tracking, Friends sharing).
