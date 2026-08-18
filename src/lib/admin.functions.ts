import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: z.string().trim().min(1).max(80),
      bot_token: z.string().trim().regex(/^\d+:[A-Za-z0-9_-]{20,}$/, "Invalid Telegram bot token format"),
      bot_username: z.string().trim().min(1).max(64).regex(/^@?[A-Za-z0-9_]+$/),
      preset_id: z.string().trim().min(1).max(40).optional(),
      preset: z.object({
        theme: z.object({ primary: z.string(), background: z.string(), accent: z.string() }),
        token_name: z.string(),
        token_symbol: z.string(),
        token_icon_url: z.string().nullable().optional(),
        action_verb: z.string(),
        welcome_text: z.string(),
        welcome_cta_text: z.string(),
        game_mode: z.enum(["mine", "tap", "spin", "idle", "scratch", "quiz", "streak", "forecast"]).optional(),
      }).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const username = data.bot_username.replace(/^@/, "");
    const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || `bot-${Date.now()}`;
    const insert: Record<string, any> = {
      slug,
      name: data.name,
      owner_user_id: userId,
      bot_token: data.bot_token,
      bot_username: username,
    };
    if (data.preset) {
      insert.theme = data.preset.theme;
      insert.token_name = data.preset.token_name;
      insert.token_symbol = data.preset.token_symbol;
      insert.token_icon_url = data.preset.token_icon_url || null;
      insert.action_verb = data.preset.action_verb;
      insert.welcome_text = data.preset.welcome_text;
      insert.welcome_cta_text = data.preset.welcome_cta_text;
      insert.theme_preset = data.preset_id ?? null;
      insert.game_mode = data.preset.game_mode ?? "mine";
    }
    const { data: row, error } = await supabase
      .from("tenants")
      .insert(insert)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });


export const getTenant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tenants").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid(),
      patch: z.record(z.string(), z.any()),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tenants").update(data.patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    (await import("./tenant-cache.server")).invalidateTenant(data.id);
    return { ok: true };
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify ownership before destructive op
    const { data: t, error: e1 } = await supabase.from("tenants").select("id,owner_user_id,bot_token").eq("id", data.id).maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!t) throw new Error("Bot not found");
    if (t.owner_user_id !== userId) throw new Error("Not your bot");
    // Best-effort: drop Telegram webhook so the bot stops responding
    if (t.bot_token) {
      try {
        await fetch(`https://api.telegram.org/bot${t.bot_token}/deleteWebhook`, { method: "POST" });
      } catch { /* ignore */ }
    }
    const { error } = await supabase.from("tenants").delete().eq("id", data.id);
    (await import("./tenant-cache.server")).invalidateTenant(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTenantStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const [users, ads, txs] = await Promise.all([
      s.from("app_users").select("balance", { count: "exact" }).eq("tenant_id", data.id),
      s.from("ad_logs").select("id", { count: "exact", head: true }).eq("tenant_id", data.id),
      s.from("transactions").select("amount,status,type").eq("tenant_id", data.id).eq("type", "withdraw").eq("status", "pending"),
    ]);
    const userCount = users.count ?? 0;
    const liability = (users.data ?? []).reduce((a, r) => a + Number(r.balance || 0), 0);
    const adImpressions = ads.count ?? 0;
    const pendingWithdraw = (txs.data ?? []).reduce((a, r) => a + Number(r.amount || 0), 0);
    return { userCount, liability, adImpressions, pendingWithdraw };
  });

export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tenantId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("tasks").select("*").eq("tenant_id", data.tenantId).order("sort_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid(),
      kind: z.enum(["social", "partner", "watch"]),
      title: z.string().min(1).max(120),
      url: z.string().url().nullable().optional(),
      reward: z.number().min(0),
      active: z.boolean().default(true),
      daily_limit: z.number().int().nullable().optional(),
      sort_order: z.number().int().default(0),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tenantId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("transactions").select("*, app_users(username,first_name,telegram_id)")
      .eq("tenant_id", data.tenantId).eq("type", "withdraw")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const processWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), approve: z.boolean(), reason: z.string().trim().max(300).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const { data: tx, error: e1 } = await s.from("transactions").select("id,tenant_id").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    const { data: tenant, error: tenantError } = await s.from("tenants").select("*").eq("id", tx.tenant_id).single();
    if (tenantError) throw new Error(tenantError.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return (await import("./withdrawal-processing.server")).processWithdrawalSecurely(supabaseAdmin, tenant, data.id, data.approve, data.reason);
  });

