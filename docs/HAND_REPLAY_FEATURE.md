# Hand Replay Feature

## Status: ✅ IMPLEMENTED

## Overview
A tool to replay saved hands step-by-step, showing actions one at a time with progressive community card reveals.

---

## Requirements

### Card Visibility
- **Hero's cards**: Always visible from start
- **Villain's cards**: Hidden by default until end of hand
- **Toggle option**: Checkbox to show villain's cards if user wants

### Visual Feedback Per Action
- [x] Highlighted active seat (who is acting)
- [x] Action text display ("BTN raises to 25")
- [x] Updated pot after each action
- [x] Stack changes in real-time

### Navigation
- Manual stepping only (arrows)
- Previous action (◀)
- Next action (▶)
- Jump to start (◀◀)
- Jump to end (▶▶)

### Starting Point
- Preflop with blinds already posted

### End State
- Winner announcement
- Final pot distribution

### Community Cards
- Hidden preflop
- Flop (3 cards) revealed on first flop action
- Turn (1 card) revealed on first turn action
- River (1 card) revealed on first river action

---

## Files Created

| File | Purpose |
|------|---------|
| `app/hand-replay/[id].tsx` | Main replay screen |
| `hooks/useHandReplay.ts` | Logic for stepping through actions |
| `styles/hand-replay.styles.ts` | Styles for replay screen |

## Files Modified

| File | Changes |
|------|---------|
| `app/saved-hands.tsx` | Navigate to replay on hand press |
| `app/(main)/sessions/[id].tsx` | Navigate to replay on hand press |
| `services/firebase/hands.ts` | Added `getHandById()`, `buttonPosition` field |

---

## Implementation Checklist

### Phase 1: Core Setup ✅
- [x] `services/firebase/hands.ts` - added `getHandById()`, `buttonPosition`
- [x] `hooks/useHandReplay.ts` - replay logic with state precomputation
- [x] `styles/hand-replay.styles.ts` - styles

### Phase 2: UI ✅
- [x] `app/hand-replay/[id].tsx` - main screen
- [x] Integrate with PokerTable component
- [x] Add navigation controls
- [x] Add action display
- [x] Add villain cards toggle

### Phase 3: Navigation ✅
- [x] `app/saved-hands.tsx` - navigate on press
- [x] `app/(main)/sessions/[id].tsx` - navigate on press

### Phase 4: Polish ✅
- [x] Winner announcement at end
- [x] Final pot distribution display
