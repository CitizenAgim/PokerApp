# Security Engineering Plan

## Overview
This document provides a comprehensive security engineering strategy for the PokerApp, including implementation plans for abuse prevention, security best practices for all future features, and security review procedures.

---

## Part 1: Abuse Prevention Implementation Plan

### Phase 1: Critical (Implement First)

#### 1.1 Document Size Validation

**Objective**: Prevent storage spam by limiting document sizes

**Implementation Location**: `services/validation.ts` (new module)

```typescript
// services/validation.ts
export const VALIDATION_LIMITS = {
  // Players
  MAX_PLAYER_NAME_LENGTH: 100,
  MAX_PLAYER_NOTES_LENGTH: 10000,
  MAX_NOTES_LIST_ITEMS: 500,
  MAX_LOCATIONS_PER_PLAYER: 10,
  MAX_RANGES_PER_PLAYER: 100,

  // Sessions
  MAX_SESSION_NAME_LENGTH: 200,
  MAX_SESSION_NOTES_LENGTH: 50000,
  MAX_HANDS_PER_SESSION: 1000,
  MAX_PLAYERS_PER_SESSION: 20,

  // Document Size (bytes)
  MAX_PLAYER_DOCUMENT_SIZE: 500000,      // 500 KB
  MAX_SESSION_DOCUMENT_SIZE: 1000000,    // 1 MB
  MAX_RANGE_OBJECT_SIZE: 100000,         // 100 KB
};

export function validatePlayerData(player: Partial<Player>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (player.name && player.name.length > VALIDATION_LIMITS.MAX_PLAYER_NAME_LENGTH) {
    errors.push(`Player name exceeds max length of ${VALIDATION_LIMITS.MAX_PLAYER_NAME_LENGTH}`);
  }

  if (player.notes && player.notes.length > VALIDATION_LIMITS.MAX_PLAYER_NOTES_LENGTH) {
    errors.push(`Player notes exceed max length of ${VALIDATION_LIMITS.MAX_PLAYER_NOTES_LENGTH}`);
  }

  if (player.notesList && player.notesList.length > VALIDATION_LIMITS.MAX_NOTES_LIST_ITEMS) {
    errors.push(`Notes list exceeds max items of ${VALIDATION_LIMITS.MAX_NOTES_LIST_ITEMS}`);
  }

  if (player.locations && player.locations.length > VALIDATION_LIMITS.MAX_LOCATIONS_PER_PLAYER) {
    errors.push(`Locations exceed max of ${VALIDATION_LIMITS.MAX_LOCATIONS_PER_PLAYER}`);
  }

  if (player.ranges && Object.keys(player.ranges).length > VALIDATION_LIMITS.MAX_RANGES_PER_PLAYER) {
    errors.push(`Ranges exceed max of ${VALIDATION_LIMITS.MAX_RANGES_PER_PLAYER}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateSessionData(session: Partial<Session>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (session.name && session.name.length > VALIDATION_LIMITS.MAX_SESSION_NAME_LENGTH) {
    errors.push(`Session name exceeds max length of ${VALIDATION_LIMITS.MAX_SESSION_NAME_LENGTH}`);
  }

  if (session.notes && session.notes.length > VALIDATION_LIMITS.MAX_SESSION_NOTES_LENGTH) {
    errors.push(`Session notes exceed max length of ${VALIDATION_LIMITS.MAX_SESSION_NOTES_LENGTH}`);
  }

  if (session.handHistory && session.handHistory.length > VALIDATION_LIMITS.MAX_HANDS_PER_SESSION) {
    errors.push(`Hand history exceeds max of ${VALIDATION_LIMITS.MAX_HANDS_PER_SESSION}`);
  }

  return { valid: errors.length === 0, errors };
}
```

**Firebase Security Rules Addition**:
```javascript
// In Firestore Rules - validate document size
match /users/{userId}/players/{playerId} {
  allow create, update: if request.auth != null
    && request.auth.uid == userId
    && request.resource.size < 500000  // 500 KB max
    && request.resource.data.ranges.size() <= 500
    && request.resource.data.notesList.size() <= 500;
}

