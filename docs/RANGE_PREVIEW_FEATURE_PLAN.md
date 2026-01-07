# Range Preview Feature Implementation Plan

## Overview

Add the ability for users to visually preview shared ranges **before accepting** them. Currently, when a user receives shared ranges from a friend, they only see:
- Player name
- Number of ranges defined
- List of position/action combinations

**This feature adds a visual preview** showing the actual 13x13 hand grid for each range, so users can evaluate the quality and relevance of shared ranges before importing.

---

## Problem Statement

**Current Behavior:**
Users receiving shared ranges can only see metadata (count and position/action list). They must accept the ranges "blind" without knowing:
- Which specific hands are included in each range
- The overall range composition (tight, loose, balanced)
- Whether the ranges align with their existing observations

**Proposed Solution:**
Add a visual grid preview inside a modal that shows the actual hand selections for each shared range before the user decides to accept or dismiss.

---

## User Flow

### Receiving Ranges (Updated)

1. User taps on a friend with pending range shares
2. `PendingSharesModal` opens showing share cards
3. Each share card now includes a **"Preview Ranges"** button
4. User taps "Preview Ranges"
5. A **`RangePreviewModal`** opens showing:
   - Player name at the top
   - Tabs or a scrollable list for each position/action
   - **Visual 13x13 grid** for the selected range (read-only)
   - Range statistics (X% of hands, Y hands selected)
6. User can navigate between different ranges in the share
7. User closes the preview and decides to:
   - **"Copy to Player"** → Selects existing player
   - **"Create New"** → Creates new player with shared name
   - **"Dismiss"** → Removes the share without importing

### Visual Flow Diagram

```
┌─────────────────────────────────────────┐
│        Shared Ranges from Mike          │
│         (PendingSharesModal)            │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │  "Villain1" Ranges                │  │
│  │  8 ranges defined                 │  │
│  │  • Early: Open-Raise, 3-Bet       │  │
│  │  • Late: Open-Raise, Call         │  │
│  │                                   │  │
│  │  [👁️ Preview Ranges]              │  │ ◀─ NEW BUTTON
│  │                                   │  │
│  │  [Copy to Player] [Create New]    │  │
│  │  [Dismiss]                        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              │
              │ tap "Preview Ranges"
              ▼
┌─────────────────────────────────────────┐
│        Range Preview                    │
│        "Villain1"                       │
│         (RangePreviewModal)             │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │ [Early ▼] [Open-Raise ▼]           ││ ◀─ Position/Action Selector
│  │    or Tab Navigation               ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  📊 42 hands (25%)                 ││ ◀─ Range Stats
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │      A K Q J T 9 8 7 6 5 4 3 2     ││
│  │   A ■ ■ ■ ■ ■ □ □ □ □ □ □ □ □     ││
│  │   K ■ ■ ■ ■ ■ □ □ □ □ □ □ □ □     ││
│  │   Q ■ ■ ■ ■ □ □ □ □ □ □ □ □ □     ││ ◀─ READ-ONLY Grid
│  │   J ■ ■ ■ ■ □ □ □ □ □ □ □ □ □     ││
│  │   T ■ ■ □ □ ■ □ □ □ □ □ □ □ □     ││
│  │   ...                              ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ ■ Pairs  ■ Suited  ■ Offsuit       ││ ◀─ Legend
│  └─────────────────────────────────────┘│
│                                         │
│         [Close Preview]                 │
└─────────────────────────────────────────┘
```

---

## UI Components

### 1. RangePreviewModal (New Component)

**File**: `components/sharing/RangePreviewModal.tsx`

A full-screen or pageSheet modal that displays:
- Header with player name and close button
- Position/Action selector (dropdown or tabs)
- Read-only RangeGrid showing the selected range
- Range statistics
- Legend for hand types

**Props:**
```typescript
interface RangePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  playerName: string;
  ranges: Record<string, Range>;  // All ranges from the share
  rangeKeys: string[];            // Available position_action keys
}
```

### 2. Updated PendingSharesModal

**File**: `components/sharing/PendingSharesModal.tsx`

Add "Preview Ranges" button to each share card that opens the `RangePreviewModal`.

### 3. RangePreviewSelector (Optional Sub-component)

**File**: `components/sharing/RangePreviewSelector.tsx`

