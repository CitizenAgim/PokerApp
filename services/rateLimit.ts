/**
 * Rate Limiting Service - Abuse Prevention
 * 
 * Prevents rapid-fire creates and writes to protect against abuse.
 * Client-side throttling (server-side rules provide additional protection).
 */

// ============================================
// RATE LIMIT CONFIGURATION
// ============================================

export const RATE_LIMITS = {
  CREATE_PLAYER: { maxRequests: 10, windowMs: 60_000 },      // 10 per minute
  CREATE_SESSION: { maxRequests: 5, windowMs: 60_000 },      // 5 per minute
  UPDATE_PLAYER: { maxRequests: 30, windowMs: 60_000 },      // 30 per minute
  UPDATE_SESSION: { maxRequests: 30, windowMs: 60_000 },     // 30 per minute
  UPDATE_RANGE: { maxRequests: 60, windowMs: 60_000 },       // 60 per minute (fast editing)
  DELETE_PLAYER: { maxRequests: 5, windowMs: 60_000 },       // 5 per minute
  DELETE_SESSION: { maxRequests: 5, windowMs: 60_000 },      // 5 per minute
  SYNC_OPERATION: { maxRequests: 2, windowMs: 30_000 },      // 2 per 30 seconds
  QUERY_PLAYERS: { maxRequests: 20, windowMs: 60_000 },      // 20 per minute
  QUERY_SESSIONS: { maxRequests: 20, windowMs: 60_000 },     // 20 per minute
  // Player link actions
  CREATE_PLAYER_LINK: { maxRequests: 10, windowMs: 60_000 }, // 10 per minute
  ACCEPT_PLAYER_LINK: { maxRequests: 10, windowMs: 60_000 }, // 10 per minute
  DECLINE_PLAYER_LINK: { maxRequests: 10, windowMs: 60_000 }, // 10 per minute
  REMOVE_PLAYER_LINK: { maxRequests: 10, windowMs: 60_000 }, // 10 per minute
  CANCEL_PLAYER_LINK: { maxRequests: 10, windowMs: 60_000 }, // 10 per minute
  SYNC_PLAYER_LINK: { maxRequests: 20, windowMs: 60_000 },   // 20 per minute (allow batch syncs)
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

// ============================================
// RATE LIMIT ENTRY
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ============================================
// RATE LIMITER CLASS
// ============================================

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60_000);
    }
  }

  /**
   * Check if an action is within rate limits
   * Returns true if allowed, false if rate limited
   */
  checkLimit(userId: string, action: RateLimitAction): boolean {
    const key = `${userId}:${action}`;
    const limit = RATE_LIMITS[action];
    const now = Date.now();

    let entry = this.limits.get(key);

    // Initialize or reset if window expired
    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + limit.windowMs };
    }

    entry.count++;
    this.limits.set(key, entry);

    return entry.count <= limit.maxRequests;
  }

  /**
   * Get remaining requests for an action
   */
  getRemainingRequests(userId: string, action: RateLimitAction): number {
    const key = `${userId}:${action}`;
    const limit = RATE_LIMITS[action];
    const now = Date.now();

    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetTime) {
      return limit.maxRequests;
    }

    return Math.max(0, limit.maxRequests - entry.count);
  }

  /**
   * Get time until rate limit resets (in ms)
   */
  getTimeUntilReset(userId: string, action: RateLimitAction): number {
    const key = `${userId}:${action}`;
    const now = Date.now();

    const entry = this.limits.get(key);

    if (!entry || now >= entry.resetTime) {
      return 0;
    }

    return entry.resetTime - now;
  }

  /**
   * Reset rate limit for a specific action (for testing)
   */
  reset(userId: string, action: RateLimitAction): void {
    const key = `${userId}:${action}`;
    this.limits.delete(key);
  }

  /**
   * Reset all rate limits for a user (for testing)
   */
  resetAll(userId: string): void {
    for (const key of this.limits.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      // Remove entries that have been expired for more than 5 minutes
      if (now >= entry.resetTime + 5 * 60_000) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval (for testing)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const rateLimiter = new RateLimiter();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check rate limit and throw error if exceeded
 */
export function checkRateLimit(userId: string, action: RateLimitAction): void {
  if (!rateLimiter.checkLimit(userId, action)) {
    const timeUntilReset = rateLimiter.getTimeUntilReset(userId, action);
    const secondsUntilReset = Math.ceil(timeUntilReset / 1000);
    
    throw new RateLimitError(
      `Rate limit exceeded for ${formatActionName(action)}. Please try again in ${secondsUntilReset} seconds.`,
      action,
      timeUntilReset
    );
  }
}

/**
 * Check rate limit without throwing (returns result object)
 */
export function tryCheckRateLimit(userId: string, action: RateLimitAction): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
} {
  const allowed = rateLimiter.checkLimit(userId, action);
  
  // If we just checked (and incremented), get the actual remaining
  // We need to subtract 1 because checkLimit already incremented
  const remaining = rateLimiter.getRemainingRequests(userId, action);
  const resetIn = rateLimiter.getTimeUntilReset(userId, action);

  return { allowed, remaining, resetIn };
}

/**
 * Format action name for user-friendly messages
 */
function formatActionName(action: RateLimitAction): string {
  const names: Record<RateLimitAction, string> = {
    CREATE_PLAYER: 'creating players',
    CREATE_SESSION: 'creating sessions',
    UPDATE_PLAYER: 'updating players',
    UPDATE_SESSION: 'updating sessions',
    UPDATE_RANGE: 'updating ranges',
    DELETE_PLAYER: 'deleting players',
    DELETE_SESSION: 'deleting sessions',
    SYNC_OPERATION: 'syncing data',
    QUERY_PLAYERS: 'querying players',
    QUERY_SESSIONS: 'querying sessions',
    CREATE_PLAYER_LINK: 'creating player links',
    ACCEPT_PLAYER_LINK: 'accepting player links',
    DECLINE_PLAYER_LINK: 'declining player links',
    REMOVE_PLAYER_LINK: 'removing player links',
    CANCEL_PLAYER_LINK: 'canceling player links',
    SYNC_PLAYER_LINK: 'syncing from linked players',
  };
  return names[action] || action;
}

// ============================================
// CUSTOM ERROR CLASS
// ============================================

export class RateLimitError extends Error {
  public readonly action: RateLimitAction;
  public readonly retryAfterMs: number;

  constructor(message: string, action: RateLimitAction, retryAfterMs: number) {
    super(message);
    this.name = 'RateLimitError';
    this.action = action;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}