export const getPayoutSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tenantId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: tenant, error } = await context.supabase.from("tenants").select("payout_config,proof_config").eq("id", data.tenantId).single();
    if (error) throw new Error(error.message);
    const { maskSecret } = await import("./wallet-crypto.server");
    const p: any = tenant.payout_config || {};
    const defaults: any = {
      bep20: { chain_label: "BNB Smart Chain", chain_id: 56, rpc_url: "https://bsc-rpc.publicnode.com", contract: "0x55d398326f99059ff775485246999027b3197955", explorer: "https://bscscan.com/tx/", decimals: 18 },
      polygon: { chain_label: "Polygon", chain_id: 137, rpc_url: "https://polygon-bor-rpc.publicnode.com", contract: "0xc2132D05D31c914a87C6611C10748AaCbAEd4C19", explorer: "https://polygonscan.com/tx/", decimals: 6 },
    };
    const read = (key: "bep20" | "polygon") => ({ ...defaults[key], ...(p[key] || {}), private_key_enc: undefined, key_preview: maskSecret(p[key]?.private_key_enc) });
    return {
      bep20: read("bep20"), polygon: read("polygon"),
      ton: { endpoint: "https://toncenter.com/api/v2/jsonRPC", explorer: "https://tonviewer.com/transaction/", api_key: "", ...(p.ton || {}), phrase_enc: undefined, phrase_preview: maskSecret(p.ton?.phrase_enc) },
      proof: { enabled: false, channel_id: "", template: "", footer: "", ...((tenant.proof_config as any) || {}) },
    };
  });

export const savePayoutSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    tenantId: z.string().uuid(),
    payout: z.object({
      bep20: z.object({ chain_label: z.string().max(40), chain_id: z.number().int().positive(), rpc_url: z.string().url(), contract: z.string().max(100), explorer: z.string().url(), decimals: z.number().int().min(0).max(24), private_key: z.string().max(200).optional().nullable() }),
      polygon: z.object({ chain_label: z.string().max(40), chain_id: z.number().int().positive(), rpc_url: z.string().url(), contract: z.string().max(100), explorer: z.string().url(), decimals: z.number().int().min(0).max(24), private_key: z.string().max(200).optional().nullable() }),
      ton: z.object({ endpoint: z.string().url(), explorer: z.string().url(), api_key: z.string().max(200), phrase: z.string().max(500).optional().nullable() }),
    }),
    proof: z.object({ enabled: z.boolean(), channel_id: z.string().max(80), template: z.string().max(2000), footer: z.string().max(300) }),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: tenant, error: readError } = await context.supabase.from("tenants").select("payout_config").eq("id", data.tenantId).single();
    if (readError) throw new Error(readError.message);
    const { encryptSecret } = await import("./wallet-crypto.server");
    const current: any = tenant.payout_config || {};
    const secureEvm = (key: "bep20" | "polygon", value: any) => {
      const next = { ...current[key], ...value, private_key_enc: value.private_key?.trim() ? encryptSecret(value.private_key.trim()) : current[key]?.private_key_enc ?? null };
      delete next.private_key;
      return next;
    };
    const ton: any = { ...current.ton, ...data.payout.ton, phrase_enc: data.payout.ton.phrase?.trim() ? encryptSecret(data.payout.ton.phrase.trim()) : current.ton?.phrase_enc ?? null };
    delete ton.phrase;
    const { error } = await context.supabase.from("tenants").update({ payout_config: { ...current, bep20: secureEvm("bep20", data.payout.bep20), polygon: secureEvm("polygon", data.payout.polygon), ton }, proof_config: data.proof }).eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMilestones = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ tenantId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("referral_milestones").select("*").eq("tenant_id", data.tenantId).order("threshold");
    return rows ?? [];
  });

export const upsertMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid(),
      threshold: z.number().int().min(1),
      reward: z.number().min(0),
      label: z.string().max(120).nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("referral_milestones").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMilestone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("referral_milestones").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