A simplified position/action selector optimized for preview mode:
- Only shows positions/actions that exist in the share
- Horizontal scrollable tabs or dropdown menus
- Highlights current selection

---

## Component Hierarchy

```
PendingSharesModal
├── ShareCard (for each pending share)
│   ├── Share metadata (player name, count, date)
│   ├── Range preview list (position/action summary)
│   ├── [NEW] "Preview Ranges" button
│   │   └── Opens RangePreviewModal
│   ├── "Copy to Player" button
│   ├── "Create New" button
│   └── "Dismiss" button
│
└── RangePreviewModal [NEW]
    ├── Header (player name, close button)
    ├── RangePreviewSelector [NEW]
    │   ├── Position Picker (Early/Middle/Late/Blinds)
    │   └── Action Picker (Open-Raise/3-Bet/Call/etc.)
    ├── RangeStats (existing component)
    └── RangeGrid (existing component, readonly mode)
```

---

## Implementation Details

### RangePreviewModal Component

```tsx
// components/sharing/RangePreviewModal.tsx

interface RangePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  playerName: string;
  ranges: Record<string, Range>;
  rangeKeys: string[];
}

export function RangePreviewModal({
  visible,
  onClose,
  playerName,
  ranges,
  rangeKeys,
}: RangePreviewModalProps) {
  // State for currently selected range
  const [selectedKey, setSelectedKey] = useState<string>(rangeKeys[0] || '');
  
  // Parse position and action from key
  const [position, action] = selectedKey.split('_') as [Position, Action];
  
  // Get the range data for the selected key
  const currentRange = ranges[selectedKey] || {};
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {/* Header */}
      <Header playerName={playerName} onClose={onClose} />
      
      {/* Range Selector */}
      <RangePreviewSelector
        rangeKeys={rangeKeys}
        selectedKey={selectedKey}
        onSelectKey={setSelectedKey}
      />
      
      {/* Stats */}
      <RangeStats range={currentRange} showDetails={false} />
      
      {/* Grid - READ ONLY */}
      <RangeGrid
        range={currentRange}
        onRangeChange={() => {}} // No-op for readonly
        readonly={true}
        showPercentage={false}
      />
      
      {/* Close Button */}
      <CloseButton onPress={onClose} />
    </Modal>
  );
}
```

### RangePreviewSelector Component

```tsx
// components/sharing/RangePreviewSelector.tsx

interface RangePreviewSelectorProps {
  rangeKeys: string[];           // Available keys like ["early_open-raise", "late_3bet"]
  selectedKey: string;
  onSelectKey: (key: string) => void;
}

export function RangePreviewSelector({
  rangeKeys,
  selectedKey,
  onSelectKey,
}: RangePreviewSelectorProps) {
  // Group keys by position
  const groupedKeys = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const key of rangeKeys) {
      const [position] = key.split('_');
      if (!groups[position]) groups[position] = [];
      groups[position].push(key);
    }
    return groups;
  }, [rangeKeys]);
  
  // Render as horizontal scrollable tabs
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {rangeKeys.map((key) => (
        <TouchableOpacity
          key={key}
          style={[styles.tab, selectedKey === key && styles.tabActive]}
          onPress={() => onSelectKey(key)}
        >
          <Text style={styles.tabText}>{formatRangeKey(key)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// Helper to format "early_open-raise" -> "Early Open-Raise"
function formatRangeKey(key: string): string {
  return key
    .split('_')
    .map(part => part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-'))
    .join(' ');
}
```

### Updated PendingSharesModal

Add the preview button and state management:

```tsx
// In PendingSharesModal.tsx

const [previewModalVisible, setPreviewModalVisible] = useState(false);
const [previewShare, setPreviewShare] = useState<RangeShare | null>(null);

const handlePreview = (share: RangeShare) => {
  setPreviewShare(share);
  setPreviewModalVisible(true);
};

// In renderShareItem, add button:
<TouchableOpacity
  style={[styles.previewButton]}
  onPress={() => handlePreview(item)}
>
  <Ionicons name="eye-outline" size={16} color="#fff" />
  <Text style={styles.previewButtonText}>Preview Ranges</Text>
</TouchableOpacity>

// At the end of the component, add the modal:
{previewShare && (
  <RangePreviewModal
    visible={previewModalVisible}
    onClose={() => {
      setPreviewModalVisible(false);
      setPreviewShare(null);
    }}
    playerName={previewShare.playerName}
    ranges={previewShare.ranges}
    rangeKeys={previewShare.rangeKeys}
  />
)}
```

