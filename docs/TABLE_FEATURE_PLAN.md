# Implementation Plan: Interactive Poker Table

## 1. Overview
This feature introduces a visual, interactive poker table interface for active sessions. It allows users to replicate their live environment by assigning players to specific seats. This visual representation serves as the central hub for session management.

## 2. User Interface Design

### 2.1. Visual Style
- **Orientation**: Vertical (Portrait).
- **Background**: Green felt texture or solid green color (resembling the provided reference).
- **Layout**: Oval table centered on the screen.
- **Seats**: 9 seats distributed around the table (standard full ring).
  - **Hero Seat**: The user is typically positioned at the bottom center (Seat 1 or 5 depending on indexing).
  - **Opponent Seats**: Distributed evenly around the rest of the oval.

### 2.2. Seat States
1.  **Empty**: Display a "+" icon or "Empty" label. Tapping triggers the "Add Player" flow.
2.  **Occupied**: Display the player's avatar (or initial) and name. Tapping triggers a "Player Options" menu (View Profile, Move, Remove).

## 3. Data Model Updates

### 3.1. Type Definitions (`types/poker.ts`)
We need to refine the `Seat` and `Table` definitions to support the new requirements.

```typescript
export interface TablePlayer {
  id: string;
  name: string;
  photoUrl?: string;
  isTemp: boolean; // True if the player is not saved to the global database
}

export interface Seat {
  index: number;       // 0-8
  player?: TablePlayer | null;
}

export interface TableState {
  seats: Seat[];       // Fixed array of 9 seats
  heroSeatIndex: number; // Default to 4 (bottom center)
}
```

### 3.2. Session Integration
The `Session` object (or a related `ActiveSession` context) needs to store this `TableState`.

## 4. Component Architecture

### 4.1. `PokerTable` (Container)
- **Responsibility**: Renders the table background and positions the `Seat` components.
- **Layout Logic**: Uses absolute positioning or trigonometry to place 9 seats in an oval shape.
  - *Formula*: `x = cx + rx * cos(theta)`, `y = cy + ry * sin(theta)`

### 4.2. `Seat` (Component)
- **Props**: `player`, `onPress`, `isActive`.
- **Visuals**: Circular avatar container.
  - If empty: Dashed border with "+" icon.
  - If occupied: Avatar image/initials + Name label.

### 4.3. `PlayerSelectionModal` (Component)
- **Trigger**: Tapping an empty seat.
- **Tabs/Options**:
  1.  **"Select Existing"**: Searchable list of players from the database (`usePlayers`).
  2.  **"Create New"**: Form to add a new permanent player (Name, Photo). Saves to DB, then assigns to seat.
  3.  **"Temporary"**: Simple input for a name (e.g., "Seat 3 Guy"). Creates a `TablePlayer` with `isTemp: true` and a generated ID, assigns to seat, but does *not* save to the global `players` collection.

## 5. Implementation Steps

### Step 1: Data & Types
- Update `types/poker.ts` with `TablePlayer`, `Seat`, and `TableState`.
- Update `Session` type if necessary to persist this state (or create a new sub-collection/field in Firebase).

### Step 2: UI Components (Skeleton)
- Create `components/table/PokerTable.tsx`.
- Create `components/table/Seat.tsx`.
- Implement the positioning logic to arrange 9 seats in a vertical oval.

### Step 3: Player Selection Logic
- Create `components/table/PlayerSelectionModal.tsx`.
- Implement the 3 flows:
  - **Existing**: Reuse/adapt the player list component.
  - **New**: Reuse/adapt the "Add Player" form.
  - **Temp**: New simple form.

### Step 4: State Management
- Create a hook `useTableState` (or extend `useSession`) to manage:
  - Adding a player to a seat.
  - Removing a player.
  - Swapping seats (optional but good for UX).

### Step 5: Integration
- Embed `PokerTable` into the `sessions/[id].tsx` (or `new.tsx`) screen.
- Ensure changes to the table (adding players) are saved to the active session data.

## 6. Questions / Clarifications
- **Persistence**: Should the table arrangement be saved permanently with the session history? (Assumed: Yes, useful for reviewing hand history context).
- **Max Players**: Is it always 9-max, or should we support 6-max layouts? (Plan assumes 9-max fixed for now).
- **Hero Position**: Should the user always be fixed at the bottom, or can they rotate the table? (Plan assumes fixed bottom position for simplicity).
