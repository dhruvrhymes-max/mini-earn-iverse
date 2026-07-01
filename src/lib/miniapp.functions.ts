import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_ECON = { token_per_usdt: 10000, min_withdraw_usdt: 0.1, mining_cycle_hours: 4, mining_rate_per_hour: 100 };
const DEFAULT_THEME = { primary: "#f59e0b", background: "#0a0a0a", accent: "#fbbf24" };
const DEFAULT_AD = { daily_watch_limit: 20 };
const DEFAULT_COMMUNITY = { channel_url: null, support_url: null };
const DEFAULT_REFERRAL = {
  signup_reward: 0,
  inviter_reward: 50,
  lifetime_pct: 20,
  require_activity: true,
  activity_types: ["mine", "task", "ad"] as string[],
};

/**
 * Award the inviter when the new user performs a qualifying activity (mine/task/ad).
 * Releases the pending_inviter_reward queued at signup time.
 * Returns the released amount (0 if none).
 */
async function maybeReleasePendingInviterReward(
  supabaseAdmin: any,
  user: any,
  activityType: "mine" | "task" | "ad",
): Promise<number> {
  if (user.has_activity) return 0;
  // load tenant referral config + activity_types
  const { data: tenantRow } = await supabaseAdmin
    .from("tenants").select("referral_config").eq("id", user.tenant_id).maybeSingle();
  const cfg = { ...DEFAULT_REFERRAL, ...((tenantRow?.referral_config as any) || {}) };
  const activityCounts = Array.isArray(cfg.activity_types) && cfg.activity_types.includes(activityType);
  // mark first activity regardless of whether THIS one counts (idempotent)
  await supabaseAdmin.from("app_users").update({ has_activity: true }).eq("id", user.id);
  if (!activityCounts) return 0;
  const pending = Number(user.pending_inviter_reward || 0);
  if (!user.referrer_id || pending <= 0) return 0;
  // credit inviter
  const { data: inv } = await supabaseAdmin.from("app_users").select("balance").eq("id", user.referrer_id).single();
  if (!inv) return 0;
  await supabaseAdmin.from("app_users").update({ balance: Number(inv.balance) + pending }).eq("id", user.referrer_id);
  await supabaseAdmin.from("app_users").update({ pending_inviter_reward: 0 }).eq("id", user.id);
  await supabaseAdmin.from("transactions").insert({
    tenant_id: user.tenant_id, user_id: user.referrer_id, type: "referral", amount: pending, status: "approved",
  });
  return pending;
}

/** Pay the inviter a lifetime % cut of this user's earning event. */
async function payLifetimeCut(
  supabaseAdmin: any,
  user: any,
  earnedAmount: number,
): Promise<void> {
  if (!user.referrer_id || earnedAmount <= 0) return;
  const { data: tenantRow } = await supabaseAdmin
    .from("tenants").select("referral_config").eq("id", user.tenant_id).maybeSingle();
  const cfg = { ...DEFAULT_REFERRAL, ...((tenantRow?.referral_config as any) || {}) };
  const pct = Number(cfg.lifetime_pct || 0);
  if (pct <= 0) return;
  const cut = earnedAmount * (pct / 100);
  if (cut <= 0) return;
  const { data: inv } = await supabaseAdmin.from("app_users").select("balance").eq("id", user.referrer_id).single();
  if (!inv) return;
  await supabaseAdmin.from("app_users").update({ balance: Number(inv.balance) + cut }).eq("id", user.referrer_id);
  await supabaseAdmin.from("app_users")
    .update({ lifetime_earned_for_inviter: Number(user.lifetime_earned_for_inviter || 0) + cut })
    .eq("id", user.id);
  await supabaseAdmin.from("transactions").insert({
    tenant_id: user.tenant_id, user_id: user.referrer_id, type: "referral", amount: cut, status: "approved",
  });
}

