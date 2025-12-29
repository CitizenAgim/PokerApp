/**
 * Validation Service - Document Size & Field Validation
 * 
 * Enforces limits to prevent storage spam and abuse.
 * Validates data on the client before sending to Firebase.
 */

import { Player, Range, Session } from '@/types/poker';

// ============================================
// VALIDATION LIMITS
// ============================================

export const VALIDATION_LIMITS = {
  // Players
  MAX_PLAYER_NAME_LENGTH: 100,
  MAX_PLAYER_NOTES_LENGTH: 10000,
  MAX_NOTES_LIST_ITEMS: 500,
  MAX_NOTE_CONTENT_LENGTH: 5000,
  MAX_LOCATIONS_PER_PLAYER: 50,
  MAX_LOCATION_LENGTH: 200,
  MAX_RANGES_PER_PLAYER: 100,

  // Sessions
  MAX_SESSION_NAME_LENGTH: 200,
  MAX_SESSION_NOTES_LENGTH: 50000,
  MAX_SESSION_LOCATION_LENGTH: 200,
  MAX_HANDS_PER_SESSION: 1000,
  MAX_PLAYERS_PER_SESSION: 20,

  // Ranges (sparse storage - only selected hands)
  MAX_HANDS_PER_RANGE: 169, // Can't exceed 13x13 matrix

  // Document Size (bytes) - Firestore limits
  MAX_PLAYER_DOCUMENT_SIZE: 500_000,  // 500 KB
  MAX_SESSION_DOCUMENT_SIZE: 1_000_000, // 1 MB

  // Collection Limits (per user)
  MAX_PLAYERS_PER_USER: 1000,
  MAX_SESSIONS_PER_USER: 5000,
} as const;

// ============================================
// VALIDATION RESULT TYPES
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// PLAYER VALIDATION
// ============================================

/**
 * Validate player data before create/update
 */
