# Range Storage Optimization Plan

## Overview

This document outlines a strategy to reduce the storage size of poker hand ranges by **~90%** through "Sparse Storage" - only saving hands that have been selected, rather than storing all 169 hands including unselected ones.

---

## The Problem

### Current Implementation

In the current implementation (`utils/handRanking.ts`), every range stores **all 169 possible hands** in the 13×13 matrix, even if the hand is `'unselected'`.

```typescript
// Current: Every range initializes ALL 169 hands
export function initializeRange(): Range {
  const range: Range = {};
  for (const hand of ALL_HANDS) {
    range[hand] = 'unselected';  // Storing 169 'unselected' values
  }
  return range;
}
```

### Size Breakdown (Current)

| Component | Size |
|-----------|------|
| **Keys** (169 hands like `"AA"`, `"AKs"`, `"T9o"`) | ~494 bytes |
| **Values** (169 × `'unselected'` = 11 bytes each) | ~1,859 bytes |
| **Firestore overhead** | ~150 bytes |
| **Total per range** | **~2,500 bytes (2.5 KB)** |

### Impact on Player Documents

With the current app configuration (4 positions × 9 actions = **36 ranges max**):

| Scenario | Ranges | Size |
|----------|--------|------|
| Light user (10 ranges) | 10 | 25 KB |
| Regular user (20 ranges) | 20 | 50 KB |
| Power user (36 ranges) | 36 | **90 KB** |

While this fits within the 500 KB player document limit, it's inefficient and wasteful.

---

## The Solution: Sparse Storage

### Concept

**Only store hands that are NOT `'unselected'`.**

Since the code already defaults to `'unselected'` when a key is missing (see `utils/handRanking.ts`), we don't need to store unselected hands at all.

### Optimized Size Breakdown

A typical poker range is about **15-20%** of all hands (25-35 hands selected).

| Component | Size |
|-----------|------|
| **Keys** (25 hands selected) | ~75 bytes |
| **Values** (25 × `'manual-selected'` = 16 bytes each) | ~400 bytes |
| **Firestore overhead** | ~50 bytes |
| **Total per range** | **~500 bytes (0.5 KB)** |

**Empty range**: **0 bytes** (no keys stored)

### Storage Comparison

| Scenario | Current | Optimized | Savings |
|----------|---------|-----------|---------|
| Empty range | 2.5 KB | 0 KB | **100%** |
| 15% range (25 hands) | 2.5 KB | 0.5 KB | **80%** |
| 50% range (85 hands) | 2.5 KB | 1.4 KB | **44%** |
| Full range (169 hands) | 2.5 KB | 2.7 KB | -8% (rare) |
| **Average** | 2.5 KB | **~0.4 KB** | **~85%** |

### Impact on Player Documents (Optimized)

| Scenario | Ranges | Current Size | Optimized Size |
|----------|--------|--------------|----------------|
| Light user (10 ranges) | 10 | 25 KB | **4 KB** |
| Regular user (20 ranges) | 20 | 50 KB | **8 KB** |
| Power user (36 ranges) | 36 | 90 KB | **15 KB** |

---

## Implementation Plan

### Phase 1: Update Core Functions

#### 1.1 Update `initializeRange()`

**Location**: `utils/handRanking.ts`

```typescript
// BEFORE: Creates 169 keys
export function initializeRange(): Range {
  const range: Range = {};
  for (const hand of ALL_HANDS) {
    range[hand] = 'unselected';
  }
  return range;
}

// AFTER: Returns empty object (sparse)
export function initializeRange(): Range {
  return {};  // Empty = all hands are 'unselected' by default
}
```

#### 1.2 Update `getHandState()`

**Location**: `utils/handRanking.ts`

```typescript
// BEFORE: Assumes key exists
export function getHandState(range: Range, hand: string): HandState {
  return range[hand] || 'unselected';
}

// AFTER: Same logic, but now it's the primary accessor
export function getHandState(range: Range, hand: string): HandState {
  return range[hand] ?? 'unselected';  // Missing key = unselected
}
```

#### 1.3 Update `setHandState()`

**Location**: `utils/handRanking.ts`

```typescript
// NEW: Sparse-aware setter
export function setHandState(range: Range, hand: string, state: HandState): Range {
  const newRange = { ...range };
  
  if (state === 'unselected') {
    // Remove the key instead of storing 'unselected'
    delete newRange[hand];
  } else {
    newRange[hand] = state;
  }
  
  return newRange;
}
```

#### 1.4 Update `clearRange()`

**Location**: `utils/handRanking.ts`

```typescript
// BEFORE: Sets all 169 hands to 'unselected'
export function clearRange(): Range {
  return initializeRange();
}

// AFTER: Returns empty object
export function clearRange(): Range {
  return {};  // Empty = all unselected
}
```

---

### Phase 2: Update Range Utilities

#### 2.1 Update `calculateRangePercentage()`

**Location**: `utils/handRanking.ts`