---

## Files to Create

```
components/sharing/
├── RangePreviewModal.tsx          # Main preview modal
└── RangePreviewSelector.tsx       # Position/action tab selector

styles/sharing/
└── range-preview.styles.ts        # Styles for preview components
```

## Files to Modify

```
components/sharing/PendingSharesModal.tsx
├── Add "Preview Ranges" button to share cards
├── Add state for preview modal visibility
└── Import and render RangePreviewModal

components/sharing/index.ts
└── Export new components

styles/sharing/index.styles.ts
└── Add styles for preview button (or import from new file)
```

---

## Implementation Phases

### Phase 1: Core Preview Modal

- [ ] Create `RangePreviewModal.tsx` component
- [ ] Create `RangePreviewSelector.tsx` component  
- [ ] Create `range-preview.styles.ts` for styling
- [ ] Add exports to `components/sharing/index.ts`

### Phase 2: Integration with PendingSharesModal

- [ ] Add "Preview Ranges" button to share cards
- [ ] Add state management for preview modal
- [ ] Wire up preview button to open modal
- [ ] Test preview functionality with mock data

### Phase 3: Polish & Edge Cases

- [ ] Handle empty ranges gracefully
- [ ] Add loading state if ranges are large
- [ ] Ensure proper scrolling on smaller devices
- [ ] Add accessibility labels
- [ ] Test dark/light mode themes
- [ ] Add haptic feedback on tab selection

### Phase 4: Testing

- [ ] Unit tests for formatRangeKey helper
- [ ] Component tests for RangePreviewModal
- [ ] Integration test with PendingSharesModal
- [ ] Manual testing on iOS and Android

---

## Design Considerations

### 1. Responsive Grid Size

The existing `RangeGrid` component calculates cell size based on screen width:
```typescript
const screenWidth = Dimensions.get('window').width;
const cellSize = Math.floor(gridSize / 14);
```

For the preview modal, we may want slightly smaller cells since the modal might have additional UI elements. Consider adding a `compact` prop to `RangeGrid`:
```typescript
interface RangeGridProps {
  // ... existing props
  compact?: boolean;  // Slightly smaller grid for modals
}
```

### 2. Tab Navigation vs Dropdown

**Option A: Horizontal Scrollable Tabs**
- Pros: All options visible, quick switching
- Cons: May be cramped with many ranges

**Option B: Two Dropdowns (Position + Action)**
- Pros: Clean UI, familiar pattern
- Cons: Extra taps required

**Recommendation:** Use horizontal scrollable tabs for up to 6 ranges, switch to dropdown for more than 6.

### 3. Performance

Since `RangeGrid` is read-only in preview mode:
- Skip `onRangeChange` callback setup
- Consider memoizing the grid cells
- Don't need haptic feedback on cell taps

### 4. Empty Range Handling

If a rangeKey exists but the range object is empty (all unselected):
- Show the grid with all cells in unselected state
- Display a small info message: "No hands selected in this range"

---

## Accessibility

- Add `accessibilityLabel` to preview button: "Preview ranges for [player name]"
- Add `accessibilityRole="tablist"` to range selector
- Add `accessibilityState={{ selected: true/false }}` to tabs
- Ensure grid cells have appropriate contrast ratios
- Support VoiceOver navigation through tabs

---

## Theme Support

Both dark and light modes should be supported:

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Modal background | `#ffffff` | `#1c1c1e` |
| Tab background (inactive) | `#f5f5f5` | `#2c2c2e` |
| Tab background (active) | `#0a7ea4` | `#0a7ea4` |
| Tab text (inactive) | `#666666` | `#999999` |
| Tab text (active) | `#ffffff` | `#ffffff` |

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Share has only 1 range | Hide selector, show single range directly |
| Share has 0 ranges | Should not happen (validation on send), show error |
| Very long player name | Truncate with ellipsis in header |
| Range with all hands unselected | Show empty grid with info message |
| User rotates device | Grid should resize responsively |

---

## Selective Range Import Feature

### Overview

