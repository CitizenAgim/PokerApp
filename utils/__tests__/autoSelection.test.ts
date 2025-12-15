import { Range } from '@/types/poker';
import { toggleHandInRange, updateAutoSelections } from '../handRanking';

describe('Auto Selection Logic', () => {
  it('should auto-select higher pairs when a pair is selected', () => {
    // Select 88
    let range: Range = {};
    range['88'] = 'manual-selected';
    
    range = updateAutoSelections(range);
    
    // 99+ should be auto-selected
    expect(range['99']).toBe('auto-selected');
    expect(range['TT']).toBe('auto-selected');
    expect(range['JJ']).toBe('auto-selected');
    expect(range['QQ']).toBe('auto-selected');
    expect(range['KK']).toBe('auto-selected');
    expect(range['AA']).toBe('auto-selected');
    
    // 77 should be unselected
    expect(range['77']).toBeUndefined();
  });

  it('should auto-select higher suited hands (same high card)', () => {
    // Select A8s
    let range: Range = {};
    range['A8s'] = 'manual-selected';
    
    range = updateAutoSelections(range);
    
    // A9s+ should be auto-selected
    expect(range['A9s']).toBe('auto-selected');
    expect(range['ATs']).toBe('auto-selected');
    expect(range['AJs']).toBe('auto-selected');
    expect(range['AQs']).toBe('auto-selected');
    expect(range['AKs']).toBe('auto-selected');
    
    // A7s should be unselected
    expect(range['A7s']).toBeUndefined();
    
    // K8s should be unselected (different high card)
    expect(range['K8s']).toBeUndefined();
  });

  it('should auto-select higher offsuit hands (same high card)', () => {
    // Select A8o
    let range: Range = {};
    range['A8o'] = 'manual-selected';
    
    range = updateAutoSelections(range);
    
    // A9o+ should be auto-selected
    expect(range['A9o']).toBe('auto-selected');
    expect(range['ATo']).toBe('auto-selected');
    expect(range['AJo']).toBe('auto-selected');
    expect(range['AQo']).toBe('auto-selected');
    expect(range['AKo']).toBe('auto-selected');
  });

  it('should respect manual-unselected', () => {
    // Select 88, but explicitly exclude AA
    let range: Range = {};
    range['88'] = 'manual-selected';
    range['AA'] = 'manual-unselected';
    
    range = updateAutoSelections(range);
    
    expect(range['99']).toBe('auto-selected');
    expect(range['AA']).toBe('manual-unselected');
  });

  it('should handle toggle cycle correctly', () => {
    let range: Range = {};
    
    // 1. Toggle 88 ON
    range = toggleHandInRange(range, '88');
    expect(range['88']).toBe('manual-selected');
    expect(range['AA']).toBe('auto-selected');
    
    // 2. Toggle AA (Auto -> Manual-Unselected)
    range = toggleHandInRange(range, 'AA');
    expect(range['AA']).toBe('manual-unselected');
    expect(range['KK']).toBe('auto-selected'); // KK still auto
    
    // 3. Toggle AA (Manual-Unselected -> Manual-Selected)
    range = toggleHandInRange(range, 'AA');
    expect(range['AA']).toBe('manual-selected');
    
    // 4. Toggle AA (Manual-Selected -> Unselected -> Auto)
    // When we turn off manual AA, 88 still implies it, so it should become Auto
    range = toggleHandInRange(range, 'AA');
    expect(range['AA']).toBe('auto-selected');
  });
});
