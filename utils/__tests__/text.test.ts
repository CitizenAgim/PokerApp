import { normalizeLocation, toTitleCase } from '../text';

describe('Text Utilities', () => {
  describe('toTitleCase', () => {
    it('should capitalize the first letter of each word', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
      expect(toTitleCase('viage')).toBe('Viage');
      expect(toTitleCase('VIAGE')).toBe('Viage');
      expect(toTitleCase('vIAGE')).toBe('Viage');
    });

    it('should handle empty strings', () => {
      expect(toTitleCase('')).toBe('');
    });

    it('should handle single words', () => {
      expect(toTitleCase('hello')).toBe('Hello');
    });
  });

  describe('normalizeLocation', () => {
    it('should trim and title case the location', () => {
      expect(normalizeLocation('  viage  ')).toBe('Viage');
      expect(normalizeLocation('grand casino')).toBe('Grand Casino');
    });

    it('should handle mixed case input', () => {
      expect(normalizeLocation('gRaNd cAsInO')).toBe('Grand Casino');
    });
  });
});
