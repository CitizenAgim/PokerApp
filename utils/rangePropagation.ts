import { Action, Position, Range } from '@/types/poker';

export interface RangeUpdate {
  position: Position;
  action: Action;
  range: Range;
}

const POSITION_ORDER: Position[] = ['early', 'middle', 'late', 'blinds'];

export async function propagateRangeUpdates(
  sourcePosition: Position,
  action: Action,
  sourceRange: Range,
  getRange: (position: Position, action: Action) => Promise<Range> | Range
): Promise<RangeUpdate[]> {
  // "Hands from the blinds will be ignored" -> Do not propagate FROM blinds
  if (sourcePosition === 'blinds') {
    return [];
  }

  const updates: RangeUpdate[] = [];
  const startIndex = POSITION_ORDER.indexOf(sourcePosition);
  
  if (startIndex === -1) return [];

  // We use a "current" range that accumulates hands as we move forward
  // This ensures that if Early has AA, it propagates to Middle, and then Middle (now having AA) propagates to Late
  let currentRange = { ...sourceRange };

  // Iterate through subsequent positions
  for (let i = startIndex + 1; i < POSITION_ORDER.length; i++) {
    const targetPosition = POSITION_ORDER[i];

    // "Hands from the blinds will be ignored" -> Do not propagate TO blinds either?
    // The user said "propagate for later positions (blinds)" in the first prompt, 
    // but "Hands from the blinds will be ignored" in the second.
    // Given the ambiguity and standard poker logic (SB/BB ranges are distinct), 
    // and the explicit "ignored" instruction, I will exclude Blinds as a target for now.
    if (targetPosition === 'blinds') {
      continue;
    }

    const targetRange = await getRange(targetPosition, action);
    const updatedRange = { ...targetRange };
    let hasChanges = false;

    // Merge logic: Add hands from currentRange to updatedRange
    Object.entries(currentRange).forEach(([hand, state]) => {
      if (state === 'manual-selected' || state === 'auto-selected') {
        // If the hand is not already selected in the target, select it
        if (updatedRange[hand] !== 'manual-selected' && updatedRange[hand] !== 'auto-selected') {
          updatedRange[hand] = 'manual-selected'; // Mark as manually selected by propagation
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      updates.push({
        position: targetPosition,
        action,
        range: updatedRange,
      });
      // Update currentRange for the next iteration (cascade effect)
      currentRange = updatedRange;
    } else {
      // Even if no changes, we should use the target range as the base for the next position
      // because it might contain hands that the previous position didn't have, 
      // but which should propagate to the NEXT position.
      // Example: Early has AA. Middle has KK. Late has nothing.
      // Early -> Middle: Middle has AA, KK. (Change)
      // Middle -> Late: Late should get AA, KK.
      currentRange = updatedRange;
    }
  }

  return updates;
}
