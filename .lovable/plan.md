## Phase A — Miner admin (web + in-app) + pluggable ad providers

**Miner admin (backend already has `miners` CRUD server fns)**
- Web: new tab in `/admin/$tenantId/miners.tsx` — table + create/edit dialog (name, emoji/image url, price, rate/hr, duration, rarity chip, sort).
- In-app: extend `/app/$tenantSlug/admin.tsx` with a Miners section reusing `adminListMiners` / `adminSaveMiner` / `adminDeleteMiner`.
- Add optional `image_url` and `rarity` columns to `miners` (migration) so cards match the MilkyFarm screenshot.
- Rework `/app/$tenantSlug/miners.tsx` into the Marketplace / My Bottles two-tab layout from the reference.

**Ad providers**
- Migration: `ad_providers` table (tenant_id, kind: monetag|adsgram|onclicka|custom, config jsonb, active, sort). Keep existing `tenants.ads` as fallback.
- Server fns: list/save/delete + `listActiveAdSlots` for the mini app.
- Web admin `/admin/$tenantId/ads.tsx`: replace with provider list + per-provider fields (Monetag zone id, Adsgram block id, Onclicka zone, Custom script URL + zone).
- In-app admin panel: mirror. Runtime `AdRunner` component dispatches by kind.

## Phase B — AI Bot Creator (Gemini + Lovable Claude-equivalent)

- Secret: prompt for `GEMINI_API_KEY` via add_secret. For "Claude" option use Lovable AI Gateway with `openai/gpt-5.5` (labelled "Claude Pro (via Lovable)" in UI since real Claude isn't in the gateway catalog).
- New page `/admin/new-ai.tsx`: textarea ("Describe your bot — e.g. orange fruit theme"), provider dropdown (Gemini / Claude Pro), generate button.
- Server fn `generateBotConfig`: builds structured prompt → returns JSON `{name, theme{primary,bg,accent}, scene, token_name, token_symbol, action_verb, welcome_text, welcome_cta_text, mascot_emoji, tasks:[…], miners:[…]}`. Uses Zod `Output` schema.
- Preview screen (live theme card) → "Looks good, add bot token" → creates tenant + tasks + miners in one call, hooks bot token, sets webhook.

## Phase C — 3D animations on every page

- `bun add three @react-three/fiber @react-three/drei`.
- New `src/components/mini/Theme3D.tsx`: R3F Canvas with per-theme scene (galaxy = particle starfield + planet; diamond = rotating crystal; lava = ember particles + glowing rock; ghost = floating ghost meshes; milk = liquid bottles bobbing; forest = trees + leaves; etc.). Lazy-loaded per theme, `Suspense` fallback = current CSS `ThemeScene`.
- Wrap in `<Suspense>` + `React.lazy` so bundle only loads active theme.
- Render as fixed background layer inside `$tenantSlug.tsx` so every page (home, mine, tasks, invite, profile) shares the 3D backdrop. Home + Mine also get a foreground 3D hero object.
- Perf: `dpr=[1,1.5]`, `frameloop="demand"` where possible, disable on `prefers-reduced-motion`.

## Data / files touched

**New**: `supabase/migrations/*_miners_images_ad_providers.sql`, `src/lib/ad-providers.functions.ts`, `src/lib/ai-bot-creator.functions.ts`, `src/components/mini/Theme3D.tsx`, `src/components/mini/AdRunner.tsx`, `src/routes/_authenticated/admin/$tenantId/miners.tsx`, `src/routes/_authenticated/admin/new-ai.tsx`.
**Edit**: `src/routes/_authenticated/admin/$tenantId/ads.tsx`, `src/routes/_authenticated/admin/$tenantId.tsx` (nav), `src/routes/app/$tenantSlug/admin.tsx` (miners + ads sections), `src/routes/app/$tenantSlug/miners.tsx` (marketplace UI), `src/routes/app/$tenantSlug.tsx` (mount Theme3D), `src/lib/miners.functions.ts` (image_url/rarity).

## Assumptions
- "Claude Pro" in your UI = Lovable AI Gateway routed to `openai/gpt-5.5` (real Anthropic isn't in the Lovable catalog). If you want true Claude, you'd need to add an Anthropic key later — I'll leave a code slot for that.
- 3D bundle can exceed 1 MB per your ok; only the active theme's scene chunk loads.
- Gemini image generation for mascots is out of scope for this batch (can add in a follow-up).

Approve and I'll start Phase A immediately.