match /users/{userId}/sessions/{sessionId} {
  allow create, update: if request.auth != null
    && request.auth.uid == userId
    && request.resource.size < 1000000  // 1 MB max
    && request.resource.data.handHistory.size() <= 1000;
}
```

**Testing**: Create `services/__tests__/validation.test.ts`
- Test boundary conditions for each field
- Test document size calculations
- Test batch validations

---

#### 1.2 Rate Limiting on Create/Write Operations

**Objective**: Prevent rapid-fire creates and writes

**Implementation Location**: `services/rateLimit.ts` (new module)

```typescript
// services/rateLimit.ts
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const RATE_LIMITS = {
  CREATE_PLAYER: { maxRequests: 10, windowMs: 60000 },       // 10 per minute
  CREATE_SESSION: { maxRequests: 5, windowMs: 60000 },       // 5 per minute
  UPDATE_RANGE: { maxRequests: 50, windowMs: 60000 },        // 50 per minute
  SYNC_OPERATION: { maxRequests: 1, windowMs: 30000 },       // 1 per 30 seconds
  DELETE_PLAYER: { maxRequests: 1, windowMs: 60000 },        // 1 per minute
};

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();

  checkLimit(userId: string, action: keyof typeof RATE_LIMITS): boolean {
    const key = `${userId}:${action}`;
    const limit = RATE_LIMITS[action];
    const now = Date.now();

    const entry = this.limits.get(key) || { count: 0, resetTime: now + limit.windowMs };

    // Reset if window expired
    if (now >= entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + limit.windowMs;
    }

    entry.count++;
    this.limits.set(key, entry);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return entry.count <= limit.maxRequests;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime + 300000) { // Keep 5 min beyond expiry
        this.limits.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Usage in services:
export function checkRateLimit(userId: string, action: keyof typeof RATE_LIMITS): void {
  if (!rateLimiter.checkLimit(userId, action)) {
    throw new Error(`Rate limit exceeded for ${action}. Please try again later.`);
  }
}
```

**Integration Points**:
- `services/firebase/players.ts` - Check before `createPlayer`, `updatePlayerRanges`
- `services/firebase/sessions.ts` - Check before `createSession`, `updateSession`
- `services/sync.ts` - Check sync operation frequency

**Testing**: Create `services/__tests__/rateLimit.test.ts`
- Test successful requests within limits
- Test rejection after exceeding limits
- Test window reset behavior
- Test cleanup of old entries

---

#### 1.3 Firebase Security Rules with Request Throttling

**Objective**: Server-side protection against rapid queries

**Implementation Location**: Firebase Console > Firestore Rules

```javascript
// Enhanced security rules with request throttling
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    function isValidPlayer(player) {
      return player.name != null 
        && player.name.size() <= 100
        && player.notes.size() <= 10000
        && (player.notesList == null || player.notesList.size() <= 500)
        && (player.locations == null || player.locations.size() <= 100)
        && (player.ranges == null || player.ranges.size() <= 500);
    }
    
    function isValidSession(session) {
      return session.name != null 
        && session.name.size() <= 200
        && session.notes.size() <= 50000
        && (session.handHistory == null || session.handHistory.size() <= 1000)
        && (session.players == null || session.players.size() <= 20);
    }

    // Users collection
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Players subcollection
    match /users/{userId}/players/{playerId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId)
        && isValidPlayer(request.resource.data)
        && request.resource.size < 500000;
      allow update: if isOwner(userId)
        && isValidPlayer(request.resource.data)
        && request.resource.size < 500000;
      allow delete: if isOwner(userId);
    }

    // Sessions subcollection
    match /users/{userId}/sessions/{sessionId} {
      allow read: if isOwner(userId);
      allow create: if isOwner(userId)
        && isValidSession(request.resource.data)
        && request.resource.size < 1000000;
      allow update: if isOwner(userId)
        && isValidSession(request.resource.data)
        && request.resource.size < 1000000;
      allow delete: if isOwner(userId);
    }
  }
}
```

---

#### 1.4 Cap Ranges, Sessions, and Hands Per Session

**Objective**: Prevent DOS attacks through excessive data creation

**Implementation Location**: Enforce in both client and server

**Client-side** (`services/validation.ts` - already covered above):
```typescript
// Already in VALIDATION_LIMITS:
MAX_RANGES_PER_PLAYER: 500,
MAX_HANDS_PER_SESSION: 1000,
```

**Server-side** (Firebase Rules - already covered above)

**UI-level** (Prevent user from clicking):
```typescript
// In PositionSelector or RangeGrid component
const canAddRange = Object.keys(playerRanges).length < VALIDATION_LIMITS.MAX_RANGES_PER_PLAYER;