export function validatePlayerData(player: Partial<Player> & { ranges?: Record<string, Range> }): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name validation
  if (player.name !== undefined) {
    if (!player.name || player.name.trim().length === 0) {
      errors.push('Player name is required');
    } else if (player.name.length > VALIDATION_LIMITS.MAX_PLAYER_NAME_LENGTH) {
      errors.push(`Player name exceeds max length of ${VALIDATION_LIMITS.MAX_PLAYER_NAME_LENGTH} characters`);
    }
  }

  // Notes validation (legacy single notes field)
  if (player.notes != null && player.notes.length > VALIDATION_LIMITS.MAX_PLAYER_NOTES_LENGTH) {
    errors.push(`Player notes exceed max length of ${VALIDATION_LIMITS.MAX_PLAYER_NOTES_LENGTH} characters`);
  }

  // Notes list validation
  if (player.notesList != null && player.notesList.length > 0) {
    if (player.notesList.length > VALIDATION_LIMITS.MAX_NOTES_LIST_ITEMS) {
      errors.push(`Notes list exceeds max of ${VALIDATION_LIMITS.MAX_NOTES_LIST_ITEMS} items`);
    }
    
    // Validate individual note content
    for (const note of player.notesList) {
      if (note.content && note.content.length > VALIDATION_LIMITS.MAX_NOTE_CONTENT_LENGTH) {
        errors.push(`Note content exceeds max length of ${VALIDATION_LIMITS.MAX_NOTE_CONTENT_LENGTH} characters`);
        break; // Only report first violation
      }
    }

    // Warning if approaching limit
    if (player.notesList.length > VALIDATION_LIMITS.MAX_NOTES_LIST_ITEMS * 0.9) {
      warnings.push(`Notes list approaching limit (${player.notesList.length}/${VALIDATION_LIMITS.MAX_NOTES_LIST_ITEMS})`);
    }
  }

  // Locations validation
  if (player.locations != null && player.locations.length > 0) {
    if (player.locations.length > VALIDATION_LIMITS.MAX_LOCATIONS_PER_PLAYER) {
      errors.push(`Locations exceed max of ${VALIDATION_LIMITS.MAX_LOCATIONS_PER_PLAYER}`);
    }
    
    for (const location of player.locations) {
      if (location.length > VALIDATION_LIMITS.MAX_LOCATION_LENGTH) {
        errors.push(`Location name exceeds max length of ${VALIDATION_LIMITS.MAX_LOCATION_LENGTH} characters`);
        break;
      }
    }
  }

  // Ranges validation
  if (player.ranges !== undefined) {
    const rangeCount = Object.keys(player.ranges).length;
    if (rangeCount > VALIDATION_LIMITS.MAX_RANGES_PER_PLAYER) {
      errors.push(`Ranges exceed max of ${VALIDATION_LIMITS.MAX_RANGES_PER_PLAYER}`);
    }

    // Warning if approaching limit
    if (rangeCount > VALIDATION_LIMITS.MAX_RANGES_PER_PLAYER * 0.9) {
      warnings.push(`Ranges approaching limit (${rangeCount}/${VALIDATION_LIMITS.MAX_RANGES_PER_PLAYER})`);
    }
  }

  // Color validation (hex color code)
  if (player.color !== undefined && player.color) {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(player.color)) {
      errors.push('Invalid color format. Expected hex color code (e.g., #FF0000)');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// SESSION VALIDATION
// ============================================

/**
 * Validate session data before create/update
 */
export function validateSessionData(session: Partial<Session>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Name validation
  if (session.name !== undefined) {
    if (!session.name || session.name.trim().length === 0) {
      errors.push('Session name is required');
    } else if (session.name.length > VALIDATION_LIMITS.MAX_SESSION_NAME_LENGTH) {
      errors.push(`Session name exceeds max length of ${VALIDATION_LIMITS.MAX_SESSION_NAME_LENGTH} characters`);
    }
  }

  // Location validation
  if (session.location !== undefined && session.location.length > VALIDATION_LIMITS.MAX_SESSION_LOCATION_LENGTH) {
    errors.push(`Session location exceeds max length of ${VALIDATION_LIMITS.MAX_SESSION_LOCATION_LENGTH} characters`);
  }

  // Stakes validation (basic format check)
  if (session.stakes !== undefined && session.stakes) {
    // Accept formats like "1/2", "2/5", "5/10/20", etc.
    const stakesRegex = /^[\d.]+\/[\d.]+(\/[\d.]+)?$/;
    if (!stakesRegex.test(session.stakes)) {
      warnings.push('Stakes format may be invalid. Expected format: "1/2" or "1/2/5"');
    }
  }

  // Blind validation
  if (session.smallBlind !== undefined && session.smallBlind < 0) {
    errors.push('Small blind cannot be negative');
  }
  if (session.bigBlind !== undefined && session.bigBlind < 0) {
    errors.push('Big blind cannot be negative');
  }
  if (session.smallBlind !== undefined && session.bigBlind !== undefined) {
    if (session.smallBlind > session.bigBlind) {
      warnings.push('Small blind is larger than big blind');
    }
  }

  // Buy-in validation
  if (session.buyIn !== undefined && session.buyIn < 0) {
    errors.push('Buy-in cannot be negative');
  }

  // Cash-out validation
  if (session.cashOut !== undefined && session.cashOut < 0) {
    errors.push('Cash-out cannot be negative');
  }

  // Table players validation
  if (session.table?.seats !== undefined) {
    const occupiedSeats = session.table.seats.filter(s => s.player);
    if (occupiedSeats.length > VALIDATION_LIMITS.MAX_PLAYERS_PER_SESSION) {
      errors.push(`Session exceeds max of ${VALIDATION_LIMITS.MAX_PLAYERS_PER_SESSION} players`);
    }
  }

  // Time validation
  if (session.startTime !== undefined && session.endTime !== undefined) {
    if (session.endTime < session.startTime) {
      errors.push('End time cannot be before start time');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// RANGE VALIDATION
// ============================================

/**
 * Validate a single range
 */
export function validateRange(range: Range): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const handCount = Object.keys(range).length;
  
  if (handCount > VALIDATION_LIMITS.MAX_HANDS_PER_RANGE) {
    errors.push(`Range exceeds max of ${VALIDATION_LIMITS.MAX_HANDS_PER_RANGE} hands`);
  }

  // Validate selection states
  const validStates = ['unselected', 'auto-selected', 'manual-selected', 'manual-unselected'];
  for (const [hand, state] of Object.entries(range)) {
    if (!validStates.includes(state)) {
      errors.push(`Invalid selection state "${state}" for hand "${hand}"`);
      break;
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Estimate document size in bytes (rough approximation)
 */
export function estimateDocumentSize(data: Record<string, unknown>): number {
  return new Blob([JSON.stringify(data)]).size;
}

/**
 * Check if a player document would exceed size limits
 */
export function checkPlayerDocumentSize(player: Partial<Player> & { ranges?: Record<string, Range> }): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const estimatedSize = estimateDocumentSize(player as Record<string, unknown>);
  
  if (estimatedSize > VALIDATION_LIMITS.MAX_PLAYER_DOCUMENT_SIZE) {
    errors.push(`Player document exceeds max size of ${VALIDATION_LIMITS.MAX_PLAYER_DOCUMENT_SIZE / 1000} KB`);
  } else if (estimatedSize > VALIDATION_LIMITS.MAX_PLAYER_DOCUMENT_SIZE * 0.8) {
    warnings.push(`Player document approaching size limit (${Math.round(estimatedSize / 1000)} KB / ${VALIDATION_LIMITS.MAX_PLAYER_DOCUMENT_SIZE / 1000} KB)`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Check if a session document would exceed size limits
 */
export function checkSessionDocumentSize(session: Partial<Session>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const estimatedSize = estimateDocumentSize(session as Record<string, unknown>);
  
  if (estimatedSize > VALIDATION_LIMITS.MAX_SESSION_DOCUMENT_SIZE) {
    errors.push(`Session document exceeds max size of ${VALIDATION_LIMITS.MAX_SESSION_DOCUMENT_SIZE / 1000} KB`);
  } else if (estimatedSize > VALIDATION_LIMITS.MAX_SESSION_DOCUMENT_SIZE * 0.8) {
    warnings.push(`Session document approaching size limit (${Math.round(estimatedSize / 1000)} KB / ${VALIDATION_LIMITS.MAX_SESSION_DOCUMENT_SIZE / 1000} KB)`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const result of results) {
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return { valid: errors.length === 0, errors, warnings };
}
