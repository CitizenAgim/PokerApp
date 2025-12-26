# Hand Recording Feature Documentation

## 1. Overview
The Hand Recording feature allows users to record live poker hands in real-time with strict rule enforcement. It serves as a digital ledger for the game, tracking every action, bet, and stack change to ensure the integrity of the session data. The system is designed to handle complex scenarios like straddles, split pots (future), and undo operations while maintaining a fluid user experience.

## 2. Architecture

### Controller: `app/record-hand.tsx`
This is the "Brain" of the feature. It manages:
- **Game State**: Holds the source of truth for all players, stacks, cards, and bets.
- **Rule Engine**: Enforces poker rules (min-raises, acting in turn, betting limits).
- **User Interactions**: Handles all button presses, modals (Bet, Stack Edit), and navigation.
- **History**: Manages the undo stack to allow reverting actions.

### View: `components/table/PokerTable.tsx`
This is a **Pure Presentation Component**. It receives state via props and renders:
- The visual representation of the table (felt, dealer button).
- Player seats (avatars, names, current stacks).
- Cards (hole cards and community cards).
- Chips/Bets (visual indicators of current street bets).
- **No logic** resides here; it simply displays what the Controller tells it to.

## 3. State Management

The feature relies on several key state variables within `RecordHandScreen`:

| State Variable | Type | Description |
| :--- | :--- | :--- |
| `seats` | `Seat[]` | The primary data structure. Contains player info, seat indexes, and **current stack sizes**. |
| `bets` | `Record<number, number>` | Maps `seatNumber` to the amount currently bet on the *current street*. |
| `pot` | `number` | The total amount in the pot from *previous streets* (locked chips). |
| `currentActionSeat` | `number \| null` | The seat number of the player whose turn it is to act. |
| `currentBet` | `number` | The highest bet on the table for the current street (the amount to call). |
| `minRaise` | `number` | The minimum amount a player must raise (usually `currentBet + lastRaiseDiff`). |
| `foldedSeats` | `Set<number>` | A set of seat numbers that have folded in the current hand. |
| `history` | `any[]` | A stack of previous state snapshots used for the **Undo** feature. |
| `street` | `'preflop' \| 'flop' ...` | Tracks the current stage of the hand. |
| `handCards` | `Record<number, string[]>` | Maps seat numbers to their hole cards (e.g., `['As', 'Kd']`). |
| `communityCards` | `string[]` | Array of up to 5 cards representing the board. |

## 4. Implemented Features

### Stack Management
- **Real-time Deduction**: Chips are deducted from `seats[i].player.stack` immediately upon checking, calling, or betting.
- **Validation**: The system prevents users from betting more than they have.
- **All-in Handling**: Special logic handles cases where a player bets their entire remaining stack (even if less than the min-raise).

### Betting Rules
- **Min-Raise Validation**: Raises must be at least the size of the previous raise (or Big Blind if opening).
- **Pot-Sized Bets**: Calculates the maximum Pot Limit bet (Pot + Bets + Amount to Call).
- **Blinds & Straddles**:
    - Automatically posts SB/BB based on button position.
    - Supports standard **Straddles** (UTG) and **Mississippi Straddles** (Button).
    - Validates that straddles are only placed before the hand starts.

### Game Flow
- **Pre-flop Sequence**: Correctly identifies the first actor:
    - **Standard**: UTG acts first.
    - **Heads-Up**: Button acts first.
    - **Straddle**: Player after the straddler acts first.
- **Turn Management**: `moveToNextPlayer()` automatically skips empty seats and folded players to find the next active seat.

### Undo System
- **Snapshotting**: Before any state-changing action (Fold, Call, Bet), `saveState()` pushes a deep copy of relevant state variables to `history`.
- **Restoration**: `handleUndo()` pops the last state and overwrites the current state, effectively traveling back in time.

## 5. Action Logic

### Fold
- **Logic**: Adds current seat to `foldedSeats`.
- **State**: Clears `handCards` for that seat.
- **Next**: Passes action to the next player.

### Check
- **Validation**: Only allowed if `bets[currentSeat] == currentBet`.
- **Logic**: No chips moved. Passes action.

### Call
- **Calculation**: `amountNeeded = currentBet - currentPlayerBet`.
- **Logic**: Deducts `amountNeeded` (or all-in amount) from stack. Adds to `bets[currentSeat]`.
- **Next**: Passes action.

### Bet / Raise
- **Input**: Opens a modal for numeric input.
- **Validation**:
    - Must be `>= currentBet + minRaise` (unless All-in).
    - Must be `<= playerStack + currentPlayerBet`.
- **Logic**: Deducts difference from stack. Updates `currentBet` and `minRaise`.

### Pot
- **Calculation**: `(Pot + Total Bets on Table) + (Amount to Call)`.
- **Logic**: Executes a Bet/Raise with the calculated amount immediately (or pre-fills modal).

### All-in
- **Logic**: Bets exactly `player.stack + currentPlayerBet`.
- **Side Effects**: Sets player stack to 0. Updates `currentBet` if the all-in raises the pot.

## 6. Remaining Tasks

The following features are planned or partially implemented but require completion:

1.  **Street Progression**:
    - **Auto-Advance**: Automatically detect when a betting round is complete (all active players have matched the bet).
    - **State Updates**: Move chips from `bets` to `pot`. Advance `street` (Preflop -> Flop -> Turn -> River).
    - **Auto-Prompt**: Automatically open the Card Picker modal for community cards when the street changes.

2.  **Side Pot Calculation**:
    - **Visuals**: Keep simple (single visual pot).
    - **Logic**: Handle side pot math internally if necessary, but primarily track total pot value.

3.  **Showdown & Winner Selection**:
    - **Manual Selection**: User manually selects the winning seat(s).
    - **No Evaluation**: The app will *not* calculate hand rankings or determine the winner automatically.
    - **Resolution**: Distribute the pot to the selected winner's stack to maintain local state consistency.

4.  **Database Persistence**:
    - **Log Only**: The recorded hand serves as a historical log.
    - **Implementation**: Serialize the `history` and `HandRecord` and save to Firebase.
    - **Privacy**: Hands must be saved under a user-specific path (e.g., `users/{userId}/hands`) to ensure only the creator can access them.
    - **Future**: Sharing features will be implemented later.
