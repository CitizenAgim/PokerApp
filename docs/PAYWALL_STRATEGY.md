# Paywall & Monetization Strategy

## 1. The Monetization Model: "Freemium"
The most effective strategy for utility apps (like a Poker Tracker) is **Freemium**.
*   **Free Tier:** Useful enough to get the user hooked (e.g., record 10 hands per session, view basic stats).
*   **Premium Tier:** Unlocks the full potential (unlimited recording, advanced analytics, cloud sync).

## 2. Subscription Structure (The "Abonnement")
We will implement a hybrid model offering both recurring subscriptions and a lifetime buyout.

### A. Recurring Subscriptions
*   **Monthly:** Low barrier to entry. Good for users trying it out.
*   **Yearly:** The target conversion. Usually priced at ~10x the monthly price (giving 2 months free) to encourage commitment.

### B. Lifetime Purchase (One-Time)
*   **Strategy:** Priced high (e.g., 2.5x to 3x the Yearly price).
*   **Psychology:** This serves as an "Anchor." It makes the Yearly subscription look like a great deal, while capturing revenue from users who hate subscriptions.
*   **Risk:** You must ensure your server costs (Firebase) per user are low enough that a one-time payment covers them forever.

### C. Pricing Examples (Estimates)
*   **Monthly:** €4.99
*   **Yearly:** €49.99 (Save ~17%)
*   **Lifetime:** €149.99

## 3. Technical Implementation
Since we are selling **Digital Goods** (app features), we **must** use the native store billing systems.

### The Tech Stack
1.  **RevenueCat (Highly Recommended):**
    *   It is a "middleware" wrapper.
    *   Instead of writing complex code for Apple StoreKit AND Google Play Billing separately, you implement RevenueCat once.
    *   It handles receipt validation, subscription status tracking, and cross-platform entitlement (if a user buys on iPhone, they can restore on iPad).
    *   It has a generous free tier for startups.

2.  **Store Setup:**
    *   **Apple App Store Connect:** Configure "Auto-Renewable Subscriptions" and "Non-Consumable" (Lifetime).
    *   **Google Play Console:** Configure "Subscriptions" and "In-app products".

## 4. Legal & Risk Management (Belgium / EU Context)
*Disclaimer: This is strategic advice, not legal counsel. You should have a local lawyer review your final Terms.*

### A. Service Reliability & "As Is" Clauses
To protect yourself if Firebase goes down or the app has bugs:
*   **No Warranty Clause:** Your Terms of Service (ToS) must state the app is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.
*   **Limitation of Liability:** Explicitly state that you are not liable for data loss, financial loss (it's a gambling-related app, so clarify you are not responsible for their poker losses), or service interruptions.
*   **Force Majeure:** You are not responsible for outages caused by third parties (like Google Firebase, Apple, internet providers).

### B. Consumer Protection (EU)
*   **Right of Withdrawal:** Digital goods usually have an exception to the 14-day withdrawal right *once the service has started*, but Apple/Google handle refunds directly. You generally direct users to the Store support for refunds.
*   **Transparency:** You must clearly display the price, billing frequency, and how to cancel *before* they pay.

### C. Data & Privacy (GDPR)
*   Since you are in Belgium, GDPR is critical.
*   If Premium includes "Cloud Sync," you are processing personal data.
*   Ensure your Privacy Policy explains exactly what is stored.

## 5. Potential Premium Features (The "Hook")
To justify the subscription, consider gating these features:
1.  **Unlimited Hand History:** Free users limited to X hands/month.
2.  **Cloud Sync:** Backup data to Firebase (Free users store locally only).
3.  **Advanced Analytics:** Positional stats, VPIP/PFR graphs, "Leak Finder".
4.  **Export Data:** Ability to export hands to CSV/Excel.
5.  **Bankroll Management:** Advanced charts on profit/loss over time.

## 6. Next Steps
1.  **Define the Feature Set:** Decide exactly which existing or new features are "Premium".
2.  **Set up RevenueCat:** Create an account and link it to the app.
3.  **Draft Legal Docs:** Create a Terms of Use and Privacy Policy (can use generators, but review manually).
4.  **Design the Paywall Screen:** A UI that lists benefits and allows purchase.
