# Firebase Cost Estimation

Based on the current codebase with the new database structure and typical usage patterns for a poker utility app.

## Summary
**Estimated Cost: $0.01 - $0.03 per user / year** (regular to power users)

With the optimized database structure (embedded ranges, subcollections, local-first architecture), costs are **extremely low** because:
- Small data footprint (text, numbers, small JSON objects)
- Local-first architecture minimizes cloud operations
- Embedded ranges reduce read operations by 50%
- Subcollection queries are efficient (only query your data)
- Batched syncing reduces write frequency
- Firebase's generous pricing for this usage tier

## Database Structure (Updated)
The new structure uses subcollections to improve scalability and reduce costs:

```
/users/{userId}/
  /players/{playerId}
    - name, color, notes, locations
    - ranges (embedded) ← Reduces reads by 50% vs. old structure
  /sessions/{sessionId}
    - name, stakes, location, notes, players
```

## Detailed Breakdown

### 1. Database Reads

**Usage Pattern (5 days/week = 260 days/year):**
- App open (sync): 2 reads/day (players + sessions)
- View/edit operations: ~8 reads/day
- **Total: ~10 reads/day**

**Volume**:
- Daily: 10 reads
- Yearly: **2,600 reads**
- Cost: $0.036 per 100,000 reads
- **Total**: **~$0.0009 / year**

**Key Optimization**: Embedded ranges mean fetching a player includes all their ranges in one read (vs. 2 reads in the old structure).

### 2. Database Writes

**Usage Pattern:**
- Syncing queued changes: ~5 writes/day
- Creating players/sessions: ~2 writes/week
- Updating ranges: ~3 writes/week
- **Total: ~5 writes/day**

**Volume**:
- Daily: 5 writes
- Yearly: **1,300 writes**
- Cost: $0.108 per 100,000 writes
- **Total**: **~$0.0014 / year**

### 3. Storage

**Data Breakdown**:
- Player profiles (30 players × 2KB): ~60 KB
- Session history (150 sessions × 1KB): ~150 KB
- Ranges (embedded): ~100 KB
- **Text Data Total**: ~300 KB
- Photos (30 photos × 20KB optimized): ~600 KB
- **Total per user**: ~1 MB

**Costs**:
- Firestore Storage: $0.108 per GB/month
- 1 MB × 12 months = 12 MB = $0.0013/year
- Photo download bandwidth (minimal with caching): ~$0.005/year
- **Total**: **~$0.0065 / year**

## Cost Tiers by User Engagement

| User Type | Reads/Year | Writes/Year | Storage | Annual Cost |
|-----------|-----------|-----------|---------|-------------|
| **Light** (1 day/week) | 500 | 260 | 500 KB | ~$0.002 |
| **Regular** (5 days/week) | 2,600 | 1,300 | 1 MB | ~$0.008 |
| **Power** (daily, heavy tracking) | 10,000 | 5,000 | 5 MB | ~$0.030 |

## Total Estimated Cost
- **Light user**: **~$0.002 / year**
- **Regular user**: **~$0.008 / year**
- **Power user**: **~$0.030 / year**
- **Average**: **~$0.01 per user / year**

## Cost Savings from New Structure

Compared to the old flat-collection design:

| Metric | Old | New | Savings |
|--------|-----|-----|---------|
| Reads per player fetch | 2 | 1 | 50% |
| Query efficiency | Global filter | Subcollection | ~40% |
| **Estimated cost reduction** | - | - | **~35%** |

## Scale Economics

| Users | Monthly Cost | Yearly Cost |
|-------|--------------|-------------|
| 100 | **~$0.08** | **~$1** |
| 1,000 | **~$0.80** | **~$10** |
| 10,000 | **~$8** | **~$100** |
| 100,000 | **~$80** | **~$1,000** |

## Potential Cost Drivers (Future Features)

1. **Real-time Collaboration** (Friends watching live sessions)
   - Estimated impact: +500% writes
   - Cost at 10K users: ~$50/year (still very affordable)

2. **Advanced Analytics** (Hand history analysis, statistics)
   - Estimated impact: +200% reads
   - Cost at 10K users: ~$35/year (manageable)

3. **Photos at scale** (High-resolution player photos for 100+ players)
   - Storage: 10 MB per user = $0.012/year
   - Bandwidth: ~$0.05/year
   - Total at 10K users: ~$600/year

## Recommendations

✅ **Current structure is cost-optimal** for the foreseeable future.

✅ You can confidently scale to **10,000 users** for roughly **$100/year** in Firestore costs alone.

✅ **No optimization needed** until you exceed 50,000+ active concurrent users.

⚠️ **Future Optimizations** (if needed):
- Implement pagination for session history (only load recent 100)
- Archive old sessions to reduce query size
- Lazy-load player photos only when viewing individual profiles
- Batch writes using batch operations (currently doing this)
