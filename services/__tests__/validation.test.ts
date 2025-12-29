import {
  VALIDATION_LIMITS,
  validatePlayerData,
  validateSessionData,
  validateRange,
  combineValidationResults,
  estimateDocumentSize,
} from '../validation';

describe('Validation Service', () => {
  // ============================================
  // PLAYER VALIDATION
  // ============================================
  
  describe('validatePlayerData', () => {
    it('should pass valid player data', () => {
      const result = validatePlayerData({
        name: 'John Doe',
        color: '#FF0000',
        notes: 'Good player',
        locations: ['Casino A', 'Casino B'],
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when name is empty', () => {
      const result = validatePlayerData({ name: '' });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Player name is required');
    });

    it('should fail when name is only whitespace', () => {
      const result = validatePlayerData({ name: '   ' });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Player name is required');
    });

    it('should fail when name exceeds max length', () => {
      const longName = 'a'.repeat(VALIDATION_LIMITS.MAX_PLAYER_NAME_LENGTH + 1);
      const result = validatePlayerData({ name: longName });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds max length');
    });

    it('should pass when name is at max length', () => {
      const maxName = 'a'.repeat(VALIDATION_LIMITS.MAX_PLAYER_NAME_LENGTH);
      const result = validatePlayerData({ name: maxName });
      
      expect(result.valid).toBe(true);
    });

    it('should fail when notes exceed max length', () => {
      const longNotes = 'a'.repeat(VALIDATION_LIMITS.MAX_PLAYER_NOTES_LENGTH + 1);
      const result = validatePlayerData({ name: 'Test', notes: longNotes });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('notes exceed max length');
    });

    it('should fail when notesList exceeds max items', () => {
      const notesList = Array(VALIDATION_LIMITS.MAX_NOTES_LIST_ITEMS + 1).fill({
        id: '1',
        content: 'test',
        timestamp: Date.now(),
      });
      const result = validatePlayerData({ name: 'Test', notesList });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Notes list exceeds max');
    });

    it('should warn when notesList approaching limit', () => {
      const notesList = Array(Math.floor(VALIDATION_LIMITS.MAX_NOTES_LIST_ITEMS * 0.95)).fill({
        id: '1',
        content: 'test',
        timestamp: Date.now(),
      });
      const result = validatePlayerData({ name: 'Test', notesList });
      
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('approaching limit');
    });

    it('should fail when note content exceeds max length', () => {
      const notesList = [{
        id: '1',
        content: 'a'.repeat(VALIDATION_LIMITS.MAX_NOTE_CONTENT_LENGTH + 1),
        timestamp: Date.now(),
      }];
      const result = validatePlayerData({ name: 'Test', notesList });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Note content exceeds');
    });

    it('should fail when locations exceed max', () => {
      const locations = Array(VALIDATION_LIMITS.MAX_LOCATIONS_PER_PLAYER + 1).fill('Casino');
      const result = validatePlayerData({ name: 'Test', locations });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Locations exceed max');
    });

    it('should fail when location name is too long', () => {
      const locations = ['a'.repeat(VALIDATION_LIMITS.MAX_LOCATION_LENGTH + 1)];
      const result = validatePlayerData({ name: 'Test', locations });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Location name exceeds');
    });

    it('should fail when ranges exceed max', () => {
      const ranges: Record<string, Record<string, string>> = {};
      for (let i = 0; i < VALIDATION_LIMITS.MAX_RANGES_PER_PLAYER + 1; i++) {
        ranges[`range_${i}`] = {};
      }
      const result = validatePlayerData({ name: 'Test', ranges });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Ranges exceed max');
    });

    it('should fail with invalid color format', () => {
      const result = validatePlayerData({ name: 'Test', color: 'red' });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid color format');
    });

    it('should pass with valid hex color', () => {
      const result = validatePlayerData({ name: 'Test', color: '#FF0000' });
      
      expect(result.valid).toBe(true);
    });

    it('should pass with 3-digit hex color', () => {
      const result = validatePlayerData({ name: 'Test', color: '#F00' });
      
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // SESSION VALIDATION
  // ============================================
  
  describe('validateSessionData', () => {
    it('should pass valid session data', () => {
      const result = validateSessionData({
        name: 'Friday Night Game',
        location: 'Casino A',
        stakes: '1/2',
        smallBlind: 1,
        bigBlind: 2,
        buyIn: 200,
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when name is empty', () => {
      const result = validateSessionData({ name: '' });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Session name is required');
    });

    it('should fail when name exceeds max length', () => {
      const longName = 'a'.repeat(VALIDATION_LIMITS.MAX_SESSION_NAME_LENGTH + 1);
      const result = validateSessionData({ name: longName });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds max length');
    });

    it('should fail when location exceeds max length', () => {
      const longLocation = 'a'.repeat(VALIDATION_LIMITS.MAX_SESSION_LOCATION_LENGTH + 1);
      const result = validateSessionData({ name: 'Test', location: longLocation });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('location exceeds max length');
    });

    it('should warn on invalid stakes format', () => {
      const result = validateSessionData({ name: 'Test', stakes: 'invalid' });
      
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings[0]).toContain('Stakes format may be invalid');
    });

    it('should pass with valid stakes format', () => {
      const result = validateSessionData({ name: 'Test', stakes: '2/5' });
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass with triple blind stakes format', () => {
      const result = validateSessionData({ name: 'Test', stakes: '1/2/5' });
      
      expect(result.valid).toBe(true);
    });

    it('should fail when small blind is negative', () => {
      const result = validateSessionData({ name: 'Test', smallBlind: -1 });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Small blind cannot be negative');
    });

    it('should fail when big blind is negative', () => {
      const result = validateSessionData({ name: 'Test', bigBlind: -1 });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Big blind cannot be negative');
    });

    it('should warn when small blind > big blind', () => {
      const result = validateSessionData({ name: 'Test', smallBlind: 5, bigBlind: 2 });
      
      expect(result.valid).toBe(true);
      expect(result.warnings[0]).toContain('Small blind is larger than big blind');
    });

    it('should fail when buyIn is negative', () => {
      const result = validateSessionData({ name: 'Test', buyIn: -100 });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Buy-in cannot be negative');
    });

    it('should fail when cashOut is negative', () => {
      const result = validateSessionData({ name: 'Test', cashOut: -100 });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Cash-out cannot be negative');
    });

    it('should fail when endTime < startTime', () => {
      const result = validateSessionData({
        name: 'Test',
        startTime: 1000,
        endTime: 500,
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('End time cannot be before start time');
    });
  });

  // ============================================
  // RANGE VALIDATION
  // ============================================
  
  describe('validateRange', () => {
    it('should pass valid range', () => {
      const result = validateRange({
        'AA': 'manual-selected',
        'KK': 'auto-selected',
        'QQ': 'manual-unselected',
      });
      
      expect(result.valid).toBe(true);
    });

    it('should pass empty range (sparse storage)', () => {
      const result = validateRange({});
      
      expect(result.valid).toBe(true);
    });

    it('should fail with invalid selection state', () => {
      const result = validateRange({
        'AA': 'invalid-state' as any,
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid selection state');
    });
  });

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  describe('combineValidationResults', () => {
    it('should combine multiple results', () => {
      const result1 = { valid: true, errors: [], warnings: ['warning1'] };
      const result2 = { valid: false, errors: ['error1'], warnings: [] };
      const result3 = { valid: true, errors: [], warnings: ['warning2'] };
      
      const combined = combineValidationResults(result1, result2, result3);
      
      expect(combined.valid).toBe(false);
      expect(combined.errors).toEqual(['error1']);
      expect(combined.warnings).toEqual(['warning1', 'warning2']);
    });

    it('should be valid when all results are valid', () => {
      const result1 = { valid: true, errors: [], warnings: [] };
      const result2 = { valid: true, errors: [], warnings: [] };
      
      const combined = combineValidationResults(result1, result2);
      
      expect(combined.valid).toBe(true);
    });
  });

  describe('estimateDocumentSize', () => {
    it('should estimate size of simple object', () => {
      const data = { name: 'Test', value: 123 };
      const size = estimateDocumentSize(data);
      
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(100);
    });

    it('should estimate larger size for larger objects', () => {
      const smallData = { name: 'Test' };
      const largeData = { name: 'Test'.repeat(1000) };
      
      const smallSize = estimateDocumentSize(smallData);
      const largeSize = estimateDocumentSize(largeData);
      
      expect(largeSize).toBeGreaterThan(smallSize);
    });
  });
});
