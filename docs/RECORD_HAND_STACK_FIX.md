# Record Hand - Stack & Betting Fix

## Problem Statement

When recording a hand from the "Saved Hands" screen (standalone mode, not linked to a session), several issues occur:

1. **No automatic blinds** - Small blind and big blind are not posted because players don't have stack values
2. **Blocking actions** - The current logic blocks or limits betting actions based on stack sizes
3. **No way to set blinds** - In standalone mode, there's no way to specify SB/BB values

## Goals

- Make player stacks **indicative only** (informational, not restrictive)
- Allow users to input any betting amount regardless of displayed stack
- Add SB/BB input fields for standalone recording mode
- Implement an "All-in" modal for entering custom amounts

---

## Implementation Plan

### 1. Add SB/BB Input Fields for Standalone Mode

**File:** `app/record-hand.tsx`

**Changes:**
- Detect standalone mode (no `sessionId` param)
- Add two text inputs in the setup section (before "Start Hand" button):
  - Small Blind input (numeric)
  - Big Blind input (numeric)
- Store these values in state and use them when posting blinds
- These fields appear only when there's no session context

**UI Design:**
```
┌─────────────────────────────────┐
│  Stakes                         │
│  ┌─────────┐    ┌─────────┐    │
│  │ SB: 1   │    │ BB: 2   │    │
│  └─────────┘    └─────────┘    │
│                                 │
│  [ Start Hand ]                 │
└─────────────────────────────────┘
```

### 2. Modify All-in Button Behavior

**File:** `app/record-hand.tsx` (or relevant component)

**Current Behavior:**
- All-in button calculates remaining stack and bets that amount automatically

**New Behavior:**
- All-in button opens a modal with a numeric input field
- Input field starts **empty** (no pre-fill)
- User enters the all-in amount manually
- On confirm, the amount is processed as the all-in bet

**Modal Design:**
```
┌─────────────────────────────────┐
│  All-in Amount                  │
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  [Cancel]          [Confirm]    │
└─────────────────────────────────┘
```

### 3. Remove Stack-Based Restrictions

**File:** `hooks/useHandRecorder.ts` (or relevant hook/logic)

**Changes:**
- Remove or bypass checks that prevent actions when `stack < amount`
- Remove minimum bet validations based on stack
- Allow any bet/raise amount to be entered
- Keep stack tracking for display purposes only

### 4. Silent Stack Adjustment on Over-bet

**File:** `hooks/useHandRecorder.ts`

**Logic:**
- When a player's action amount exceeds their remaining stack:
  1. Treat the entered amount as their actual remaining stack
  2. Silently update the player's stack to: `previous_stack = amount_entered + already_bet_this_hand`
  3. This ensures the UI remains consistent (stack shows 0 after all-in)

**Example:**
- Player shown stack: 100
- Player already bet: 20
- Player goes all-in for: 150
- System silently adjusts their original stack to: 170 (150 + 20)
- Player's remaining stack after all-in: 0

### 5. Handle Players Without Stacks

**File:** `hooks/useHandRecorder.ts`

**Changes:**
- When a player has no stack (undefined/0), still allow all actions
- Post blinds using the SB/BB values from inputs (standalone) or session settings
- Don't skip blind posting due to missing stacks

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/record-hand.tsx` | Add SB/BB inputs for standalone mode, add All-in modal |
| `hooks/useHandRecorder.ts` | Remove stack restrictions, add silent stack adjustment, fix blind posting |
| `styles/record-hand.styles.ts` | Add styles for new SB/BB inputs and All-in modal |

---

## Testing Scenarios

1. **Standalone recording with SB/BB inputs**
   - Open "Saved Hands" → tap "+" → enter SB=1, BB=2 → Start Hand
   - Verify blinds are posted correctly

2. **All-in modal**
   - During hand recording, tap "All-in"
   - Verify modal opens with empty input
   - Enter amount, confirm, verify action recorded

3. **Over-stack betting**
   - Player with stack=100, enter all-in for 200
   - Verify stack is silently adjusted to 200
   - Verify remaining stack shows 0 after action

4. **No stack players**
   - Players with undefined stacks should still be able to perform all actions
   - Blinds should post regardless of stack values

---

## Notes

- This change prioritizes **flexibility** over strict poker rules
- Users recording hands may be reconstructing from memory and need to input exact amounts
- Stack values become a helpful guide, not a hard constraint
