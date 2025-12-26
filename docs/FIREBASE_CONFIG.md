# Firebase Configuration & Indexes

> **IMPORTANT INSTRUCTION:**
> This file must be kept updated whenever changes are made to the Firebase configuration or Firestore indexes.
> If you create a new index in the Firebase Console, please add it to the list below and update `firestore.indexes.json`.

## Firestore Indexes (Composite)

These indexes are required for complex queries (filtering by multiple fields or sorting mixed with filtering).

### 1. Players (Shared Lists)
*   **Collection:** `players`
*   **Query:** Find players shared with a user, sorted by update time.
*   **Fields:**
    *   `sharedWith`: **Array Contains**
    *   `updatedAt`: **Descending**

### 2. Friend Requests (Incoming)
*   **Collection:** `friendRequests`
*   **Query:** Find incoming requests with specific status, sorted by date.
*   **Fields:**
    *   `status`: **Ascending**
    *   `toUserId`: **Ascending**
    *   `createdAt`: **Descending**

### 3. Players (Owned)
*   **Collection:** `players`
*   **Query:** Find players created by a user, sorted by update time.
*   **Fields:**
    *   `createdBy`: **Ascending**
    *   `updatedAt`: **Descending**

### 4. Hands (Session History)
*   **Collection:** `hands`
*   **Query:** Find hands in a specific session for a specific user, sorted by time.
*   **Fields:**
    *   `sessionId`: **Ascending**
    *   `userId`: **Ascending**
    *   `timestamp`: **Descending**

### 5. Friend Requests (Outgoing)
*   **Collection:** `friendRequests`
*   **Query:** Find outgoing requests with specific status, sorted by date.
*   **Fields:**
    *   `fromUserId`: **Ascending**
    *   `status`: **Ascending**
    *   `createdAt`: **Descending**

### 6. Sessions (User History)
*   **Collection:** `sessions`
*   **Query:** Find sessions created by a user, sorted by start time.
*   **Fields:**
    *   `createdBy`: **Ascending**
    *   `startTime`: **Descending**

## Deployment

To deploy these indexes to Firebase, run:
```bash
firebase deploy --only firestore:indexes
```