/** Parse start_param from Telegram initData. Returns ref tg id if formatted as ref_NNN. */
function parseStartParamRef(initData: string | null | undefined): number | null {
  if (!initData) return null;
  try {
    const sp = new URLSearchParams(initData).get("start_param");
    if (!sp) return null;
    const m = sp.match(/^ref_(\d+)$/);
    return m ? Number(m[1]) : null;
  } catch { return null; }
}

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function normalizeTenant(row: any) {
  if (!row || row.status !== "active") return null;
  const { bot_token: _botToken, ...safeRow } = row;
  return {
    ...safeRow,
    theme: { ...DEFAULT_THEME, ...((row.theme as any) || {}) },
    economics: { ...DEFAULT_ECON, ...((row.economics as any) || {}) },
    ad_config: { ...DEFAULT_AD, ...((row.ad_config as any) || {}) },
    community: { ...DEFAULT_COMMUNITY, ...((row.community as any) || {}) },
    referral_config: { ...DEFAULT_REFERRAL, ...((row.referral_config as any) || {}) },
    token_name: row.token_name || "Token",
    token_symbol: row.token_symbol || "TKN",
    action_verb: row.action_verb || "Mine",
  };
}

// Public — no auth required (mini-app boot)
export const getTenantBySlug = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ slug: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: row, error } = await supabaseAdmin
      .from("tenants")
      .select("id,slug,name,status,token_name,token_symbol,token_icon_url,action_verb,theme,theme_preset,economics,ad_config,community,referral_config,bot_username,mini_app_short_name,admin_telegram_ids")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return normalizeTenant(row);
  });

/**
 * Validate Telegram WebApp initData per Telegram docs.
 * secret_key = HMAC_SHA256("WebAppData", bot_token)
 * expected_hash = HMAC_SHA256(data_check_string, secret_key)
 */
function validateTelegramInitData(initData: string, botToken: string): { id: number; username?: string; first_name?: string } | null {
  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");
    if (!receivedHash) return null;
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join("\n");
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    const a = Buffer.from(receivedHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const authDate = Number(params.get("auth_date") || 0);
    if (authDate && Date.now() / 1000 - authDate > 86400) return null;
    const userJson = params.get("user");
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export const initMiniAppUser = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      tenantSlug: z.string().min(1),
      initData: z.string().nullable().optional(),
      previewTgId: z.number().int().positive().nullable().optional(),
      referrerTgId: z.number().int().positive().nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: tenant } = await supabaseAdmin.from("tenants")
      .select("id,status,bot_token").eq("slug", data.tenantSlug).maybeSingle();
    if (!tenant || tenant.status !== "active") throw new Error("Bot not found");

    let tg: { id: number; username?: string; first_name?: string } | null = null;
    if (data.initData && tenant.bot_token) {
      tg = validateTelegramInitData(data.initData, tenant.bot_token);
      if (!tg) throw new Error("Invalid Telegram signature");
    } else if (data.previewTgId) {
      // Browser-preview fallback for development before bot token is set.
      tg = { id: data.previewTgId, username: `preview_${data.previewTgId}`, first_name: "Preview" };
    }
    if (!tg) throw new Error("Telegram auth required");

    let { data: user } = await supabaseAdmin.from("app_users")
      .select("*").eq("tenant_id", tenant.id).eq("telegram_id", tg.id).maybeSingle();

    if (!user) {
      let referrerId: string | null = null;
      if (data.referrerTgId) {
        const { data: ref } = await supabaseAdmin.from("app_users")
          .select("id").eq("tenant_id", tenant.id).eq("telegram_id", data.referrerTgId).maybeSingle();
        referrerId = ref?.id ?? null;
      }
      const ins = await supabaseAdmin.from("app_users").insert({
        tenant_id: tenant.id,
        telegram_id: tg.id,
        username: tg.username ?? null,
        first_name: tg.first_name ?? null,
        referrer_id: referrerId,
      }).select().single();
      user = ins.data;
      if (referrerId) {
        const { data: r } = await supabaseAdmin.from("app_users").select("referral_count").eq("id", referrerId).single();
        await supabaseAdmin.from("app_users").update({ referral_count: (r?.referral_count ?? 0) + 1 }).eq("id", referrerId);
      }
    }
    return user;
  });

