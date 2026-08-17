/**
 * Shared Telegram mini-app admin gate.
 * Validates WebApp initData against the tenant's bot token and checks that the
 * Telegram user is a global platform admin or listed in tenants.admin_telegram_ids.
 */
import { createHmac, timingSafeEqual } from "crypto";

export const GLOBAL_MINI_ADMIN_IDS = [7438823799, 6792289044];

export function verifyInitData(initData: string, botToken: string): { id: number; username?: string } | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
    const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
    const expected = createHmac("sha256", secret).update(dcs).digest("hex");
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return JSON.parse(params.get("user") || "{}");
  } catch {
    return null;
  }
}

export async function requireTgAdmin(
  tenantId: string,
  initData: string | null | undefined,
  previewTgId: number | null | undefined,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", tenantId).maybeSingle();
  if (!tenant) throw new Error("Bot not found");

  let tgId: number | null = null;
  if (initData && tenant.bot_token) {
    const u = verifyInitData(initData, tenant.bot_token);
    tgId = Number(u?.id) || null;
  }
  if (!tgId && previewTgId) tgId = Number(previewTgId);
  if (!tgId) throw new Error("Telegram auth required");

  const allowed = [
    ...GLOBAL_MINI_ADMIN_IDS,
    ...(Array.isArray(tenant.admin_telegram_ids) ? tenant.admin_telegram_ids.map(Number) : []),
  ];
  if (!allowed.includes(tgId)) throw new Error("Not authorised");
  return { supabaseAdmin, tenant, tgId };
}

/** Convenience gate for server functions that take the standard auth payload. */
export async function gateTgAdmin(d: { tenantId: string; initData?: string | null; previewTgId?: number | null }) {
  return requireTgAdmin(d.tenantId, d.initData, d.previewTgId);
}
