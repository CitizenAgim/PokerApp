# Monetization Strategy

## 1. The Core Philosophy
**Target Audience:** Live Cash Game Players.
**Psychology:** These users play with real money and view poker as an investment or serious hobby. They are willing to pay for tools that provide an "edge" or protect their data.
**Approach:** Avoid ads. Ads are distracting at the table and cheapen the user experience. Use a **Freemium + Subscription** model.

## 2. Recommended Model: Freemium + "Pro" Subscription
**Pricing Suggestion:** ~$4.99/month or ~$49.99/year.
**Lifetime Option:** ~$99 (High ticket one-time purchase for subscription-averse users).

### The Free Tier (The Hook)
Designed to be fully functional for a casual player, but limited for a grinder.
*   **Session Tracking:** Unlimited local sessions (never hold their data hostage).
*   **Basic Stats:** Total Profit/Loss, Hourly Rate.
*   **Player Notes:** Limit to 5-10 players.
*   **Ranges:** Access to default/starter ranges only.

### The Pro Tier (The Monetization)
Features that offer "Insurance," "Edge," or "Deep Analysis."

#### A. Cloud Sync & Data Backup (The "Insurance" Sell)
*   **Value:** "Don't lose your bankroll history if you lose your phone."
*   **Implementation:** Gate the Firebase auto-sync feature behind the subscription. Free users store data locally on the device.

#### B. Unlimited Player Profiling (The "Edge" Sell)
*   **Value:** "Track every opponent at your local casino. Keep detailed notes on their ranges and tendencies."
*   **Implementation:** Free users get ~5 player profiles. Pro users get unlimited.

#### C. Advanced Analytics (The "ROI" Sell)
*   **Value:** "Treat your poker like a business."
*   **Implementation:** Advanced charts (Heatmaps, Profit by Position, Profit by Day of Week, Hourly Rate by Stake) are Pro-only.

#### D. Custom Range Editor (The "Study" Sell)
*   **Value:** "Build your own strategy."
*   **Implementation:** Free users can view ranges. Pro users can create and edit custom ranges.

## 3. Secondary Revenue: Content Packs (In-App Purchases)
Sell "knowledge" as one-time purchases for users who don't want a subscription.

*   **"GTO Starter Pack" ($9.99):** Pre-loaded, solved ranges for 100BB deep games.
*   **"Exploitative Pack" ($9.99):** Ranges designed for low-stakes live games.

## 4. Technical Implementation Plan

### 1. Infrastructure
*   **RevenueCat:** Use the RevenueCat SDK for handling subscriptions and receipt validation (Apple/Google). It is the industry standard for React Native.

### 2. Code Gating
*   **Database:** Add an `isPro` flag to the user profile in Firestore/Local Storage.
*   **Hooks:**
    *   `usePlayer.ts`: Check `isPro` before allowing `createPlayer` if `players.length >= limit`.
    *   `services/sync.ts`: Only execute the sync loop if `isPro` is true.
    *   `RangeEditor.tsx`: Disable "Save" button for non-Pro users.

### 3. UI/UX
*   **Paywall Screen:** A clean comparison screen showing Free vs. Pro features.
*   **Upsell Points:**
    *   When trying to add the 6th player.
    *   When enabling "Sync" in settings.
    *   When trying to edit a range.

## 5. Roadmap
1.  **Phase 1 (Current):** Build the core features (Sync, Players, Ranges) to be robust.
2.  **Phase 2 (Gate):** Implement RevenueCat and add the "Pro" gates.
3.  **Phase 3 (Content):** Create the "Strategy Packs" for additional revenue.
