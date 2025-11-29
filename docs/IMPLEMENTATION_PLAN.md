# PokerApp Implementation Plan

## Overview
A poker cash game companion app for NLH (No-Limit Hold'em) that helps track opponent hand ranges across different positions and actions.

---

## Phase 1: Data Structures & Types

### 1.1 Hand Range Matrix
The 13x13 matrix represents all possible starting hands:
- **Diagonal (AA to 22)**: Pocket pairs
- **Above diagonal**: Suited hands (e.g., AKs, KQs)
- **Below diagonal**: Offsuit hands (e.g., AKo, KQo)

```typescript
// types/poker.ts

type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

type HandType = 'pair' | 'suited' | 'offsuit';

interface Hand {
  id: string;          // e.g., "AKs", "QQ", "T9o"
  rank1: Rank;
  rank2: Rank;
  type: HandType;
  row: number;         // 0-12 (A=0, K=1, ... 2=12)
  col: number;         // 0-12
}

// Selection state for a hand
type SelectionState = 'unselected' | 'auto-selected' | 'manual-selected' | 'manual-unselected';

// Range is a map of hand IDs to their selection state
type Range = Record<string, SelectionState>;
```

### 1.2 Position Types
```typescript
type Position = 'early' | 'middle' | 'late' | 'blinds';

type Action = 'open-raise' | 'call' | '3bet' | 'call-3bet' | '4bet';

interface RangeCategory {
  position: Position;
  action: Action;
}
```

### 1.3 Player Model
```typescript
interface Player {
  id: string;
  name: string;
  photoUrl?: string;
  notes?: string;
  createdAt: timestamp;
  updatedAt: timestamp;
  createdBy: string;     // User ID who created this player
  sharedWith: string[];  // User IDs who can view/edit
}

interface PlayerRanges {
  playerId: string;
  ranges: {
    [key: string]: Range;  // Key format: "position_action" e.g., "early_open-raise"
  };
  lastObserved: timestamp;
  handsObserved: number;
}
```

### 1.4 Session/Table Model
```typescript
interface Session {
  id: string;
  name: string;
  location?: string;
  stakes?: string;       // e.g., "1/2", "2/5"
  startTime: timestamp;
  endTime?: timestamp;
  isActive: boolean;
  createdBy: string;
}

interface Seat {
  seatNumber: number;    // 1-9
  playerId?: string;     // Reference to Player
  position: Position;    // Dynamically calculated based on button
}

interface Table {
  sessionId: string;
  buttonPosition: number;  // Seat number with the button (1-9)
  seats: Seat[];
}
```

### 1.5 User & Social Model
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  friends: string[];     // User IDs
  createdAt: timestamp;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: timestamp;
}
```

---

## Phase 2: Firebase Database Structure

### 2.1 Firestore Collections
```
/users/{userId}
  - email
  - displayName
  - photoUrl
  - friends[]
  - createdAt

/players/{playerId}
  - name
  - photoUrl
  - notes
  - createdBy
  - sharedWith[]
  - createdAt
  - updatedAt

/playerRanges/{playerId}
  - ranges: { position_action: Range }
  - lastObserved
  - handsObserved

/sessions/{sessionId}
  - name
  - location
  - stakes
  - startTime
  - endTime
  - isActive
  - createdBy
  - table: {
      buttonPosition,
      seats[]
    }

/friendRequests/{requestId}
  - fromUserId
  - toUserId
  - status
  - createdAt