export const bootMiniApp = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      tenantSlug: z.string().min(1),
      initData: z.string().nullable().optional(),
      previewTgId: z.number().int().positive().nullable().optional(),
      referrerTgId: z.number().int().positive().nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: tenantRow, error: tenantError } = await supabaseAdmin.from("tenants")
      .select("id,slug,name,status,token_name,token_symbol,token_icon_url,action_verb,theme,theme_preset,economics,ad_config,community,referral_config,bot_username,mini_app_short_name,admin_telegram_ids,bot_token")
      .eq("slug", data.tenantSlug).maybeSingle();
    if (tenantError) throw new Error(tenantError.message);
    const tenant = normalizeTenant(tenantRow);
    if (!tenant || !tenantRow) return { tenant: null, user: null };

    let tg: { id: number; username?: string; first_name?: string } | null = null;
    if (data.initData && tenantRow.bot_token) {
      tg = validateTelegramInitData(data.initData, tenantRow.bot_token);
      if (!tg) throw new Error("Invalid Telegram signature");
    } else if (data.previewTgId) {
      tg = { id: data.previewTgId, username: `preview_${data.previewTgId}`, first_name: "Preview" };
    }
    if (!tg) throw new Error("Telegram auth required");

    // Prefer Telegram start_param (ref_NNN) over URL ?ref= for invites coming from t.me deep links
    const startRef = parseStartParamRef(data.initData);
    const effectiveRefTgId = startRef ?? data.referrerTgId ?? null;

    let { data: user, error: userError } = await supabaseAdmin.from("app_users")
      .select("*").eq("tenant_id", tenantRow.id).eq("telegram_id", tg.id).maybeSingle();
    if (userError) throw new Error(userError.message);

    if (!user) {
      let referrerId: string | null = null;
      if (effectiveRefTgId && effectiveRefTgId !== tg.id) {
        const { data: ref } = await supabaseAdmin.from("app_users")
          .select("id").eq("tenant_id", tenantRow.id).eq("telegram_id", effectiveRefTgId).maybeSingle();
        referrerId = ref?.id ?? null;
      }
      const cfg = { ...DEFAULT_REFERRAL, ...((tenantRow.referral_config as any) || {}) };
      const signupReward = Number(cfg.signup_reward || 0);
      const inviterReward = Number(cfg.inviter_reward || 0);
      // If require_activity is OFF, release inviter reward immediately
      const releaseImmediately = referrerId && !cfg.require_activity && inviterReward > 0;
      const ins = await supabaseAdmin.from("app_users").insert({
        tenant_id: tenantRow.id,
        telegram_id: tg.id,
        username: tg.username ?? null,
        first_name: tg.first_name ?? null,
        referrer_id: referrerId,
        balance: signupReward,
        pending_inviter_reward: referrerId && !releaseImmediately ? inviterReward : 0,
      }).select().single();
      if (ins.error) throw new Error(ins.error.message);
      user = ins.data;
      if (signupReward > 0) {
        await supabaseAdmin.from("transactions").insert({
          tenant_id: tenantRow.id, user_id: user!.id, type: "referral", amount: signupReward, status: "approved",
        });
      }
      if (referrerId) {
        const { data: r } = await supabaseAdmin.from("app_users").select("referral_count,balance").eq("id", referrerId).single();
        const refPatch: any = { referral_count: (r?.referral_count ?? 0) + 1 };
        if (releaseImmediately) refPatch.balance = Number(r?.balance ?? 0) + inviterReward;
        await supabaseAdmin.from("app_users").update(refPatch).eq("id", referrerId);
        if (releaseImmediately) {
          await supabaseAdmin.from("transactions").insert({
            tenant_id: tenantRow.id, user_id: referrerId, type: "referral", amount: inviterReward, status: "approved",
          });
        }
      }
    }
    return { tenant, user };
  });