```typescript
// BEFORE: Counts 'manual-selected' and 'auto-selected' from all 169 keys
export function calculateRangePercentage(range: Range): number {
  const selectedCount = Object.values(range).filter(
    state => state === 'manual-selected' || state === 'auto-selected'
  ).length;
  return (selectedCount / 169) * 100;
}

// AFTER: Same logic, works with sparse storage
// (Only selected hands have keys, so this still works)
export function calculateRangePercentage(range: Range): number {
  const selectedCount = Object.values(range).filter(
    state => state === 'manual-selected' || state === 'auto-selected'
  ).length;
  return (selectedCount / 169) * 100;
}
```

#### 2.2 Update `mergeRanges()` (if exists)

```typescript
export function mergeRanges(base: Range, overlay: Range): Range {
  const merged: Range = { ...base };
  
  for (const [hand, state] of Object.entries(overlay)) {
    if (state === 'unselected') {
      delete merged[hand];  // Sparse: remove unselected
    } else {
      merged[hand] = state;
    }
  }
  
  return merged;
}
```

---

### Phase 3: Update Components

#### 3.1 Update `RangeGrid.tsx`

The grid iterates over all 169 hands to render the UI. This logic doesn't change - we still render all cells, but we use `getHandState()` which defaults missing keys to `'unselected'`.

```typescript
// In RangeGrid.tsx - No change needed if using getHandState()
{ALL_HANDS.map(hand => {
  const state = getHandState(range, hand);  // Returns 'unselected' if missing
  return (
    <HandCell 
      key={hand} 
      hand={hand} 
      state={state} 
      onPress={() => handleToggle(hand)} 
    />
  );
})}
```

#### 3.2 Update Hand Toggle Logic

```typescript
// In RangeGrid.tsx or useRange.ts
const handleToggle = (hand: string) => {
  const currentState = getHandState(range, hand);
  
  let newState: HandState;
  if (currentState === 'unselected') {
    newState = 'manual-selected';
  } else {
    newState = 'unselected';  // This will DELETE the key (sparse)
  }
  
  const newRange = setHandState(range, hand, newState);
  updateRange(newRange);
};
```

---

### Phase 4: Update Firebase Sync

#### 4.1 Sanitize Before Saving

**Location**: `services/firebase/players.ts`

```typescript
// Helper to ensure sparse storage before saving to Firebase
function sanitizeRangeForStorage(range: Range): Range {
  const sanitized: Range = {};
  
  for (const [hand, state] of Object.entries(range)) {
    // Only store non-unselected hands
    if (state !== 'unselected') {
      sanitized[hand] = state;
    }
  }
  
  return sanitized;
}

// Use in updatePlayerRanges()
export async function updatePlayerRanges(
  userId: string,
  playerId: string,
  ranges: Record<string, Range>
): Promise<void> {
  // Sanitize all ranges before saving
  const sanitizedRanges: Record<string, Range> = {};
  for (const [key, range] of Object.entries(ranges)) {
    sanitizedRanges[key] = sanitizeRangeForStorage(range);
  }

  const playerRef = doc(db, 'users', userId, 'players', playerId);
  await updateDoc(playerRef, {
    ranges: sanitizedRanges,
    updatedAt: serverTimestamp(),
  });
}
```

#### 4.2 Handle Loading (No Change Needed)

When loading from Firebase, sparse ranges work automatically:
- Missing keys → `getHandState()` returns `'unselected'`
- Existing keys → `getHandState()` returns the stored state

---

### Phase 5: Migration (Existing Data)

#### 5.1 One-Time Migration Script

For users with existing data in the old "full" format, we need to clean up:

**Location**: `services/migration.ts`

```typescript
/**
 * Migrate ranges from full storage to sparse storage
 * Removes all 'unselected' keys from existing ranges
 */
export async function migrateRangesToSparse(userId: string): Promise<{
  playersProcessed: number;
  rangesOptimized: number;
  bytesBeforeEstimate: number;
  bytesAfterEstimate: number;
}> {
  const result = {
    playersProcessed: 0,
    rangesOptimized: 0,
    bytesBeforeEstimate: 0,
    bytesAfterEstimate: 0,
  };

  const playersRef = collection(db, 'users', userId, 'players');
  const snapshot = await getDocs(playersRef);

  for (const playerDoc of snapshot.docs) {
    const data = playerDoc.data();
    const ranges = data.ranges || {};
    
    let hasChanges = false;
    const optimizedRanges: Record<string, Range> = {};

    for (const [rangeKey, range] of Object.entries(ranges)) {
      const originalSize = JSON.stringify(range).length;
      result.bytesBeforeEstimate += originalSize;

      const optimizedRange: Range = {};
      for (const [hand, state] of Object.entries(range as Range)) {
        if (state !== 'unselected') {
          optimizedRange[hand] = state;
        } else {
          hasChanges = true;  // Found an 'unselected' to remove
        }
      }

      optimizedRanges[rangeKey] = optimizedRange;
      result.bytesAfterEstimate += JSON.stringify(optimizedRange).length;
      result.rangesOptimized++;
    }

    if (hasChanges) {
      await updateDoc(playerDoc.ref, {
        ranges: optimizedRanges,
        updatedAt: serverTimestamp(),
      });
    }

    result.playersProcessed++;
  }

  console.log(`[Migration] Sparse migration complete:`, {
    ...result,
    savingsPercent: Math.round(
      (1 - result.bytesAfterEstimate / result.bytesBeforeEstimate) * 100
    ),
  });

  return result;
}
```