```

### 2.2 Security Rules Outline
- Users can only read/write their own user document
- Players can be read by creator OR users in sharedWith array
- Sessions are private to the creator
- Friend requests readable by sender/receiver

---

## Phase 3: Local Storage Strategy

### 3.1 AsyncStorage Keys
```
@pokerapp/currentSession     - Active session data
@pokerapp/players            - Cached player list
@pokerapp/playerRanges/{id}  - Cached ranges per player
@pokerapp/pendingSync        - Queue of changes to sync
```

### 3.2 Offline-First Approach
1. All writes go to local storage first
2. Background sync to Firebase when online
3. Conflict resolution: Last-write-wins with timestamps

---

## Phase 4: Implementation Steps

### Step 1: Core Types & Constants (Week 1)
- [ ] Create `types/poker.ts` with all TypeScript interfaces
- [ ] Create `constants/hands.ts` with the 13x13 hand matrix
- [ ] Create `utils/handRanking.ts` with hand comparison logic
- [ ] Create auto-selection algorithm for "better hands"

### Step 2: Range Selector Component (Week 1-2)
- [ ] Build 13x13 grid component
- [ ] Implement tap to select/deselect
- [ ] Implement auto-selection of better hands
- [ ] Color coding (pairs, suited, offsuit, selected states)
- [ ] Position/action selector tabs

### Step 3: Local Storage Layer (Week 2)
- [ ] Create `services/localStorage.ts`
- [ ] Implement CRUD for players
- [ ] Implement CRUD for ranges
- [ ] Implement session management

### Step 4: Firebase Integration (Week 2-3)
- [ ] Set up Firestore collections
- [ ] Create `services/firebase/players.ts`
- [ ] Create `services/firebase/ranges.ts`
- [ ] Create `services/firebase/sessions.ts`
- [ ] Implement sync service

### Step 5: Player Management Screens (Week 3)
- [ ] Player list screen
- [ ] Add/edit player screen
- [ ] Player detail with range overview

### Step 6: Session Management (Week 3-4)
- [ ] Create session screen
- [ ] Table view with 9 seats
- [ ] Assign players to seats
- [ ] Button position management
- [ ] Quick range access from seat

### Step 7: Social Features (Week 4)
- [ ] Friend search by email/username
- [ ] Send/accept friend requests
- [ ] Share player data with friends
- [ ] Shared player notifications

### Step 8: Polish & Testing (Week 5)
- [ ] Error handling
- [ ] Loading states
- [ ] Offline indicators
- [ ] Performance optimization
- [ ] End-to-end testing

---

## Phase 5: App Navigation Structure

```
/                           → Landing (auth check)
/(auth)/login              → Login
/(auth)/signup             → Sign Up
/home                      → Main dashboard
/session/new               → Create new session
/session/[id]              → Active session view
/session/[id]/seat/[num]   → Seat/player detail
/players                   → Player list
/players/new               → Add player
/players/[id]              → Player detail
/players/[id]/range        → Range editor
/friends                   → Friend list
/friends/search            → Find friends
/profile                   → User profile
```

---

## Phase 6: Key Algorithms

### 6.1 Auto-Select Better Hands
When user selects a hand (e.g., K2s):
1. Identify hand type (suited in this case)
2. For suited hands in same row: select all columns to the left (K3s, K4s... KAs)
3. Mark as 'auto-selected' (different from 'manual-selected')
4. User can manually deselect any auto-selected hand

```typescript
function getAutoSelectHands(selectedHand: Hand, currentRange: Range): string[] {
  const handsToSelect: string[] = [];
  
  if (selectedHand.type === 'pair') {
    // Select all higher pairs
    // AA > KK > QQ > ... > 22
  } else if (selectedHand.type === 'suited') {
    // Select better suited hands in same "family"
    // For K2s: select K3s, K4s, K5s... KAs
  } else {
    // Offsuit: similar logic
    // For K2o: select K3o, K4o... KAo
  }
  
  return handsToSelect;
}
```

### 6.2 Position Calculation from Button
```typescript
function calculatePosition(seatNumber: number, buttonSeat: number, totalSeats: number): Position {
  const positionsFromButton = (seatNumber - buttonSeat + totalSeats) % totalSeats;
  
  // 9-handed positions:
  // Button (0), SB (1), BB (2) = late/blinds
  // UTG, UTG+1, UTG+2 (3,4,5) = early
  // MP, MP+1 (6,7) = middle
  // HJ, CO (8,9) = late
  
  if (positionsFromButton <= 2) return 'blinds';
  if (positionsFromButton <= 5) return 'early';
  if (positionsFromButton <= 7) return 'middle';
  return 'late';
}
```

---

## File Structure

```
/pokerapp
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── signup.tsx
│   ├── (main)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx (dashboard)
│   │   ├── session/
│   │   │   ├── new.tsx
│   │   │   └── [id].tsx
│   │   ├── players/
│   │   │   ├── index.tsx
│   │   │   ├── new.tsx
│   │   │   └── [id]/
│   │   │       ├── index.tsx
│   │   │       └── range.tsx
│   │   ├── friends/
│   │   │   ├── index.tsx
│   │   │   └── search.tsx
│   │   └── profile.tsx
│   ├── _layout.tsx
│   └── index.tsx (landing)
├── components/
│   ├── poker/
│   │   ├── RangeGrid.tsx
│   │   ├── HandCell.tsx
│   │   ├── PositionSelector.tsx
│   │   ├── TableView.tsx
│   │   └── SeatView.tsx
│   └── ui/
├── config/
│   └── firebase.ts
├── constants/
│   ├── hands.ts
│   └── positions.ts
├── hooks/
│   ├── usePlayer.ts
│   ├── useSession.ts
│   └── useRange.ts
├── services/
│   ├── localStorage.ts
│   ├── sync.ts
│   └── firebase/
│       ├── players.ts
│       ├── sessions.ts
│       └── users.ts
├── types/
│   └── poker.ts
└── utils/
    ├── handRanking.ts
    └── positionCalculator.ts
```

---

## Next Steps

1. **Review this plan** - Confirm the data structures and flow
2. **Start with Phase 1** - Create type definitions and constants
3. **Build the Range Grid** - This is the core UI component
4. **Iterate** - Add features incrementally

Would you like me to start implementing any specific phase?