export const claimMining = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: user } = await supabaseAdmin.from("app_users")
      .select("*, tenants(economics)").eq("id", data.userId).single();
    if (!user) throw new Error("User not found");
    const econ = (user as any).tenants.economics as any;
    const ratePerHour = Number(econ.mining_rate_per_hour || 0);
    const cycleHours = Number(econ.mining_cycle_hours || 4);
    const now = Date.now();
    const started = user.mining_started_at ? new Date(user.mining_started_at).getTime() : null;
    if (!started) {
      await supabaseAdmin.from("app_users").update({ mining_started_at: new Date().toISOString() }).eq("id", user.id);
      return { started: true, claimed: 0 };
    }
    const hours = Math.min(cycleHours, (now - started) / 3_600_000);
    if (hours < cycleHours) return { started: false, claimed: 0, remaining_seconds: Math.floor((cycleHours * 3600) - hours * 3600) };
    const reward = hours * ratePerHour;
    const newBalance = Number(user.balance) + reward;
    await supabaseAdmin.from("app_users").update({
      balance: newBalance, mining_started_at: null, last_claim_at: new Date().toISOString(),
    }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      tenant_id: user.tenant_id, user_id: user.id, type: "mine", amount: reward, status: "approved",
    });
    await maybeReleasePendingInviterReward(supabaseAdmin, user, "mine");
    await payLifetimeCut(supabaseAdmin, user, reward);
    return { started: false, claimed: reward, balance: newBalance };
  });

export const completeTask = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid(), taskId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: task } = await supabaseAdmin.from("tasks").select("*").eq("id", data.taskId).single();
    const { data: user } = await supabaseAdmin.from("app_users").select("*").eq("id", data.userId).single();
    if (!task || !user || task.tenant_id !== user.tenant_id) throw new Error("Not found");
    const { data: existing } = await supabaseAdmin.from("user_tasks")
      .select("*").eq("user_id", user.id).eq("task_id", task.id).maybeSingle();
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (task.daily_limit) {
      const sameDay = existing && new Date(existing.last_completed_at) >= today;
      const usedToday = sameDay ? existing.count : 0;
      if (usedToday >= task.daily_limit) throw new Error("Daily limit reached");
      await supabaseAdmin.from("user_tasks").upsert({
        tenant_id: user.tenant_id, user_id: user.id, task_id: task.id,
        count: sameDay ? existing.count + 1 : 1, last_completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,task_id" });
    } else {
      if (existing) throw new Error("Already completed");
      await supabaseAdmin.from("user_tasks").insert({
        tenant_id: user.tenant_id, user_id: user.id, task_id: task.id, count: 1,
      });
    }
    const reward = Number(task.reward);
    await supabaseAdmin.from("app_users").update({ balance: Number(user.balance) + reward }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      tenant_id: user.tenant_id, user_id: user.id, type: "task", amount: reward, status: "approved",
    });
    await maybeReleasePendingInviterReward(supabaseAdmin, user, "task");
    await payLifetimeCut(supabaseAdmin, user, reward);
    return { reward, balance: Number(user.balance) + reward };
  });

export const logAdReward = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      userId: z.string().uuid(),
      network: z.enum(["adsgram", "monetag", "adexium"]),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: user } = await supabaseAdmin.from("app_users")
      .select("*, tenants(economics,ad_config)").eq("id", data.userId).single();
    if (!user) throw new Error("Not found");
    const econ = (user as any).tenants.economics as any;
    const adCfg = (user as any).tenants.ad_config as any;
    const limit = Number(adCfg.daily_watch_limit || 20);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin.from("ad_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", today.toISOString());
    if ((count ?? 0) >= limit) throw new Error("Daily ad limit reached");
    const reward = Number(econ.mining_rate_per_hour || 100) / 4; // small reward
    await supabaseAdmin.from("ad_logs").insert({
      tenant_id: user.tenant_id, user_id: user.id, network: data.network, reward,
    });
    await supabaseAdmin.from("app_users").update({ balance: Number(user.balance) + reward }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      tenant_id: user.tenant_id, user_id: user.id, type: "ad", amount: reward, status: "approved",
    });
    await maybeReleasePendingInviterReward(supabaseAdmin, user, "ad");
    await payLifetimeCut(supabaseAdmin, user, reward);
    return { reward, balance: Number(user.balance) + reward, used: (count ?? 0) + 1, limit };
  });

