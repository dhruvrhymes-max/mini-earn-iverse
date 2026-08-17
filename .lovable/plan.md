# Themes expansion + moderation-compliance pass

## 1. New earning modes and 12 new themes

Today every bot is "mine to earn" with the same tap loop. Add a `game_mode` to each
theme and tenant:

- `mine` — hold/tap a rig, cycle accumulates, claim at the end (existing)
- `tap` — instant tap-to-earn with an energy bar that regenerates
- `spin` — a wheel with a free daily spin + spins earned from tasks
- `idle` — a farm/factory that accrues while away, collect on return

12 new themes spread across those modes, each with its own palette, token identity,
action verb, animated backdrop and home layout family. Examples: Fruit Press (tap),
Lucky Orbit (spin), Coffee Roastery (idle), Sky Harvest (idle), Volt Tap (tap),
Rune Wheel (spin), Reef Dive (mine), Bakery Rush (idle), Pixel Arcade (tap),
Comet Wheel (spin), Nomad Caravan (idle), Crystal Cavern (mine).

Quest/Task section stays identical across all themes, always including
"Watch ads & earn" so Adsgram works everywhere.

The AI bot creator gets `game_mode` in its schema so generated bots pick a mode.

## 2. Moderation rules — how each is handled

1. **Server-rendered content** — the mini app shell and landing page render real
   title/description/how-it-works HTML on the server, so crawlers see content
   without JS. A static `<noscript>`-safe fallback block is added to the mini app route.
2. **No forced ads** — remove any auto-ad trigger on navigation/startup; ads only
   fire from an explicit "Watch Ad" button. The tenant `startup_ad_enabled` flag is
   removed from the runtime path.
3. **No ad-gated core actions** — Collect/Claim, Spin, Convert, Withdraw never
   require an ad. Audit and remove any such gating.
4. **Balance rounding** — one shared `formatAmount()` helper used by every balance
   and reward render; token amounts to 2 decimals, USDT to 4.
5. **Iframe headers** — verify no `X-Frame-Options` / `frame-ancestors` is emitted.
6. **Bot protection** — nothing in the app blocks crawlers; Cloudflare Bot Fight Mode
   is a hosting-side setting outside the code (noted below).
7. **Payout proof** — a public "Payouts" section in the mini app listing recent paid
   withdrawals (masked user handles), plus an optional payout-channel link per bot.
8. **Referral abuse limits** — enforced server-side: max 20 credited referrals/day and
   200/week per user, and the invitee must complete one action (watch 1 ad or a task)
   before the inviter is credited. Backed by a DB migration.
9. **Correct deep links** — every "Open in Telegram" link, including the static
   fallback, is built from the tenant's real bot username + mini app short name.
10. **Custom domain** — a code change can't do this; instructions provided at the end.

## Technical notes

- New DB columns: `tenants.game_mode`, `tenants.payout_channel_url`;
  new `referral_credits` ledger table (with GRANTs + RLS) for daily/weekly caps.
- `theme-presets.ts` grows to 27 presets; presets carry `game_mode` + `layout_family`.
- `ThemeHome.tsx` splits into per-mode home components (`MineHome`, `TapHome`,
  `SpinHome`, `IdleHome`) sharing theme tokens — also reduces the current file size.
- New server fns: `tapEarn`, `spinWheel`, `collectIdle`, `listPayoutProofs`.
- Optimization: shared formatting/theme utils, lazy-loaded 3D backdrops kept
  behind a single loader, dead preset/scene code removed.

## Out of scope for code

Cloudflare Bot Fight Mode and the custom domain must be configured in hosting
settings; I'll give exact steps once the build lands.
