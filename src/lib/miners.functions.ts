import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const GLOBAL_MINI_ADMIN_IDS = [7438823799, 6792289044];

/** Validate telegram initData — inline copy to keep this file client-safe. */
async function validateTgAdmin(tenantId: string, initData: string | null | undefined, previewTgId: number | null | undefined) {
  const { createHmac, timingSafeEqual } = await import("crypto");
  const supabaseAdmin = await getSupabaseAdmin();
  const { data: tenant } = await supabaseAdmin.from("tenants")
    .select("bot_token,admin_telegram_ids").eq("id", tenantId).maybeSingle();
  if (!tenant) throw new Error("Bot not found");
  let tgId: number | null = null;
  if (initData && tenant.bot_token) {
    try {
      const params = new URLSearchParams(initData);
      const hash = params.get("hash");
      if (!hash) throw new Error();
      params.delete("hash");
      const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
      const secret = createHmac("sha256", "WebAppData").update(tenant.bot_token).digest();
      const expected = createHmac("sha256", secret).update(dcs).digest("hex");
      const a = Buffer.from(hash, "hex"), b = Buffer.from(expected, "hex");
      if (a.length === b.length && timingSafeEqual(a, b)) {
        const u = JSON.parse(params.get("user") || "{}");
        tgId = Number(u?.id) || null;
      }
    } catch { /* fallthrough */ }
  }
  if (!tgId && previewTgId) tgId = previewTgId;
  if (!tgId) throw new Error("Telegram auth required");
  const allowed = [...GLOBAL_MINI_ADMIN_IDS, ...((tenant.admin_telegram_ids as any[]) ?? []).map(Number)];
  if (!allowed.includes(tgId)) throw new Error("Not authorised");
  return { supabaseAdmin, tgId };
}

export const listMiners = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ tenantId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: rows } = await supabaseAdmin.from("miners")
      .select("*").eq("tenant_id", data.tenantId).eq("active", true).order("sort_order");
    return rows ?? [];
  });

export const myMiners = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: rows } = await supabaseAdmin.from("user_miners")
      .select("*, miners(*)").eq("user_id", data.userId)
      .order("purchased_at", { ascending: false });
    return rows ?? [];
  });

export const buyMiner = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid(), minerId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: user } = await supabaseAdmin.from("app_users").select("*").eq("id", data.userId).single();
    if (!user) throw new Error("User not found");
    const { data: miner } = await supabaseAdmin.from("miners").select("*").eq("id", data.minerId).single();
    if (!miner || miner.tenant_id !== user.tenant_id || !miner.active) throw new Error("Miner not available");

    // Free miner — only once per user
    if (miner.is_free) {
      const { data: existing } = await supabaseAdmin.from("user_miners")
        .select("id").eq("user_id", user.id).eq("miner_id", miner.id).maybeSingle();
      if (existing) throw new Error("Already claimed");
    } else {
      const price = Number(miner.price_tokens);
      if (Number(user.balance) < price) throw new Error("Insufficient balance");
      await supabaseAdmin.from("app_users").update({ balance: Number(user.balance) - price }).eq("id", user.id);
      await supabaseAdmin.from("transactions").insert({
        tenant_id: user.tenant_id, user_id: user.id, type: "miner_purchase", amount: -price, status: "approved",
      });
    }

    const expiresAt = miner.duration_hours > 0
      ? new Date(Date.now() + Number(miner.duration_hours) * 3600_000).toISOString()
      : null;
    await supabaseAdmin.from("user_miners").insert({
      tenant_id: user.tenant_id, user_id: user.id, miner_id: miner.id, expires_at: expiresAt,
    });
    return { ok: true };
  });

// ─── Bot admin CRUD (from inside mini app) ────────────────────────
export const adminListMiners = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    tenantId: z.string().uuid(),
    initData: z.string().nullable().optional(),
    previewTgId: z.number().int().positive().nullable().optional(),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await validateTgAdmin(data.tenantId, data.initData, data.previewTgId);
    const { data: rows } = await supabaseAdmin.from("miners")
      .select("*").eq("tenant_id", data.tenantId).order("sort_order").order("created_at");
    return rows ?? [];
  });

export const adminSaveMiner = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    tenantId: z.string().uuid(),
    initData: z.string().nullable().optional(),
    previewTgId: z.number().int().positive().nullable().optional(),
    miner: z.object({
      id: z.string().uuid().nullable().optional(),
      name: z.string().min(1).max(60),
      emoji: z.string().max(4).optional().nullable(),
      price_tokens: z.number().min(0),
      rate_boost_per_hour: z.number().min(0),
      duration_hours: z.number().int().min(0),
      is_free: z.boolean().default(false),
      active: z.boolean().default(true),
      sort_order: z.number().int().default(0),
    }),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await validateTgAdmin(data.tenantId, data.initData, data.previewTgId);
    const { id, ...fields } = data.miner;
    if (id) {
      const { error } = await supabaseAdmin.from("miners").update(fields).eq("id", id).eq("tenant_id", data.tenantId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("miners").insert({ ...fields, tenant_id: data.tenantId });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteMiner = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    tenantId: z.string().uuid(),
    initData: z.string().nullable().optional(),
    previewTgId: z.number().int().positive().nullable().optional(),
    minerId: z.string().uuid(),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await validateTgAdmin(data.tenantId, data.initData, data.previewTgId);
    const { error } = await supabaseAdmin.from("miners").delete().eq("id", data.minerId).eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