export const setWallets = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      userId: z.string().uuid(),
      wallet_polygon: z.string().trim().max(80).optional().nullable(),
      wallet_bep20: z.string().trim().max(80).optional().nullable(),
      wallet_ton: z.string().trim().max(80).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { userId, ...patch } = data;
    const { error } = await supabaseAdmin.from("app_users").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const convertToUsdt = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid(), tokens: z.number().positive() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: user } = await supabaseAdmin.from("app_users")
      .select("*, tenants(economics)").eq("id", data.userId).single();
    if (!user) throw new Error("Not found");
    if (Number(user.balance) < data.tokens) throw new Error("Insufficient balance");
    const econ = (user as any).tenants.economics as any;
    const rate = Number(econ.token_per_usdt || 10000);
    const usdt = data.tokens / rate;
    await supabaseAdmin.from("app_users").update({
      balance: Number(user.balance) - data.tokens,
      usd_balance: Number(user.usd_balance) + usdt,
    }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      tenant_id: user.tenant_id, user_id: user.id, type: "convert", amount: usdt, currency: "USDT", status: "approved",
    });
    return { usdt };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      userId: z.string().uuid(),
      amount_usdt: z.number().positive(),
      network: z.enum(["polygon", "bep20", "ton"]),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: user } = await supabaseAdmin.from("app_users")
      .select("*, tenants(economics)").eq("id", data.userId).single();
    if (!user) throw new Error("Not found");
    const econ = (user as any).tenants.economics as any;
    const minW = Number(econ.min_withdraw_usdt || 0.1);
    if (data.amount_usdt < minW) throw new Error(`Minimum withdrawal is ${minW} USDT`);
    if (Number(user.usd_balance) < data.amount_usdt) throw new Error("Insufficient USDT balance");
    const walletField = data.network === "polygon" ? "wallet_polygon"
      : data.network === "bep20" ? "wallet_bep20" : "wallet_ton";
    const wallet = (user as any)[walletField];
    if (!wallet) throw new Error(`Set your ${data.network.toUpperCase()} wallet first`);
    await supabaseAdmin.from("app_users").update({
      usd_balance: Number(user.usd_balance) - data.amount_usdt,
    }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      tenant_id: user.tenant_id, user_id: user.id, type: "withdraw",
      amount: data.amount_usdt, currency: "USDT", status: "pending",
      wallet, network: data.network,
    });
    return { ok: true };
  });

export const getMyHistory = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: rows } = await supabaseAdmin.from("transactions")
      .select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50);
    return rows ?? [];
  });

export const getMyTasks = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ userId: z.string().uuid(), tenantId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const [tasks, completed, milestones, ads] = await Promise.all([
      supabaseAdmin.from("tasks").select("*").eq("tenant_id", data.tenantId).eq("active", true).order("sort_order"),
      supabaseAdmin.from("user_tasks").select("*").eq("user_id", data.userId),
      supabaseAdmin.from("referral_milestones").select("*").eq("tenant_id", data.tenantId).order("threshold"),
      supabaseAdmin.from("ad_logs").select("id", { count: "exact", head: true }).eq("user_id", data.userId)
        .gte("created_at", new Date(new Date().setUTCHours(0,0,0,0)).toISOString()),
    ]);
    return {
      tasks: tasks.data ?? [],
      completed: completed.data ?? [],
      milestones: milestones.data ?? [],
      adsToday: ads.count ?? 0,
    };
  });

export const markOnboarded = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    await supabaseAdmin.from("app_users").update({ onboarded: true }).eq("id", data.userId);
    return { ok: true };
  });

export const getUser = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: user } = await supabaseAdmin.from("app_users").select("*").eq("id", data.userId).single();
    return user;
  });

const GLOBAL_MINI_ADMIN_IDS = [7438823799, 6792289044];

/**
 * Update tenant settings from inside the mini app. Only Telegram users listed as
 * global platform admins or in tenants.admin_telegram_ids may call this.
 * `patch` keys are whitelisted; unknown keys are silently dropped.
 */