if (!canAddRange) {
  return <Text>Maximum ranges per player reached (500)</Text>;
}
```

---

### Phase 2: Important (Implement Second)

#### 2.1 Soft Delete with Grace Period

**Objective**: Prevent accidental data loss and allow recovery

**Implementation Location**: `services/firebase/players.ts` and `sessions.ts`

```typescript
// Add to Player and Session types:
interface Timestamps {
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;  // NEW: timestamp when marked for deletion
}

// Add to players service:
const SOFT_DELETE_GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function softDeletePlayer(userId: string, playerId: string): Promise<void> {
  const playerRef = doc(db, 'users', userId, 'players', playerId);
  await updateDoc(playerRef, {
    deletedAt: serverTimestamp(),
  });
}

export async function restorePlayer(userId: string, playerId: string): Promise<void> {
  const playerRef = doc(db, 'users', userId, 'players', playerId);
  await updateDoc(playerRef, {
    deletedAt: null,
  });
}

// Batch delete after grace period expires (cloud function)
export async function hardDeleteExpiredPlayers(userId: string): Promise<void> {
  const cutoffTime = Date.now() - SOFT_DELETE_GRACE_PERIOD_MS;
  const playersRef = collection(db, 'users', userId, 'players');
  const q = query(playersRef, where('deletedAt', '<', cutoffTime));
  const snapshot = await getDocs(q);

  for (const doc of snapshot.docs) {
    await deleteDoc(doc.ref);
  }
}
```

**Firestore Rules Update**:
```javascript
match /users/{userId}/players/{playerId} {
  // Hide soft-deleted players from normal queries
  allow read: if isOwner(userId) && (resource.data.deletedAt == null);
  allow list: if isOwner(userId) && (resource.data.deletedAt == null);
}
```

**Cloud Function** (`functions/deleteExpiredData.ts`):
```typescript
// Scheduled to run daily
export const deleteExpiredData = functions.pubsub
  .schedule('every day 02:00')
  .onRun(async (context) => {
    const db = admin.firestore();
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Delete expired players
      const expiredPlayers = await db
        .collection(`users/${userId}/players`)
        .where('deletedAt', '<', cutoffTime)
        .get();
      
      for (const playerDoc of expiredPlayers.docs) {
        await playerDoc.ref.delete();
      }

      // Delete expired sessions
      const expiredSessions = await db
        .collection(`users/${userId}/sessions`)
        .where('deletedAt', '<', cutoffTime)
        .get();
      
      for (const sessionDoc of expiredSessions.docs) {
        await sessionDoc.ref.delete();
      }
    }
  });
```

---

#### 2.2 Request Throttling in Firebase Rules

**Objective**: Limit query frequency per user

**Implementation Location**: Firebase Rules (already partially covered, needs expansion)

```javascript
// Advanced throttling with request metadata
match /users/{userId}/players {
  // Only allow list/query once per 5 seconds per user
  allow list, query: if isOwner(userId)
    && request.time > get(/databases/$(database)/documents/users/$(userId)).data.lastPlayersQuery + duration.value(5, 's');
}
```

**Alternative: Cloud Function with pub/sub throttling**
```typescript
// functions/throttleSync.ts
export const throttleSync = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError('unauthenticated', 'User not authenticated');

  const userId = context.auth.uid;
  const lastSyncKey = `lastSync:${userId}`;
  
  // Check Redis or Firestore for last sync time
  const lastSync = await db.collection('_system').doc(userId).get();
  const now = Date.now();
  
  if (lastSync.exists && now - lastSync.data().lastSync < 30000) {
    throw new HttpsError('resource-exhausted', 'Sync too frequent. Wait 30 seconds.');
  }

  // Update last sync time
  await db.collection('_system').doc(userId).set({ lastSync: now }, { merge: true });
  
  // Proceed with sync
  return { success: true };
});
```

---

#### 2.3 Grace Period for Account Deletion

**Objective**: Prevent impulsive account deletions

**Implementation Location**: `services/auth.ts` (new module)

```typescript
// services/auth.ts
const ACCOUNT_DELETION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function scheduleAccountDeletion(userId: string): Promise<void> {
  // Mark account for deletion
  await updateDoc(doc(db, 'users', userId), {
    scheduledForDeletionAt: serverTimestamp(),
    status: 'pending-deletion',
  });

  // Send confirmation email
  await sendAccountDeletionEmail(userId);
}

