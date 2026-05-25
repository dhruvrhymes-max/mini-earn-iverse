import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public — no auth required (mini-app boot)
export const getTenantBySlug = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ slug: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("tenants")
      .select("id,slug,name,status,token_name,token_symbol,token_icon_url,action_verb,theme,economics,ad_config,community")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.status !== "active") return null;
    return row;
  });

// Telegram initData validation (simplified — TODO: full HMAC verify with bot token).
// For demo we accept either real initData or a `tg_id` fallback for browser preview.
async function resolveTelegramUser(initData: string | null, fallbackTgId: number | null) {
  if (initData) {
    // TODO: implement HMAC validation per Telegram docs using bot token.
    try {
      const params = new URLSearchParams(initData);
      const userJson = params.get("user");
      if (userJson) return JSON.parse(userJson) as { id: number; username?: string; first_name?: string };
    } catch {}
  }
  if (fallbackTgId) return { id: fallbackTgId, username: `preview_${fallbackTgId}`, first_name: "Preview" };
  return null;
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
    const { data: tenant } = await supabaseAdmin.from("tenants")
      .select("id,status").eq("slug", data.tenantSlug).maybeSingle();
    if (!tenant || tenant.status !== "active") throw new Error("Bot not found");
    const tg = await resolveTelegramUser(data.initData ?? null, data.previewTgId ?? null);
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
        await supabaseAdmin.rpc("increment_referral", { _user_id: referrerId }).then(() => {}, () => {
          // fallback: update directly
          return supabaseAdmin.from("app_users").select("referral_count").eq("id", referrerId).single()
            .then(({ data: r }) => supabaseAdmin.from("app_users").update({ referral_count: (r?.referral_count ?? 0) + 1 }).eq("id", referrerId));
        });
      }
    }
    return user;
  });

export const claimMining = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
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
    return { started: false, claimed: reward, balance: newBalance };
  });

export const completeTask = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid(), taskId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
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
    const { userId, ...patch } = data;
    const { error } = await supabaseAdmin.from("app_users").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const convertToUsdt = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid(), tokens: z.number().positive() }).parse(i))
  .handler(async ({ data }) => {
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
    const { data: rows } = await supabaseAdmin.from("transactions")
      .select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(50);
    return rows ?? [];
  });

export const getMyTasks = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ userId: z.string().uuid(), tenantId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
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
    await supabaseAdmin.from("app_users").update({ onboarded: true }).eq("id", data.userId);
    return { ok: true };
  });

export const getUser = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { data: user } = await supabaseAdmin.from("app_users").select("*").eq("id", data.userId).single();
    return user;
  });