Allow users to **selectively accept or dismiss individual ranges** from a share, rather than accepting or dismissing all ranges at once. This gives users fine-grained control over which position/action combinations they want to import.

### Problem Statement

**Current Behavior:**
When accepting a shared range, users must accept ALL ranges in the share. If they only want 3 out of 8 ranges, they have no option to exclude the unwanted ones.

**Proposed Solution:**
Add checkboxes/toggles to each range tab in the preview modal, allowing users to select which ranges to import. The "Accept" action only imports the selected ranges.

### User Flow (Selective Import)

1. User opens `RangePreviewModal` to preview shared ranges
2. Each range tab now has a **checkbox/toggle** indicating inclusion
3. By default, **all ranges are selected** (checked)
4. User can:
   - **Tap the checkbox** on a tab to toggle inclusion/exclusion
   - **Preview each range** by tapping the tab (separate from checkbox)
   - See a **summary counter** showing "X of Y ranges selected"
5. User taps **"Accept Selected"** button at the bottom
6. Only the checked ranges are imported to the target player
7. The share is updated or deleted based on what remains

### Visual Flow Diagram (Updated)

```
┌─────────────────────────────────────────────────────┐
│              Range Preview                          │
│              "Villain1"                             │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │  Select ranges to import:                       ││
│  │                                                 ││
│  │  [✓] EP: Open    [✓] EP: 3-Bet   [ ] MP: Open  ││ ◀─ Checkboxes on tabs
│  │  [✓] LP: Open    [ ] LP: Call    [✓] BB: 3-Bet ││
│  │                                                 ││
│  │  ────────────────────────────────────────────   ││
│  │  4 of 6 ranges selected                        ││ ◀─ Selection counter
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  Currently viewing: Early Position - Open Raise     │
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │  📊 42 hands (25%)                             ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │      A K Q J T 9 8 7 6 5 4 3 2                 ││
│  │   A ■ ■ ■ ■ ■ □ □ □ □ □ □ □ □                 ││
│  │   K ■ ■ ■ ■ ■ □ □ □ □ □ □ □ □                 ││
│  │   ...                                          ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │  [Select All]  [Deselect All]                  ││ ◀─ Bulk actions
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ┌─────────────────────────────────────────────────┐│
│  │  [Cancel]           [Accept 4 Ranges]          ││ ◀─ Dynamic button text
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### UI Components (Selective Import)

#### 1. Updated RangePreviewSelector

Add checkbox state to each tab:

```tsx
interface RangePreviewSelectorProps {
  rangeKeys: string[];
  selectedKey: string;                    // Currently viewing
  onSelectKey: (key: string) => void;
  selectedForImport: Set<string>;         // NEW: Keys selected for import
  onToggleImport: (key: string) => void;  // NEW: Toggle import selection
}
```

Each tab renders as:
```
┌─────────────────────┐
│ [✓] EP: Open-Raise  │  ◀─ Checkbox + Label
└─────────────────────┘
```

- Tapping the **checkbox** toggles import selection
- Tapping the **label/tab area** switches the preview view
- Visual distinction: selected tabs have accent border, deselected are dimmed

#### 2. Updated RangePreviewModal

Add state for import selection and actions:

```tsx
interface RangePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  playerName: string;
  ranges: Record<string, Range>;
  rangeKeys: string[];
  onAcceptSelected: (selectedKeys: string[]) => void;  // NEW: Accept callback
}

// Inside component:
const [selectedForImport, setSelectedForImport] = useState<Set<string>>(
  new Set(rangeKeys) // All selected by default
);

const toggleImport = (key: string) => {
  setSelectedForImport(prev => {
    const next = new Set(prev);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    return next;
  });
};

const selectAll = () => setSelectedForImport(new Set(rangeKeys));
const deselectAll = () => setSelectedForImport(new Set());

const handleAccept = () => {
  onAcceptSelected(Array.from(selectedForImport));
};
```

#### 3. Selection Summary Bar

A small bar showing selection status:

```tsx
<View style={styles.selectionSummary}>
  <Text style={styles.selectionText}>
    {selectedForImport.size} of {rangeKeys.length} ranges selected
  </Text>
</View>
```

#### 4. Bulk Action Buttons

Quick select/deselect all:

```tsx
<View style={styles.bulkActions}>
  <TouchableOpacity onPress={selectAll}>
    <Text>Select All</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={deselectAll}>
    <Text>Deselect All</Text>
  </TouchableOpacity>
