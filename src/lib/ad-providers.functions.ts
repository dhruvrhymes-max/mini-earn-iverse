import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PROVIDER_KIND = z.enum(["monetag", "adsgram", "onclicka", "direct_link", "ao_code", "custom"]);
const PROVIDER_SCHEMA = z.object({
  id: z.string().uuid().nullable().optional(),
  kind: PROVIDER_KIND,
  label: z.string().min(1).max(60),
  config: z.record(z.any()).default({}),
  reward_tokens: z.number().min(0).default(0),
  daily_cap: z.number().int().min(0).default(20),
  active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

// ── Public read for the mini app ─────────────────────────────
export const listAdProviders = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ tenantId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("ad_providers")
      .select("id,kind,label,config,reward_tokens,daily_cap,active,sort_order")
      .eq("tenant_id", data.tenantId).eq("active", true).order("sort_order");
    return rows ?? [];
  });

// ── Web admin (owner) CRUD ───────────────────────────────────
export const ownerListAdProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tenantId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("ad_providers")
      .select("*").eq("tenant_id", data.tenantId).order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const ownerSaveAdProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tenantId: z.string().uuid(), provider: PROVIDER_SCHEMA }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data.provider;
    if (id) {
      const { error } = await context.supabase.from("ad_providers").update(fields).eq("id", id).eq("tenant_id", data.tenantId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("ad_providers").insert({ ...fields, tenant_id: data.tenantId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const ownerDeleteAdProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tenantId: z.string().uuid(), providerId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ad_providers").delete().eq("id", data.providerId).eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── In-app admin (Telegram-auth) CRUD ────────────────────────
async function validateTgAdmin(tenantId: string, initData: string | null | undefined, previewTgId: number | null | undefined) {
  const { createHmac, timingSafeEqual } = await import("crypto");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const GLOBAL = [7438823799, 6792289044];
  const { data: tenant } = await supabaseAdmin.from("tenants").select("bot_token,admin_telegram_ids").eq("id", tenantId).maybeSingle();
  if (!tenant) throw new Error("Bot not found");
  let tgId: number | null = null;
  if (initData && tenant.bot_token) {
    try {
      const p = new URLSearchParams(initData);
      const hash = p.get("hash");
      if (hash) {
        p.delete("hash");
        const dcs = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
        const secret = createHmac("sha256", "WebAppData").update(tenant.bot_token).digest();
        const expected = createHmac("sha256", secret).update(dcs).digest("hex");
        const a = Buffer.from(hash, "hex"), b = Buffer.from(expected, "hex");
        if (a.length === b.length && timingSafeEqual(a, b)) {
          tgId = Number(JSON.parse(p.get("user") || "{}")?.id) || null;
        }
      }
    } catch { /* fall through */ }
  }
  if (!tgId && previewTgId) tgId = previewTgId;
  if (!tgId) throw new Error("Telegram auth required");
  const allowed = [...GLOBAL, ...((tenant.admin_telegram_ids as any[]) ?? []).map(Number)];
  if (!allowed.includes(tgId)) throw new Error("Not authorised");
  return { supabaseAdmin };
}

export const tgListAdProviders = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    tenantId: z.string().uuid(),
    initData: z.string().nullable().optional(),
    previewTgId: z.number().int().positive().nullable().optional(),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await validateTgAdmin(data.tenantId, data.initData, data.previewTgId);
    const { data: rows } = await supabaseAdmin.from("ad_providers").select("*").eq("tenant_id", data.tenantId).order("sort_order");
    return rows ?? [];
  });

export const tgSaveAdProvider = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    tenantId: z.string().uuid(),
    initData: z.string().nullable().optional(),
    previewTgId: z.number().int().positive().nullable().optional(),
    provider: PROVIDER_SCHEMA,
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await validateTgAdmin(data.tenantId, data.initData, data.previewTgId);
    const { id, ...fields } = data.provider;
    if (id) {
      const { error } = await supabaseAdmin.from("ad_providers").update(fields).eq("id", id).eq("tenant_id", data.tenantId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("ad_providers").insert({ ...fields, tenant_id: data.tenantId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const tgDeleteAdProvider = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    tenantId: z.string().uuid(),
    initData: z.string().nullable().optional(),
    previewTgId: z.number().int().positive().nullable().optional(),
    providerId: z.string().uuid(),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await validateTgAdmin(data.tenantId, data.initData, data.previewTgId);
    const { error } = await supabaseAdmin.from("ad_providers").delete().eq("id", data.providerId).eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