#### 5.2 Add Migration Button (Optional)

You can add a temporary button in Settings to trigger this migration, similar to the database migration button we added before.

---

## Testing Plan

### Unit Tests

**Location**: `utils/__tests__/handRanking.test.ts`

```typescript
describe('Sparse Range Storage', () => {
  describe('initializeRange', () => {
    it('should return an empty object', () => {
      const range = initializeRange();
      expect(Object.keys(range)).toHaveLength(0);
    });
  });

  describe('getHandState', () => {
    it('should return "unselected" for missing keys', () => {
      const range = {};
      expect(getHandState(range, 'AA')).toBe('unselected');
      expect(getHandState(range, 'T9o')).toBe('unselected');
    });

    it('should return stored state for existing keys', () => {
      const range = { 'AA': 'manual-selected' };
      expect(getHandState(range, 'AA')).toBe('manual-selected');
    });
  });

  describe('setHandState', () => {
    it('should add key for non-unselected state', () => {
      const range = {};
      const newRange = setHandState(range, 'AA', 'manual-selected');
      expect(newRange['AA']).toBe('manual-selected');
    });

    it('should remove key when setting to unselected', () => {
      const range = { 'AA': 'manual-selected' };
      const newRange = setHandState(range, 'AA', 'unselected');
      expect(newRange['AA']).toBeUndefined();
      expect(Object.keys(newRange)).toHaveLength(0);
    });
  });

  describe('calculateRangePercentage', () => {
    it('should return 0 for empty range', () => {
      expect(calculateRangePercentage({})).toBe(0);
    });

    it('should calculate correctly with sparse storage', () => {
      const range = {
        'AA': 'manual-selected',
        'KK': 'manual-selected',
        'QQ': 'auto-selected',
      };
      // 3 hands out of 169 = ~1.78%
      expect(calculateRangePercentage(range)).toBeCloseTo(1.78, 1);
    });
  });

  describe('sanitizeRangeForStorage', () => {
    it('should remove all unselected keys', () => {
      const range = {
        'AA': 'manual-selected',
        'KK': 'unselected',
        'QQ': 'auto-selected',
        'JJ': 'unselected',
      };
      const sanitized = sanitizeRangeForStorage(range);
      expect(Object.keys(sanitized)).toHaveLength(2);
      expect(sanitized['KK']).toBeUndefined();
      expect(sanitized['JJ']).toBeUndefined();
    });
  });
});
```

### Integration Tests

```typescript
describe('Sparse Range Integration', () => {
  it('should save and load ranges correctly with sparse storage', async () => {
    const userId = 'test-user';
    const playerId = 'test-player';
    
    // Create a sparse range
    const range = {
      'AA': 'manual-selected',
      'AKs': 'manual-selected',
    };
    
    // Save to Firebase
    await updatePlayerRanges(userId, playerId, { 'early_open-raise': range });
    
    // Load from Firebase
    const loaded = await getPlayerRanges(userId, playerId);
    
    // Verify sparse storage
    expect(Object.keys(loaded['early_open-raise'])).toHaveLength(2);
    expect(getHandState(loaded['early_open-raise'], 'AA')).toBe('manual-selected');
    expect(getHandState(loaded['early_open-raise'], 'KK')).toBe('unselected');
  });
});
```

---

## Rollout Plan

### Step 1: Update Core Utilities (Low Risk)
1. Update `initializeRange()` to return `{}`
2. Update `setHandState()` to delete keys for `'unselected'`
3. Run all existing tests to ensure nothing breaks

### Step 2: Update Firebase Sync (Medium Risk)
1. Add `sanitizeRangeForStorage()` helper
2. Update `updatePlayerRanges()` to sanitize before saving
3. Test with a new player to verify sparse storage

### Step 3: Run Migration (One-Time)
1. Add migration button or run script manually
2. Migrate existing users' ranges to sparse format
3. Verify storage reduction in Firebase console

### Step 4: Remove Migration Code (Cleanup)
1. After all users have been migrated, remove migration button
2. Keep `sanitizeRangeForStorage()` as a safety net

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| **Size per range** | 2.5 KB | ~0.4 KB |
| **36 ranges (max)** | 90 KB | 15 KB |
| **Storage reduction** | - | **~85%** |
| **Code complexity** | Simple | Slightly more |
| **Breaking changes** | - | None (backward compatible) |

**Key Benefits:**
1. ✅ **85% storage reduction** per player
2. ✅ **Backward compatible** - old data works, new data is optimized
3. ✅ **No UI changes** - grid still renders all 169 hands
4. ✅ **Lower Firebase costs** - less storage, less bandwidth
5. ✅ **Faster sync** - smaller documents transfer faster

**Implementation Priority:** Medium (not urgent, but valuable for scale)