</View>
```

#### 5. Dynamic Accept Button

Button text reflects selection:

```tsx
<TouchableOpacity 
  style={styles.acceptButton}
  onPress={handleAccept}
  disabled={selectedForImport.size === 0}
>
  <Text>
    {selectedForImport.size === 0 
      ? 'Select ranges to import'
      : `Accept ${selectedForImport.size} Range${selectedForImport.size > 1 ? 's' : ''}`
    }
  </Text>
</TouchableOpacity>
```

### Backend Changes (Selective Import)

#### Updated Import Functions

Modify `importToExistingPlayer` and `importToNewPlayer` to accept a subset of keys:

```typescript
// In useRangeSharing.ts

const importToExistingPlayer = useCallback(async (
  shareId: string,
  playerId: string,
  selectedKeys?: string[]  // NEW: Optional subset of keys to import
): Promise<ImportRangesResult> => {
  const share = await rangeSharingService.getRangeShare(shareId);
  
  // Filter ranges to only selected keys
  const rangesToImport = selectedKeys 
    ? Object.fromEntries(
        Object.entries(share.ranges).filter(([key]) => selectedKeys.includes(key))
      )
    : share.ranges;
  
  // ... rest of import logic using rangesToImport
}, []);
```

#### Partial Share Handling

When user accepts only some ranges:

**Option A: Delete entire share after any import**
- Simple implementation
- User loses access to remaining ranges
- ✅ Recommended for V1

**Option B: Update share to remove imported ranges**
- More complex
- User can revisit and import remaining ranges later
- Better UX but more edge cases
- Consider for V2

### Implementation Phases (Selective Import)

#### Phase 1: UI State Management
- [ ] Add `selectedForImport` state to `RangePreviewModal`
- [ ] Update `RangePreviewSelector` with checkbox UI
- [ ] Add selection counter component
- [ ] Add bulk action buttons (Select All / Deselect All)

#### Phase 2: Visual Feedback
- [ ] Style selected vs deselected tabs differently
- [ ] Add checkbox icons (checked/unchecked)
- [ ] Dim deselected range tabs
- [ ] Update accept button text dynamically

#### Phase 3: Backend Integration
- [ ] Update `importToExistingPlayer` to accept `selectedKeys`
- [ ] Update `importToNewPlayer` to accept `selectedKeys`
- [ ] Update `PendingSharesModal` to pass selected keys
- [ ] Handle empty selection (disable accept button)

#### Phase 4: Testing
- [ ] Test selecting/deselecting individual ranges
- [ ] Test Select All / Deselect All
- [ ] Test partial import flow
- [ ] Test edge case: deselect all then try to accept

### Edge Cases (Selective Import)

| Scenario | Handling |
|----------|----------|
| User deselects all ranges | Disable "Accept" button, show helper text |
| User selects only 1 of 8 | Import only that one, delete share |
| Share has only 1 range | Hide checkboxes, standard accept flow |
| User closes modal without accepting | No changes, share remains intact |

### Accessibility (Selective Import)

- Checkboxes: `accessibilityRole="checkbox"`, `accessibilityState={{ checked }}`
- Selection counter: `accessibilityLiveRegion="polite"` for screen reader updates
- Accept button: Dynamic `accessibilityLabel` reflecting count

---

## Future Enhancements

1. **Comparison View**: Show shared range side-by-side with user's existing range for the same position/action
2. **Range Annotations**: Add notes about why certain hands are included
3. **Export/Share Preview**: Generate shareable image of the range preview
4. **Partial Share Retention**: Keep unimported ranges in the share for later (V2)

---

## Summary

This feature adds visual transparency to the range sharing process by allowing recipients to preview the actual hand selections before accepting. It leverages existing components (`RangeGrid`, `RangeStats`) in read-only mode within a new `RangePreviewModal`.

**Key Benefits:**
- Users can evaluate shared ranges before committing
- Reduces accidental imports of unwanted data
- Builds trust in the sharing system
- Uses familiar visual language (same grid as range editor)

**Estimated Effort:** 
- ~3-4 hours for core implementation
- ~1-2 hours for polish and testing

Ready to proceed when you give the go-ahead!
