import {
    checkRateLimit,
    isRateLimitError,
    RATE_LIMITS,
    rateLimiter,
    RateLimitError,
    tryCheckRateLimit,
} from '../rateLimit';

describe('Rate Limiting Service', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    // Reset all rate limits before each test
    rateLimiter.resetAll(testUserId);
  });

  afterAll(() => {
    // Clean up the interval to prevent Jest from hanging
    rateLimiter.destroy();
  });

  // ============================================
  // BASIC RATE LIMITING
  // ============================================
  
  describe('rateLimiter.checkLimit', () => {
    it('should allow requests within limit', () => {
      const limit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      
      for (let i = 0; i < limit; i++) {
        expect(rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER')).toBe(true);
      }
    });

    it('should reject requests exceeding limit', () => {
      const limit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      
      // Use up all requests
      for (let i = 0; i < limit; i++) {
        rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      }
      
      // Next request should fail
      expect(rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER')).toBe(false);
    });

    it('should track different actions separately', () => {
      const playerLimit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      
      // Use up all CREATE_PLAYER requests
      for (let i = 0; i < playerLimit; i++) {
        rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      }
      
      // CREATE_SESSION should still be allowed
      expect(rateLimiter.checkLimit(testUserId, 'CREATE_SESSION')).toBe(true);
    });

    it('should track different users separately', () => {
      const limit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      const otherUserId = 'other-user-456';
      
      // Use up all requests for testUserId
      for (let i = 0; i < limit; i++) {
        rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      }
      
      // Other user should still be allowed
      expect(rateLimiter.checkLimit(otherUserId, 'CREATE_PLAYER')).toBe(true);
      
      // Clean up
      rateLimiter.resetAll(otherUserId);
    });
  });

  // ============================================
  // REMAINING REQUESTS
  // ============================================
  
  describe('rateLimiter.getRemainingRequests', () => {
    it('should return max requests initially', () => {
      const remaining = rateLimiter.getRemainingRequests(testUserId, 'CREATE_PLAYER');
      expect(remaining).toBe(RATE_LIMITS.CREATE_PLAYER.maxRequests);
    });

    it('should decrease after each request', () => {
      const limit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      
      rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      const remaining = rateLimiter.getRemainingRequests(testUserId, 'CREATE_PLAYER');
      
      expect(remaining).toBe(limit - 1);
    });

    it('should return 0 when limit exceeded', () => {
      const limit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      
      // Use up all requests
      for (let i = 0; i < limit; i++) {
        rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      }
      
      const remaining = rateLimiter.getRemainingRequests(testUserId, 'CREATE_PLAYER');
      expect(remaining).toBe(0);
    });
  });

  // ============================================
  // TIME UNTIL RESET
  // ============================================
  
  describe('rateLimiter.getTimeUntilReset', () => {
    it('should return 0 when no requests made', () => {
      const resetTime = rateLimiter.getTimeUntilReset(testUserId, 'CREATE_PLAYER');
      expect(resetTime).toBe(0);
    });

    it('should return positive value after request', () => {
      rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      const resetTime = rateLimiter.getTimeUntilReset(testUserId, 'CREATE_PLAYER');
      
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(RATE_LIMITS.CREATE_PLAYER.windowMs);
    });
  });

  // ============================================
  // RESET FUNCTIONS
  // ============================================
  
  describe('rateLimiter.reset', () => {
    it('should reset specific action', () => {
      const limit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      
      // Use up all requests
      for (let i = 0; i < limit; i++) {
        rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      }
      
      expect(rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER')).toBe(false);
      
      // Reset
      rateLimiter.reset(testUserId, 'CREATE_PLAYER');
      
      // Should be allowed again
      expect(rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER')).toBe(true);
    });
  });

  describe('rateLimiter.resetAll', () => {
    it('should reset all actions for user', () => {
      // Use up some requests for multiple actions
      rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      rateLimiter.checkLimit(testUserId, 'CREATE_SESSION');
      rateLimiter.checkLimit(testUserId, 'UPDATE_RANGE');
      
      // Reset all
      rateLimiter.resetAll(testUserId);
      
      // All should return max requests
      expect(rateLimiter.getRemainingRequests(testUserId, 'CREATE_PLAYER'))
        .toBe(RATE_LIMITS.CREATE_PLAYER.maxRequests);
      expect(rateLimiter.getRemainingRequests(testUserId, 'CREATE_SESSION'))
        .toBe(RATE_LIMITS.CREATE_SESSION.maxRequests);
      expect(rateLimiter.getRemainingRequests(testUserId, 'UPDATE_RANGE'))
        .toBe(RATE_LIMITS.UPDATE_RANGE.maxRequests);
    });
  });

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  describe('checkRateLimit', () => {
    it('should not throw when within limit', () => {
      expect(() => checkRateLimit(testUserId, 'CREATE_PLAYER')).not.toThrow();
    });

    it('should throw RateLimitError when limit exceeded', () => {
      const limit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      
      // Use up all requests
      for (let i = 0; i < limit; i++) {
        rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      }
      
      expect(() => checkRateLimit(testUserId, 'CREATE_PLAYER')).toThrow(RateLimitError);
    });

    it('should include action in error message', () => {
      const limit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      
      // Use up all requests
      for (let i = 0; i < limit; i++) {
        rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      }
      
      try {
        checkRateLimit(testUserId, 'CREATE_PLAYER');
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('creating players');
      }
    });
  });

  describe('tryCheckRateLimit', () => {
    it('should return allowed: true when within limit', () => {
      const result = tryCheckRateLimit(testUserId, 'CREATE_PLAYER');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThan(RATE_LIMITS.CREATE_PLAYER.maxRequests);
    });

    it('should return allowed: false when limit exceeded', () => {
      const limit = RATE_LIMITS.CREATE_PLAYER.maxRequests;
      
      // Use up all requests
      for (let i = 0; i < limit; i++) {
        rateLimiter.checkLimit(testUserId, 'CREATE_PLAYER');
      }
      
      const result = tryCheckRateLimit(testUserId, 'CREATE_PLAYER');
      
      expect(result.allowed).toBe(false);
      expect(result.resetIn).toBeGreaterThan(0);
    });
  });

  // ============================================
  // ERROR CLASS
  // ============================================
  
  describe('RateLimitError', () => {
    it('should have correct properties', () => {
      const error = new RateLimitError('Test message', 'CREATE_PLAYER', 5000);
      
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Test message');
      expect(error.action).toBe('CREATE_PLAYER');
      expect(error.retryAfterMs).toBe(5000);
    });
  });

  describe('isRateLimitError', () => {
    it('should return true for RateLimitError', () => {
      const error = new RateLimitError('Test', 'CREATE_PLAYER', 1000);
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Test');
      expect(isRateLimitError(error)).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isRateLimitError('string')).toBe(false);
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
    });
  });

  // ============================================
  // RATE LIMIT CONFIGURATIONS
  // ============================================
  
  describe('RATE_LIMITS configuration', () => {
    it('should have sensible limits for all actions', () => {
      // All actions should have positive limits
      for (const [action, config] of Object.entries(RATE_LIMITS)) {
        expect(config.maxRequests).toBeGreaterThan(0);
        expect(config.windowMs).toBeGreaterThan(0);
      }
    });

    it('should have stricter limits for destructive operations', () => {
      // Delete operations should have lower limits than updates
      expect(RATE_LIMITS.DELETE_PLAYER.maxRequests)
        .toBeLessThanOrEqual(RATE_LIMITS.UPDATE_PLAYER.maxRequests);
      expect(RATE_LIMITS.DELETE_SESSION.maxRequests)
        .toBeLessThanOrEqual(RATE_LIMITS.UPDATE_SESSION.maxRequests);
    });

    it('should have higher limits for range updates (fast editing)', () => {
      // Range updates need to be fast for good UX
      expect(RATE_LIMITS.UPDATE_RANGE.maxRequests)
        .toBeGreaterThanOrEqual(RATE_LIMITS.UPDATE_PLAYER.maxRequests);
    });
  });
});