export async function cancelAccountDeletion(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    scheduledForDeletionAt: null,
    status: 'active',
  });
}

// Cloud Function to execute deletion after grace period
export const executeScheduledDeletions = functions.pubsub
  .schedule('every day 03:00')
  .onRun(async (context) => {
    const cutoff = Date.now() - ACCOUNT_DELETION_GRACE_PERIOD_MS;
    
    const usersToDelete = await db
      .collection('users')
      .where('status', '==', 'pending-deletion')
      .where('scheduledForDeletionAt', '<', cutoff)
      .get();

    for (const userDoc of usersToDelete.docs) {
      const userId = userDoc.id;
      
      // Delete all subcollections
      await deleteUserData(userId);
      
      // Delete auth user
      await admin.auth().deleteUser(userId);
    }
  });
```

---

### Phase 3: Nice to Have (Implement Third)

#### 3.1 Abuse Detection & Analytics

**Implementation Location**: `services/analytics.ts` (new module)

```typescript
// services/analytics.ts
interface AbuseSignal {
  userId: string;
  type: 'rapid-creates' | 'oversized-documents' | 'query-spam' | 'unusual-behavior';
  severity: 'low' | 'medium' | 'high';
  details: Record<string, any>;
  timestamp: number;
}

export async function recordAbuseSignal(signal: AbuseSignal): Promise<void> {
  await db.collection('_abuse_signals').add({
    ...signal,
    timestamp: serverTimestamp(),
  });
}

// Track patterns
export async function detectAbusePatterns(userId: string): Promise<AbuseSignal[]> {
  const signals: AbuseSignal[] = [];
  
  // Check for rapid creates
  const recentCreates = await getRecentCreates(userId, 60000); // Last minute
  if (recentCreates > 20) {
    signals.push({
      userId,
      type: 'rapid-creates',
      severity: recentCreates > 50 ? 'high' : 'medium',
      details: { createCount: recentCreates },
      timestamp: Date.now(),
    });
  }

  // Check for oversized documents
  const largeDocuments = await findOversizedDocuments(userId);
  if (largeDocuments.length > 0) {
    signals.push({
      userId,
      type: 'oversized-documents',
      severity: 'high',
      details: { documentCount: largeDocuments.length },
      timestamp: Date.now(),
    });
  }

  // Check for query spam
  const queryCount = await getQueryCount(userId, 60000);
  if (queryCount > 100) {
    signals.push({
      userId,
      type: 'query-spam',
      severity: queryCount > 500 ? 'high' : 'medium',
      details: { queryCount },
      timestamp: Date.now(),
    });
  }

  return signals;
}

// Alert on high severity
export async function checkAndAlertAbuseDetection(userId: string): Promise<void> {
  const signals = await detectAbusePatterns(userId);
  const highSeveritySignals = signals.filter(s => s.severity === 'high');

  if (highSeveritySignals.length > 2) {
    // Throttle user or alert admin
    await throttleUser(userId);
    await notifyAdminOfAbuseDetection(userId, highSeveritySignals);
  }
}
```

---

#### 3.2 User Reputation System

**Implementation Location**: `services/reputation.ts` (new module)

```typescript
// services/reputation.ts
interface UserReputation {
  userId: string;
  score: number; // 0-100, starts at 50
  violations: number;
  trustLevel: 'verified' | 'trusted' | 'neutral' | 'suspicious' | 'blocked';
  lastViolationTime?: number;
}

