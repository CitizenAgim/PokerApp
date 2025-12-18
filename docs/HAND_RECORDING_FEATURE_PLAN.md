# Hand Recording Feature Plan

## Overview
The goal is to create a tool to record hands that have been played. This tool will be accessible from both the Session page (pre-populated with current players) and the Home page (empty, manual entry). The visual layout will mirror the session table view.

## User Interface

### 1. Reusable Table Component (`components/table/PokerTable.tsx`)
*   **Goal:** Extract the table visualization logic from `app/(main)/sessions/[id].tsx` to ensure the "Record Hand" tool looks exactly like the session table.
*   **Props:**
    *   `seats`: Array of seat data (players, positions).
    *   `buttonPosition`: Current dealer button position.
    *   `heroSeat`: Seat index of the hero.
    *   `onSeatPress`: Callback for seat interaction.
    *   `themeColors`: Theme configuration.
    *   `readOnly`: Boolean (optional) to disable interactions if needed.

### 2. Record Hand Screen (`app/record-hand.tsx` or `app/(main)/record-hand.tsx`)
*   **Layout:**
    *   Uses the `PokerTable` component.
    *   **Header:** "Record Hand" title, Cancel/Save buttons.
    *   **Body:** The poker table view.
    *   **Controls:** (To be defined based on data requirements - e.g., input fields for cards, actions, pot size).
*   **Modes:**
    *   **Session Mode:**
        *   Receives `sessionId` or `tableState` via navigation params.
        *   Initializes table with players from the active session.
    *   **Manual Mode:**
        *   Initializes with an empty table.
        *   Allows users to manually add players to seats (reusing the "Assign Player" flow).

### 3. Entry Points
*   **Session Page (`app/(main)/sessions/[id].tsx`):**
    *   Replace the "Move Button" button in the "Quick Actions" bar with a "Record Hand" button.
    *   **Action:** Navigates to the Record Hand screen with the current session context.
*   **Home Page (`app/home.tsx`):**
    *   Add a "Record Hand" button (location to be determined, likely in the main menu).
    *   **Action:** Navigates to the Record Hand screen in Manual Mode (empty table).

## Data Structure (Proposed)
We likely need a new type to store the recorded hand.

```typescript
interface HandRecord {
  id: string;
  sessionId?: string; // Optional, if linked to a session
  timestamp: number;
  buttonPosition: number;
  seats: Seat[]; // Snapshot of players at the table
  // ... other fields to be defined (cards, board, actions, winner, pot)
}
```

## Implementation Steps

1.  **Refactor:** Extract `PokerTable` component from `app/(main)/sessions/[id].tsx`.
2.  **Create Screen:** Implement the `RecordHandScreen` using the `PokerTable`.
3.  **Navigation:**
    *   Update `app/home.tsx` to add the entry point.
    *   Update `app/(main)/sessions/[id].tsx` to replace "Move Button" with "Record Hand".
4.  **Logic:** Implement the logic for initializing the table state (from session vs. empty) and handling player assignment in Manual Mode.

## Questions for Clarification

1.  **Data Requirements:** What specific information needs to be recorded for a hand?
    *   Hole cards?
    *   Community cards (Board)?
    *   Pot size?
    *   Actions (Bet, Call, Raise, Fold)?
    *   Winner(s)?
    *   Notes?
2.  **"Move Button" Replacement:** Does the "Record Hand" feature replace the functionality of moving the dealer button?
    *   *Assumption:* Recording a hand implies the button moves after the hand. Should the "Record Hand" tool automatically update the session's button position upon saving?
3.  **Manual Mode Details:** In Manual Mode (from Home), should the user be able to save the "Session" or is it just for a one-off hand record?
4.  **Editing:** Should the user be able to modify player stacks/names in the "Record Hand" screen if it was initialized from a session?
