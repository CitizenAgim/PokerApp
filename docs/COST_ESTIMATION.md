# Firebase Cost Estimation

Based on the current codebase and typical usage patterns for a poker utility app, here is a cost estimation for a **regular user** (using the app daily, playing ~3 sessions a week).

## Summary
**Estimated Cost: Less than $0.10 per user / year**

For a typical user, the cost is negligible because the data being stored (text, numbers, small JSON objects) is very small, and Firebase's pricing model is generous for this type of usage.

## Detailed Breakdown

### 1. Database Reads (The biggest factor)
*   **Scenario**: Every time the user opens the app, it fetches their list of Players and Sessions.
*   **Volume**:
    *   ~100 Players + ~150 Sessions = 250 documents fetched per launch.
    *   Launched 2x/day = 500 reads/day.
    *   **Yearly**: ~180,000 reads.
*   **Cost**: Firebase charges ~$0.036 per 100,000 reads.
*   **Total**: **~$0.06 / year**.

### 2. Database Writes
*   **Scenario**: Creating players, saving sessions, updating ranges, and saving table state.
*   **Volume**:
    *   Even with heavy usage (updating table state every hand, saving ranges frequently), a user might generate ~20,000 writes per year.
*   **Cost**: Firebase charges ~$0.108 per 100,000 writes.
*   **Total**: **~$0.02 / year**.

### 3. Storage (Including Photos)
*   **Scenario**: Storing player profiles, hand ranges, session history, and **player photos**.
*   **Text Data**: Negligible (< 10MB).
*   **Photos (Optimized)**:
    *   Assuming 100 players per user.
    *   Photos are now resized to max 400px width (avg **20KB**).
    *   Total storage: ~2MB per user.
    *   **Storage Cost**: $0.026/GB => Effectively $0.
    *   **Bandwidth Cost**: Downloading photos (cached locally). Est. 20MB/month => $0.0024/month => ~$0.03 / year.
*   **Total**: **~$0.03 / year**.

## Total Estimated Cost
**~$0.11 per user / year** (including photo storage and bandwidth).

## Potential Cost Risks (Scale)
While individual users are cheap, here are things that could increase costs:

1.  **Inefficient Syncing**: Currently, the app fetches *all* players and sessions every time. As a user's history grows (e.g., 5,000 sessions after 10 years), fetching the entire list every time will become more expensive (and slower).
    *   *Solution*: Implement "pagination" (load only recent sessions) or "delta sync" (only load what changed since last login).
2.  **Images**: If you allow high-resolution photos for every player, storage and bandwidth costs will rise, though still likely under $1/year per user unless they are uploading massive files.
3.  **Real-time Features**: If you implement a "Live Share" feature where every single button click (fold/call/raise) instantly updates the database so friends can watch, write costs will increase by ~10x, but even then, it would likely stay under $1/year.

## Recommendation
You do not need to worry about per-user costs at this stage. You could support **10,000 active users** for roughly **$1,000/year**, which is very sustainable if you have any monetization strategy (ads, subscription, or paid app).
