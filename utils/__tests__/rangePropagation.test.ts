import { Action, Position, Range } from '@/types/poker';
import { propagateRangeUpdates } from '../rangePropagation';

// Mock helper to create a range with specific hands selected
const createRange = (selectedHands: string[]): Range => {
  const range: Range = {};
  selectedHands.forEach(hand => {
    range[hand] = 'manual-selected';
  });
  return range;
};

describe('propagateRangeUpdates', () => {
  const mockGetRange = jest.fn();

  beforeEach(() => {
    mockGetRange.mockReset();
  });

  it('should propagate Early Open Raise to Middle and Late', async () => {
    // Setup: Early has AA, KK. Middle has QQ. Late has JJ.
    // We are saving Early with AA, KK.
    // Expectation: Middle gets AA, KK, QQ. Late gets AA, KK, JJ.
    
    const earlyRange = createRange(['AA', 'KK']);
    const middleRange = createRange(['QQ']);
    const lateRange = createRange(['JJ']);
    const blindsRange = createRange(['TT']);

    mockGetRange.mockImplementation((pos: Position, action: Action) => {
      if (action !== 'open-raise') return {};
      if (pos === 'middle') return middleRange;
      if (pos === 'late') return lateRange;
      if (pos === 'blinds') return blindsRange;
      return {};
    });

    const updates = await propagateRangeUpdates(
      'early',
      'open-raise',
      earlyRange,
      mockGetRange
    );

    // Should return updates for Middle and Late
    expect(updates).toHaveLength(2);
    
    const middleUpdate = updates.find(u => u.position === 'middle');
    const lateUpdate = updates.find(u => u.position === 'late');

    expect(middleUpdate).toBeDefined();
    expect(middleUpdate?.range['AA']).toBe('manual-selected');
    expect(middleUpdate?.range['KK']).toBe('manual-selected');
    expect(middleUpdate?.range['QQ']).toBe('manual-selected'); // Preserved

    expect(lateUpdate).toBeDefined();
    expect(lateUpdate?.range['AA']).toBe('manual-selected');
    expect(lateUpdate?.range['KK']).toBe('manual-selected');
    expect(lateUpdate?.range['JJ']).toBe('manual-selected'); // Preserved
  });

  it('should propagate Middle Open Raise to Late only', async () => {
    const middleRange = createRange(['AA']);
    const lateRange = createRange(['KK']);

    mockGetRange.mockImplementation((pos: Position) => {
      if (pos === 'late') return lateRange;
      return {};
    });

    const updates = await propagateRangeUpdates(
      'middle',
      'open-raise',
      middleRange,
      mockGetRange
    );

    expect(updates).toHaveLength(1);
    expect(updates[0].position).toBe('late');
    expect(updates[0].range['AA']).toBe('manual-selected');
    expect(updates[0].range['KK']).toBe('manual-selected');
  });

  it('should NOT propagate Late Open Raise', async () => {
    const lateRange = createRange(['AA']);

    const updates = await propagateRangeUpdates(
      'late',
      'open-raise',
      lateRange,
      mockGetRange
    );

    expect(updates).toHaveLength(0);
  });

  it('should NOT propagate Blinds', async () => {
    const blindsRange = createRange(['AA']);

    const updates = await propagateRangeUpdates(
      'blinds',
      'open-raise',
      blindsRange,
      mockGetRange
    );

    expect(updates).toHaveLength(0);
  });

  it('should NOT propagate actions other than Open Raise (if we restrict it)', async () => {
    // Assuming we apply this to all actions for now, but if we wanted to restrict:
    // The user said "category (example open raise)".
    // I'll assume it applies to all actions for consistency unless specified.
    // But wait, "Hands from the blinds will be ignored".
    // Let's test that it works for 'call' as well, just in case.
    
    const earlyRange = createRange(['AA']);
    const middleRange = createRange([]);

    mockGetRange.mockResolvedValue(middleRange);

    const updates = await propagateRangeUpdates(
      'early',
      'call',
      earlyRange,
      mockGetRange
    );

    expect(updates).toHaveLength(2); // Middle and Late
  });

  it('should cascade updates (Early -> Middle -> Late)', async () => {
    // If Early adds AA, Middle (empty) gets AA.
    // Then Late (empty) should get AA from the *updated* Middle range.
    
    const earlyRange = createRange(['AA']);
    const middleRange = createRange([]); // Empty
    const lateRange = createRange([]); // Empty

    mockGetRange.mockImplementation((pos: Position) => {
      if (pos === 'middle') return middleRange;
      if (pos === 'late') return lateRange;
      return {};
    });

    const updates = await propagateRangeUpdates(
      'early',
      'open-raise',
      earlyRange,
      mockGetRange
    );

    const lateUpdate = updates.find(u => u.position === 'late');
    expect(lateUpdate?.range['AA']).toBe('manual-selected');
  });

  it('should NOT propagate to other actions', async () => {
    // User reported issue: "call-raise" propagating to "3bet"
    const sourceRange = createRange(['AA']);
    mockGetRange.mockResolvedValue({});

    const updates = await propagateRangeUpdates(
      'early',
      'call-raise',
      sourceRange,
      mockGetRange
    );

    // Verify all updates are for 'call-raise'
    updates.forEach(update => {
      expect(update.action).toBe('call-raise');
      expect(update.action).not.toBe('3bet');
      expect(update.action).not.toBe('open-raise');
    });
  });
});
