# Mineable Magic

Build a Multi-Tenant SaaS platform for creating gamified Telegram Mini Apps ("Mine-to-Earn"). The project requires three distinct web portals: a Super Admin Panel (for the platform owner), a Bot Admin Panel (for individual bot creators), and a Dynamic End-User Mini App. Integrate with Supabase using a multi-tenant database architecture (using tenant_id for all queries).

​Portal 1: The Dynamic End-User Mini App (Mobile First)

This UI must dynamically load themes, tokens, and data based on the specific tenant_id passed in the URL.

​Onboarding: A first-time user tutorial carousel (3-4 slides explaining how to earn, mine, and withdraw) that appears before the main dashboard.

​Initialization: A mandatory startup Interstitial Video Ad (5-15 seconds).

​Bottom Navigation: Home, Task Hub, Main Action (e.g., Fish/Wood/Mine), Refer, Profile.

​Home/Main Action: Large token balance, USD equivalent, hourly mining rate, and an interactive central button to start/claim mining.

​Task Hub (Tabbed Interface): >   * Social Tab: Standard tasks (Join Telegram, Follow IG).

​Partners Tab: External partner links.

​Watch Tab: Prominent buttons to trigger Rewarded Ads from multiple networks (e.g., AdsGram, Monetag, Adexium). Show remaining daily limits (e.g., 0/20 left).

​Refer Tab: Referral Milestones UI (e.g., "5 Referrals = +100 Tokens" with a visual lock/unlock state).

​Profile & Finance: A categorized menu list containing:

​Finance: Withdraw USDT (with min limit logic), Convert Tokens to USDT, Set Wallet Addresses (Polygon, BEP20, TON), Deposit (Buy tokens), Transaction History.

​Community: Official Channel, Support chat link.

​Settings: Language selector.

​Portal 2: Bot Creator Admin Panel (Desktop Optimized)

A gated dashboard for users who created a bot on the platform to manage their specific instance.

​Branding & Theme: Inputs to define the Token Name, Token Icon (upload), and color scheme.

​Economics Engine: Inputs to set the Token-to-USDT conversion rate (e.g., 1000 = 0.1 USDT), minimum withdrawal thresholds (e.g., 0.1 USDT), default mining rates, and referral milestone rewards.

​Ad Monetization: Input fields for API keys/Zone IDs for multiple ad providers (AdsGram, Monetag, Adexium). Toggles to enable/disable startup ads.

​Task Manager: A CRUD interface to create tasks and assign them to the specific tabs (Social, Partner, Watch).

​Bot Analytics: Dashboard showing active users, token liability, ad impressions, and total pending withdrawals for their bot.

​Withdrawal Pipeline: A table of pending user withdrawals. The Bot Owner clicks "Accept" to trigger a Supabase Edge Function that deducts the user's balance and records an "Approved" transaction (Web3 payout logic placeholders required here).

​Portal 3: Super Admin Panel (For the SaaS Owner)

A master dashboard to manage the entire platform.

​Platform Overview: High-level stats: Total Bots Created, Total Global Users, Total Revenue (if charging a platform fee).

​Tenant Management: A list of all created bots. Super Admin can suspend, delete, or view the configuration of any bot on the platform.

​Global Announcements: Ability to push a notification or banner to all Bot Creator Admin Panels.

​Database & Logic Requirements (Supabase)

​Multi-Tenant Schema: Generate a robust schema with Row Level Security (RLS) ensuring strict isolation. Tables: tenants (bots), users, tasks, user_tasks, ad_logs, transactions, referral_milestones. Every table except tenants must have a tenant_id foreign key.

​Edge Functions: Set up placeholder Edge Functions for processing withdrawals securely (simulating token deduction and marking as paid) and mock Web3 transaction handlers.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mini-earn-iverse.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7f0be3be-1da1-4723-b96b-92ef0c36af2b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