export const miniAdminUpdateTenant = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      tenantId: z.string().uuid(),
      initData: z.string().nullable().optional(),
      previewTgId: z.number().int().positive().nullable().optional(),
      patch: z.object({
        token_name: z.string().max(40).optional(),
        token_symbol: z.string().max(12).optional(),
        action_verb: z.string().max(20).optional(),
        welcome_text: z.string().max(2000).nullable().optional(),
        welcome_cta_text: z.string().max(60).nullable().optional(),
        economics: z.object({
          tokens_per_mine: z.number().min(0).optional(),
          mine_duration_seconds: z.number().min(1).optional(),
          token_per_usdt: z.number().min(0).optional(),
          min_withdraw_usdt: z.number().min(0).optional(),
        }).partial().optional(),
        referral_config: z.object({
          signup_reward: z.number().min(0).optional(),
          inviter_reward: z.number().min(0).optional(),
          lifetime_pct: z.number().min(0).max(100).optional(),
        }).partial().optional(),
        ad_config: z.object({
          daily_watch_limit: z.number().min(0).optional(),
          startup_ad_enabled: z.boolean().optional(),
        }).partial().optional(),
        admin_telegram_ids: z.array(z.number().int().positive()).optional(),
      }),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data: tenantRow } = await supabaseAdmin.from("tenants")
      .select("id,bot_token,admin_telegram_ids,economics").eq("id", data.tenantId).maybeSingle();
    if (!tenantRow) throw new Error("Bot not found");

    let tgId: number | null = null;
    if (data.initData && tenantRow.bot_token) {
      const tg = validateTelegramInitData(data.initData, tenantRow.bot_token);
      if (!tg) throw new Error("Invalid Telegram signature");
      tgId = tg.id;
    } else if (data.previewTgId) {
      tgId = data.previewTgId; // browser preview
    }
    if (!tgId) throw new Error("Telegram auth required");
    const allowedIds: number[] = [
      ...GLOBAL_MINI_ADMIN_IDS,
      ...(Array.isArray(tenantRow.admin_telegram_ids) ? tenantRow.admin_telegram_ids.map((n: any) => Number(n)) : []),
    ];
    if (!allowedIds.includes(Number(tgId))) throw new Error("Not authorised");

    const dbPatch: Record<string, any> = {};
    const p = data.patch;
    if (p.token_name != null) dbPatch.token_name = p.token_name;
    if (p.token_symbol != null) dbPatch.token_symbol = p.token_symbol;
    if (p.action_verb != null) dbPatch.action_verb = p.action_verb;
    if (p.welcome_text !== undefined) dbPatch.welcome_text = p.welcome_text;
    if (p.welcome_cta_text !== undefined) dbPatch.welcome_cta_text = p.welcome_cta_text;
    if (p.admin_telegram_ids) dbPatch.admin_telegram_ids = p.admin_telegram_ids;

    if (p.economics) {
      const cur = { ...(tenantRow.economics as any || {}) };
      const merged = { ...cur, ...p.economics };
      // Keep legacy fields consistent
      if (p.economics.tokens_per_mine != null || p.economics.mine_duration_seconds != null) {
        const tpm = Number(merged.tokens_per_mine ?? cur.tokens_per_mine ?? cur.mining_rate_per_hour ?? 100);
        const dur = Number(merged.mine_duration_seconds ?? cur.mine_duration_seconds ?? (Number(cur.mining_cycle_hours ?? 4) * 3600));
        merged.tokens_per_mine = tpm;
        merged.mine_duration_seconds = dur;
        merged.mining_cycle_hours = dur / 3600;
        merged.mining_rate_per_hour = tpm / (dur / 3600);
      }
      dbPatch.economics = merged;
    }
    if (p.referral_config) {
      const { data: cur } = await supabaseAdmin.from("tenants").select("referral_config").eq("id", data.tenantId).single();
      dbPatch.referral_config = { ...((cur?.referral_config as any) || {}), ...p.referral_config };
    }
    if (p.ad_config) {
      const { data: cur } = await supabaseAdmin.from("tenants").select("ad_config").eq("id", data.tenantId).single();
      dbPatch.ad_config = { ...((cur?.ad_config as any) || {}), ...p.ad_config };
    }

    const { error } = await supabaseAdmin.from("tenants").update(dbPatch as any).eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