export async function updateReputation(userId: string, change: number): Promise<void> {
  const reputationRef = doc(db, '_reputation', userId);
  const rep = await getDoc(reputationRef);
  
  const currentScore = rep.data()?.score || 50;
  const newScore = Math.max(0, Math.min(100, currentScore + change));
  
  const trustLevel = getTrustLevel(newScore);
  
  await setDoc(reputationRef, {
    userId,
    score: newScore,
    trustLevel,
    lastViolationTime: change < 0 ? serverTimestamp() : undefined,
  }, { merge: true });
}

function getTrustLevel(score: number): UserReputation['trustLevel'] {
  if (score >= 80) return 'verified';
  if (score >= 60) return 'trusted';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'suspicious';
  return 'blocked';
}

// Block operations for blocked users
export async function checkUserTrustLevel(userId: string): Promise<void> {
  const rep = await getDoc(doc(db, '_reputation', userId));
  
  if (rep.data()?.trustLevel === 'blocked') {
    throw new Error('Your account has been blocked due to policy violations.');
  }
}
```

---

## Part 2: Security Best Practices for All Future Features

### Development Checklist

Every new feature must complete this security checklist before being considered "done":

#### 1. Input Validation
- [ ] All user inputs are validated for type and length
- [ ] Regex patterns used for email, phone, URLs
- [ ] Malicious input patterns blocked (SQL injection, XSS)
- [ ] Validation happens on BOTH client and server
- [ ] Error messages don't leak system information

#### 2. Authorization
- [ ] Path-based ownership enforced (e.g., `/users/{userId}/data`)
- [ ] Firebase Rules prevent cross-user access
- [ ] User can only modify their own data
- [ ] Admin operations clearly marked and validated
- [ ] Sharing permissions (if applicable) properly scoped

#### 3. Data Limits
- [ ] Document size limits enforced
- [ ] Collection size limits enforced
- [ ] String/array length limits validated
- [ ] Nested object depth limited
- [ ] Limits documented in `VALIDATION_LIMITS`

#### 4. Rate Limiting
- [ ] Create operations limited to N per minute
- [ ] Write operations limited to N per minute
- [ ] Delete operations limited to N per minute
- [ ] Sync operations throttled (min 30 seconds between)
- [ ] Rate limits checked before expensive operations

#### 5. Firebase Rules
- [ ] Rules validate all writes
- [ ] Rules check document size
- [ ] Rules verify ownership
- [ ] Rules limit query results (default to 1000 max)
- [ ] Rules reviewed by another team member

#### 6. Error Handling
- [ ] Errors don't expose internal structure
- [ ] Errors don't leak user data
- [ ] User-friendly error messages shown in UI
- [ ] Full errors logged server-side for debugging
- [ ] Sensitive operations have audit logs

#### 7. Testing
- [ ] Unit tests for validation functions
- [ ] Integration tests for auth checks
- [ ] Security tests for Firebase Rules
- [ ] Tests cover edge cases and abuse scenarios
- [ ] Coverage > 80% for security-critical code

#### 8. Documentation
- [ ] Security assumptions documented
- [ ] Limits and constraints documented
- [ ] Potential abuse vectors identified
- [ ] Mitigation strategies documented
- [ ] Code comments explain security decisions

#### 9. Code Review
- [ ] Security engineer reviews all features
- [ ] Auth/validation logic reviewed
- [ ] Database access patterns reviewed
- [ ] Error handling reviewed
- [ ] Documentation reviewed

#### 10. Monitoring
- [ ] Abuse signals logged and traceable
- [ ] Unusual patterns flagged
- [ ] Admin dashboard for monitoring
- [ ] Alerts configured for high-risk activities
- [ ] Logs retained for 90 days

---

### Validation Checklist Template

For each new feature, copy this template:

```markdown
## Security Review: [Feature Name]

