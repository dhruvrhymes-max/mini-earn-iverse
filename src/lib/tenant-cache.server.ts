/**
 * Tiny in-memory cache for tenant rows.
 *
 * The mini app reads the same tenant row on every page view (SSR loader + boot).
 * Caching it for a short TTL inside the server runtime removes most repeated
 * database round-trips, which both speeds up first paint and keeps backend
 * usage (and therefore cloud spend) low. Writes to a tenant call `invalidateTenant`
 * so admins see their changes immediately.
 */
type Entry = { row: any; at: number };

const TTL_MS = 60_000;
const bySlug = new Map<string, Entry>();
const byId = new Map<string, string>(); // tenant id -> slug

const TENANT_COLUMNS =
  "id,slug,name,status,token_name,token_symbol,token_icon_url,action_verb,theme,theme_preset,economics,ad_config,community,referral_config,bot_username,mini_app_short_name,admin_telegram_ids,game_mode,payout_channel_url,bot_token";

export async function loadTenantRow(supabaseAdmin: any, slug: string): Promise<any | null> {
  const hit = bySlug.get(slug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.row;

  const { data: row, error } = await supabaseAdmin
    .from("tenants")
    .select(TENANT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);

  bySlug.set(slug, { row: row ?? null, at: Date.now() });
  if (row?.id) byId.set(row.id, slug);
  return row ?? null;
}

/** Drop the cached row after an admin edit so changes appear right away. */
export function invalidateTenant(idOrSlug: string) {
  const slug = byId.get(idOrSlug) ?? idOrSlug;
  bySlug.delete(slug);
  byId.delete(idOrSlug);
}
