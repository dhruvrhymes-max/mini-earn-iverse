
# Mine-to-Earn SaaS Platform — Initial Build

Building all three portals, the multi-tenant schema, and placeholder edge functions in a single pass. Surface area is huge, so expect rough edges in cosmetics and deep flows; structure, routing, schema, and RLS will be solid.

## 1. Backend (Lovable Cloud / Supabase)

### Schema (with RLS on every table)
- `tenants` — id, slug (unique), name, owner_user_id, status (active/suspended), token_name, token_symbol, token_icon_url, theme (jsonb: colors), economics (jsonb: rate, min_withdraw, mining_rate), ad_config (jsonb: zone ids per network, startup_ad_enabled), created_at
- `app_users` — id, tenant_id, telegram_id, username, first_name, balance, usd_balance, mining_started_at, last_claim_at, referrer_id, wallet_polygon, wallet_bep20, wallet_ton, language, onboarded, created_at — UNIQUE(tenant_id, telegram_id)
- `tasks` — id, tenant_id, type (social|partner|watch), title, url, reward, active, daily_limit, sort_order
- `user_tasks` — id, tenant_id, user_id, task_id, completed_at, count (for daily watch tasks)
- `ad_logs` — id, tenant_id, user_id, network (adsgram|monetag|adexium), reward, created_at
- `transactions` — id, tenant_id, user_id, type (mine|task|ad|referral|convert|deposit|withdraw), amount, currency (TOKEN|USDT), status (pending|approved|rejected|paid), wallet, network, tx_hash (nullable), created_at
- `referral_milestones` — id, tenant_id, threshold, reward, label
- `announcements` — id, message, severity, active, created_at (global, super-admin only)
- `user_roles` — id, user_id, role (super_admin|bot_admin) — separate table per security best practice
- `has_role(uid, role)` security-definer function
- `is_tenant_owner(uid, tenant_id)` security-definer function

### RLS pattern
- `tenants`: owners SELECT/UPDATE their own; super_admin all; public can SELECT minimal columns by slug via a view (`tenants_public`) for the mini app boot.
- All tenant-scoped tables: bot_admin can access rows where they own the tenant; super_admin all.
- `app_users` and write paths from the mini app go through edge functions (Telegram initData is validated server-side; client cannot trust `tenant_id`).

### Edge functions (placeholders, clearly stubbed)
- `telegram-auth` — validates Telegram initData HMAC, upserts `app_users`, returns a short-lived session token (JWT signed with a secret).
- `mini-app-action` — single authenticated entry for: claim mining, complete task, log ad reward, convert tokens→USDT, request withdrawal, set wallet. Enforces tenant isolation server-side.
- `process-withdrawal` — bot_admin approves a pending withdrawal: deducts balance, marks `approved` → `paid`, writes a mock `tx_hash`. TODO comments mark where real Web3 signer/RPC would go.
- `web3-payout-mock` — returns fake tx hash; documented as stub.

## 2. Routing (TanStack Start, file-based)

```
src/routes/
  __root.tsx
  index.tsx                          → marketing/landing (links to admin login)
  login.tsx                          → admin email/password
  signup.tsx                         → bot creator signup
  _authenticated.tsx                 → gate
  _authenticated/
    admin/
      index.tsx                      → bot admin dashboard (lists owned tenants, create new)
      $tenantId/
        index.tsx                    → analytics
        branding.tsx                 → token name/icon/theme
        economics.tsx                → rates, min withdraw, mining
        ads.tsx                      → ad provider keys + toggles
        tasks.tsx                    → CRUD tasks
        withdrawals.tsx              → pending pipeline + Accept
        milestones.tsx               → referral tiers
    super/
      index.tsx                      → platform overview stats
      tenants.tsx                    → list/suspend/delete
      announcements.tsx              → global broadcasts
  app/
    $tenantSlug.tsx                  → layout, loads tenant theme + injects CSS vars
    $tenantSlug/
      index.tsx                      → onboarding carousel → startup ad → home
      tasks.tsx                      → tabbed Task Hub (Social/Partners/Watch/Refer)
      mine.tsx                       → main action (per tenant verb shown)
      refer.tsx                      → referral link + milestones
      profile.tsx                    → finance menu, settings
      withdraw.tsx
      convert.tsx
      wallets.tsx
      deposit.tsx
      history.tsx
  api/
    public/telegram-webhook.ts       → optional bot webhook stub
```

Mini app routes use `$tenantSlug` in URL. Tenant theme loaded via server fn into CSS variables on the layout.

## 3. Portal 1 — End-User Mini App (mobile-first)
- Onboarding carousel (3 slides), persisted via `app_users.onboarded`.
- Startup interstitial ad component (countdown 5–15s, skippable after timer).
- Bottom nav with 5 items; middle action button enlarged and themed per tenant verb (Mine/Fish/Wood).
- Home: balance, USD equiv, hourly rate, central claim button with cooldown.
- Task Hub tabs: Social, Partners, Watch (with daily counters from `user_tasks.count` vs `tasks.daily_limit`), Refer (milestones with lock/unlock visuals).
- Profile menu: Finance (withdraw/convert/wallets/deposit/history), Community (channel/support links from tenant config), Settings (language).
- Ad network triggers: stub SDK wrappers for AdsGram / Monetag / Adexium that simulate completion and POST to `mini-app-action`.

## 4. Portal 2 — Bot Creator Admin (desktop)
- Sidebar layout per-tenant.
- Branding form (icon upload to Supabase storage bucket `tenant-assets`).
- Economics form with live preview of conversion math.
- Ad config form (zone IDs, toggles).
- Task CRUD with tab assignment.
- Analytics: counts via aggregate queries (active users, token liability = SUM balance, ad impressions, pending withdraw total).
- Withdrawals table with "Accept" → calls `process-withdrawal` edge fn.
- Milestone CRUD.

## 5. Portal 3 — Super Admin
- Overview: total bots, total users, pending withdrawals platform-wide.
- Tenants list: suspend/delete/view config (read-only inspector).
- Announcements: create/toggle; bot admin panels show a banner from active announcements.

## 6. Design
Mini app: mobile, vibrant per-tenant theme via CSS vars (set from tenant.theme jsonb), large tappable targets, dark default.
Admin portals: clean desktop dashboard, neutral palette, shadcn cards/tables.
Both use the design token system in `src/styles.css` (no hard-coded colors).

## Technical notes
- Auth: email/password via Lovable Cloud for admins. End users authenticate via Telegram initData validated in `telegram-auth` edge fn; mini-app stores returned JWT in memory + localStorage, attaches to action calls.
- Tenant identification: URL path `/app/:tenantSlug`. Tenant resolved server-side per request.
- Role check: `user_roles` table + `has_role()` definer function; `super_admin` seeded manually via SQL after first signup.
- Web3: pure placeholders — addresses stored as strings, withdrawal flow only updates DB, mock tx hashes returned.
- File uploads: Supabase storage bucket `tenant-assets` with RLS.
- All client→server writes go through server functions (`createServerFn` with `requireSupabaseAuth`) or the `mini-app-action` edge function — never direct client inserts to sensitive tables.

## Out of scope for this pass
- Real Web3 signing / on-chain transactions
- Real Telegram bot creation flow (separate concern; we model the tenant record only)
- i18n translations (language selector stores preference; only English strings ship)
- Production-grade rate limiting on edge functions (basic checks only)

After you approve, I'll enable Lovable Cloud, run the schema migration, scaffold all routes, and wire everything up.