### Input Validation
- [ ] Validated: [field1, field2, ...]
- [ ] Max lengths: [field: length]
- [ ] Regex patterns: [field: pattern]
- [ ] Potential attacks mitigated: [injection, xss, etc]

### Authorization
- [ ] Ownership verified: [check how]
- [ ] Cross-user access prevented: [how]
- [ ] Firebase Rules updated: [yes/no]
- [ ] Rules validated: [how]

### Rate Limiting
- [ ] Limit type: [creates/writes/deletes]
- [ ] Limit value: [N per M seconds]
- [ ] Implemented in: [client/server/both]
- [ ] Rate limit service updated: [yes/no]

### Data Limits
- [ ] Max document size: [bytes]
- [ ] Max collection size: [count]
- [ ] Max field lengths: [field: length]
- [ ] Validation limits updated: [yes/no]

### Testing
- [ ] Validation tests: [count]
- [ ] Rate limit tests: [count]
- [ ] Firebase Rules tests: [count]
- [ ] Abuse scenario tests: [count]

### Documentation
- [ ] Security assumptions documented
- [ ] Limits documented
- [ ] Abuse vectors identified
- [ ] Mitigations documented
```

---

### Code Review Checklist

Security engineer must sign off:

```markdown
## Security Code Review: [Feature Name]

**Reviewer**: [Name]
**Date**: [Date]
**Status**: [ ] APPROVED [ ] REQUEST CHANGES [ ] BLOCKED

### Auth & Access
- [ ] Ownership properly verified
- [ ] Rules properly scoped
- [ ] No cross-user data leaks

### Input & Output
- [ ] All inputs validated
- [ ] Max limits enforced
- [ ] Errors safe (no info leaks)

### Rate Limiting
- [ ] Abuse vectors identified
- [ ] Rate limits configured
- [ ] Limits tested

### Data Security
- [ ] Document size limited
- [ ] Validation comprehensive
- [ ] Sensitive data protected

### Testing
- [ ] Tests cover happy path
- [ ] Tests cover edge cases
- [ ] Tests cover abuse scenarios
- [ ] Security tests included

### Comments
[Feedback and required changes]
```

---

## Part 3: Future Implementation Workflow

### When Adding a New Feature

1. **Design Phase**
   - Document security requirements
   - Identify potential abuse vectors
   - Plan validation and limits
   - Complete validation checklist template

2. **Implementation Phase**
   - Add validation with limits
   - Add rate limiting if applicable
   - Update Firebase Rules
   - Add error handling
   - Write tests (unit + security)

3. **Review Phase**
   - Developer self-review against checklist
   - Security engineer code review
   - Testing verification
   - Documentation review
   - Security sign-off required

4. **Deployment Phase**
   - Firebase Rules deployed separately
   - Feature flag used if high-risk
   - Monitoring configured
   - Abuse signals logged

5. **Post-Deployment**
   - Monitor for unusual patterns
   - Watch for rate limit violations
   - Respond to abuse signals
   - Adjust limits if needed

---

## Monitoring & Response Plan

### Alerts to Configure

```typescript
// Cloud Functions for monitoring
export const monitorAbuseSignals = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const recentSignals = await db
      .collection('_abuse_signals')
      .where('timestamp', '>', Date.now() - 300000)
      .where('severity', '==', 'high')
      .get();

    if (recentSignals.size > 0) {
      await notifySecurityTeam(recentSignals);
    }
  });
```

### Response Procedures

**Low Severity** (occasional violations):
- Log event
- Monitor user
- Auto-adjust rate limits if needed

**Medium Severity** (multiple violations):
- Alert admin
- Throttle user (slower responses)
- Request user verification
- Temporary account restriction

**High Severity** (active abuse):
- Immediate alert
- Block user account
- Investigate activity
- Contact user
- Legal review if needed

---

## Summary

**Before implementing ANY feature:**
1. Complete security checklist template
2. Identify validation needs
3. Plan rate limiting
4. Update Firebase Rules
5. Write security tests

**After implementing:**
1. Security review required
2. All checklist items verified
3. Code review complete
4. Tests passing
5. Monitoring configured

This ensures security is built-in, not added later.
