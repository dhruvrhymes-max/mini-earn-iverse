import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { Auth, ChannelSchema } from "./bot-admin.schemas";

const gate = async (d: { tenantId: string; initData?: string | null; previewTgId?: number | null }) =>
  (await import("./tg-admin.server")).gateTgAdmin(d);

// ── Settings ──────────────────────────────────────────────────────
export const adminGetSettings = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object(Auth).parse(i))
  .handler(async ({ data }) => {
    const { tenant } = await gate(data);
    const { maskSecret } = await import("./wallet-crypto.server");
    const { DEFAULT_PROOF_TEMPLATE } = await import("./proof.server");
    const payout: any = tenant.payout_config || {};
    const legacyEvm = payout?.evm || {};
    const network = (key: "bep20" | "polygon", defaults: any) => {
      const cfg = payout?.[key] || (String(legacyEvm.chain_label || "").toLowerCase().includes(key === "bep20" ? "bep" : "polygon") ? legacyEvm : {});
      const rpcUrl = key === "polygon" && /\bpolygon-rpc\.com\b/i.test(String(cfg.rpc_url || ""))
        ? defaults.rpc_url
        : cfg.rpc_url ?? defaults.rpc_url;
      return {
        chain_label: cfg.chain_label ?? defaults.chain_label,
        chain_id: cfg.chain_id ?? defaults.chain_id,
        rpc_url: rpcUrl,
        contract: cfg.contract ?? defaults.contract,
        explorer: cfg.explorer ?? defaults.explorer,
        decimals: defaults.decimals ?? cfg.decimals ?? 18,
        enabled: cfg.enabled !== false,
        key_preview: maskSecret(cfg.private_key_enc),
      };
    };
    return {
      payout: {
        bep20: network("bep20", { chain_label: "BNB Smart Chain", chain_id: 56, rpc_url: "https://bsc-rpc.publicnode.com", contract: "0x55d398326f99059ff775485246999027b3197955", explorer: "https://bscscan.com/tx/", decimals: 18 }),
        polygon: network("polygon", { chain_label: "Polygon", chain_id: 137, rpc_url: "https://polygon-bor-rpc.publicnode.com", contract: "0xc2132D05D31c914a87C6611C10748AaCbAEd4C19", explorer: "https://polygonscan.com/tx/", decimals: 6 }),
        ton: {
          api_key: payout?.ton?.api_key ?? "",
          endpoint: payout?.ton?.endpoint ?? "https://toncenter.com/api/v2/jsonRPC",
          explorer: payout?.ton?.explorer ?? "https://tonviewer.com/transaction/",
          phrase_preview: maskSecret(payout?.ton?.phrase_enc),
          enabled: payout?.ton?.enabled !== false,
        },

        auto_pay: !!payout?.auto_pay,
      },
      deposit: {
        ton_wallet: (tenant.deposit_config as any)?.ton_wallet ?? "",
        memo_prefix: (tenant.deposit_config as any)?.memo_prefix ?? "dep",
        tokens_per_ton: (tenant.deposit_config as any)?.tokens_per_ton ?? 1000,
        enabled: (tenant.deposit_config as any)?.enabled ?? false,
      },
      onboarding: {
        enabled: (tenant.onboarding as any)?.enabled ?? false,
        title: (tenant.onboarding as any)?.title ?? "Welcome!",
        text: (tenant.onboarding as any)?.text ?? "Join our community to get started.",
        image_url: (tenant.onboarding as any)?.image_url ?? "",
        require_join: (tenant.onboarding as any)?.require_join ?? false,
        channels: (tenant.onboarding as any)?.channels ?? [],
      },
      security: {
        ip_tracking: (tenant.security as any)?.ip_tracking ?? false,
        block_message:
          (tenant.security as any)?.block_message ??
          "Multiple accounts are not allowed. Please continue with your original account.",
      },
      proof: {
        enabled: (tenant.proof_config as any)?.enabled ?? false,
        channel_id: (tenant.proof_config as any)?.channel_id ?? "",
        template: (tenant.proof_config as any)?.template ?? DEFAULT_PROOF_TEMPLATE,
        footer: (tenant.proof_config as any)?.footer ?? "",
      },
      referral: {
        instant_reward: (tenant.referral_config as any)?.instant_reward ?? 5,
        bonus_reward: (tenant.referral_config as any)?.bonus_reward ?? 50,
        bonus_trigger: (tenant.referral_config as any)?.bonus_trigger ?? "tasks",
        bonus_after_ads: (tenant.referral_config as any)?.bonus_after_ads ?? 0,
        bonus_after_tasks: (tenant.referral_config as any)?.bonus_after_tasks ?? 5,
        lifetime_pct: (tenant.referral_config as any)?.lifetime_pct ?? 20,
        daily_cap: (tenant.referral_config as any)?.daily_cap ?? 20,
        weekly_cap: (tenant.referral_config as any)?.weekly_cap ?? 200,
      },

    };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      ...Auth,
      payout: z.object({
        bep20: z.object({
          chain_label: z.string().max(40),
          chain_id: z.number().int().positive(),
          rpc_url: z.string().max(300),
          contract: z.string().max(100),
          explorer: z.string().max(300),
          decimals: z.number().int().min(0).max(24),
          enabled: z.boolean().optional(),
          private_key: z.string().max(200).optional().nullable(),
        }).optional(),
        polygon: z.object({
          chain_label: z.string().max(40),
          chain_id: z.number().int().positive(),
          rpc_url: z.string().max(300),
          contract: z.string().max(100),
          explorer: z.string().max(300),
          decimals: z.number().int().min(0).max(24),
          enabled: z.boolean().optional(),
          private_key: z.string().max(200).optional().nullable(),
        }).optional(),
        ton: z.object({
          api_key: z.string().max(200),
          explorer: z.string().max(300),
          endpoint: z.string().max(300).optional().nullable(),
          phrase: z.string().max(500).optional().nullable(),
          enabled: z.boolean().optional(),
        }).optional(),

        auto_pay: z.boolean().optional(),
      }).optional(),
      deposit: z.object({
        enabled: z.boolean(),
        ton_wallet: z.string().max(120),
        memo_prefix: z.string().max(20),
        tokens_per_ton: z.number().min(0),
      }).optional(),
      onboarding: z.object({
        enabled: z.boolean(),
        title: z.string().max(120),
        text: z.string().max(1000),
        image_url: z.string().max(500),
        require_join: z.boolean(),
        channels: z.array(ChannelSchema).max(6),
      }).optional(),
      security: z.object({
        ip_tracking: z.boolean(),
        block_message: z.string().max(500),
      }).optional(),
      proof: z.object({
        enabled: z.boolean(),
        channel_id: z.string().max(80),
        template: z.string().max(2000),
        footer: z.string().max(300),
      }).optional(),
      referral: z.object({
        instant_reward: z.number().min(0),
        bonus_reward: z.number().min(0),
        bonus_trigger: z.enum(["ads", "tasks", "either", "both"]).optional(),
        bonus_after_ads: z.number().int().min(0).max(100),
        bonus_after_tasks: z.number().int().min(0).max(100).optional(),
        lifetime_pct: z.number().min(0).max(100),
        daily_cap: z.number().int().min(0).max(10000),
        weekly_cap: z.number().int().min(0).max(100000),
      }).optional(),

    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, tenant } = await gate(data);
    const { encryptSecret } = await import("./wallet-crypto.server");
    const patch: Record<string, any> = {};

    if (data.payout) {
      const cur: any = tenant.payout_config || {};
      const mergeEvm = (key: "bep20" | "polygon", incoming: any) => {
        if (!incoming) return cur[key];
        const canonicalDecimals = key === "bep20" ? 18 : 6;
        const result = { ...cur[key], ...incoming, decimals: canonicalDecimals, private_key_enc: incoming.private_key?.trim() ? encryptSecret(incoming.private_key.trim()) : cur[key]?.private_key_enc ?? null };
        delete result.private_key;
        return result;
      };
      const bep20 = mergeEvm("bep20", data.payout.bep20);
      const polygon = mergeEvm("polygon", data.payout.polygon);
      const ton = data.payout.ton
        ? {
            ...(cur.ton || {}),
            ...data.payout.ton,
            phrase_enc: data.payout.ton.phrase?.trim()
              ? encryptSecret(data.payout.ton.phrase.trim())
              : cur.ton?.phrase_enc ?? null,
          }
        : cur.ton;
      if (ton) delete (ton as any).phrase;
      patch.payout_config = { ...cur, bep20, polygon, ton, auto_pay: data.payout.auto_pay ?? cur.auto_pay ?? false };
    }
    if (data.deposit) patch.deposit_config = { ...((tenant.deposit_config as any) || {}), ...data.deposit };
    if (data.onboarding) patch.onboarding = { ...((tenant.onboarding as any) || {}), ...data.onboarding };
    if (data.security) patch.security = { ...((tenant.security as any) || {}), ...data.security };
    if (data.proof) patch.proof_config = { ...((tenant.proof_config as any) || {}), ...data.proof };
    if (data.referral) patch.referral_config = { ...((tenant.referral_config as any) || {}), ...data.referral };

    const { error } = await supabaseAdmin.from("tenants").update(patch as any).eq("id", data.tenantId);
    if (error) throw new Error(error.message);
    (await import("./tenant-cache.server")).invalidateTenant(data.tenantId);
    return { ok: true };
  });

// ── Member management ─────────────────────────────────────────────
export const adminFindUser = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ ...Auth, query: z.string().trim().min(1).max(60) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await gate(data);
    const q = data.query.replace(/^@/, "");
    let row: any = null;
    if (/^\d+$/.test(q)) {
      const { data: r } = await supabaseAdmin.from("app_users").select("*")
        .eq("tenant_id", data.tenantId).eq("telegram_id", Number(q)).maybeSingle();
      row = r;
    }
    if (!row) {
      const { data: r } = await supabaseAdmin.from("app_users").select("*")
        .eq("tenant_id", data.tenantId).ilike("username", q).limit(1).maybeSingle();
      row = r;
    }
    if (!row) throw new Error("No member found");

    const [{ data: referredUsers }, { data: txs }, { data: ips }] = await Promise.all([
      supabaseAdmin.from("app_users").select("id")
        .eq("tenant_id", data.tenantId).eq("referrer_id", row.id),
      supabaseAdmin.from("transactions").select("type,amount,status,created_at")
        .eq("user_id", row.id).order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("ip_logs").select("ip,created_at").eq("user_id", row.id)
        .order("created_at", { ascending: false }).limit(5),
    ]);
    const referralIds = (referredUsers ?? []).map((referral) => referral.id);
    let activeReferrals = 0;
    if (referralIds.length > 0) {
      const [{ data: adRefs }, { data: taskRefs }, { data: globalTaskRefs }] = await Promise.all([
        supabaseAdmin.from("app_users").select("id").in("id", referralIds).gt("ads_watched", 0),
        supabaseAdmin.from("user_tasks").select("user_id").eq("tenant_id", data.tenantId).in("user_id", referralIds).gt("count", 0),
        supabaseAdmin.from("user_global_tasks").select("user_id").eq("tenant_id", data.tenantId).in("user_id", referralIds).gt("count", 0),
      ]);
      activeReferrals = new Set([
        ...(adRefs ?? []).map((referral) => referral.id),
        ...(taskRefs ?? []).map((referral) => referral.user_id),
        ...(globalTaskRefs ?? []).map((referral) => referral.user_id),
      ]).size;
    }
    return { user: row, referrals: referralIds.length, activeReferrals, recent: txs ?? [], ips: ips ?? [] };
  });

export const adminListMembers = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object(Auth).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await gate(data);
    const { data: rows, error } = await supabaseAdmin.from("app_users")
      .select("id,telegram_id,username,first_name,balance,usd_balance,referrer_id,has_activity,ads_watched,banned,ban_reason,ban_kind,created_at,last_ip")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const memberIds = (rows ?? []).map((member) => member.id);
    const [{ data: taskRows }, { data: globalTaskRows }] = memberIds.length > 0
      ? await Promise.all([
          supabaseAdmin.from("user_tasks").select("user_id").eq("tenant_id", data.tenantId).in("user_id", memberIds).gt("count", 0),
          supabaseAdmin.from("user_global_tasks").select("user_id").eq("tenant_id", data.tenantId).in("user_id", memberIds).gt("count", 0),
        ])
      : [{ data: [] }, { data: [] }];
    const taskActiveIds = new Set([
      ...(taskRows ?? []).map((task) => task.user_id),
      ...(globalTaskRows ?? []).map((task) => task.user_id),
    ]);
    const referralCounts = new Map<string, { total: number; active: number }>();
    for (const member of rows ?? []) {
      if (!member.referrer_id) continue;
      const current = referralCounts.get(member.referrer_id) ?? { total: 0, active: 0 };
      current.total += 1;
      if (Number(member.ads_watched) > 0 || taskActiveIds.has(member.id)) current.active += 1;
      referralCounts.set(member.referrer_id, current);
    }

    return (rows ?? []).map((member) => ({
      ...member,
      referrals: referralCounts.get(member.id)?.total ?? 0,
      active_referrals: referralCounts.get(member.id)?.active ?? 0,
    }));
  });

export const adminSetBan = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      ...Auth,
      userId: z.string().uuid(),
      banned: z.boolean(),
      reason: z.string().max(300).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await gate(data);
    const { error } = await supabaseAdmin.from("app_users").update({
      banned: data.banned,
      ban_reason: data.banned ? data.reason ?? "Banned by admin" : null,
      ban_kind: data.banned ? "manual" : null,
      banned_at: data.banned ? new Date().toISOString() : null,
    }).eq("id", data.userId).eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAdjustBalance = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      ...Auth,
      userId: z.string().uuid(),
      delta_tokens: z.number().optional(),
      delta_usdt: z.number().optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await gate(data);
    const { data: u } = await supabaseAdmin.from("app_users").select("balance,usd_balance")
      .eq("id", data.userId).eq("tenant_id", data.tenantId).maybeSingle();
    if (!u) throw new Error("Member not found");
    const balance = Math.max(0, Number(u.balance) + Number(data.delta_tokens || 0));
    const usd = Math.max(0, Number(u.usd_balance) + Number(data.delta_usdt || 0));
    await supabaseAdmin.from("app_users").update({ balance, usd_balance: usd }).eq("id", data.userId);
    return { balance, usd_balance: usd };
  });

export const adminListBanned = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object(Auth).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await gate(data);
    const { data: rows } = await supabaseAdmin.from("app_users")
      .select("id,telegram_id,username,first_name,ban_reason,ban_kind,banned_at,balance")
      .eq("tenant_id", data.tenantId).eq("banned", true)
      .order("banned_at", { ascending: false }).limit(100);
    return rows ?? [];
  });

// ── Withdrawals ───────────────────────────────────────────────────
export const adminListWithdrawals = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ ...Auth, status: z.string().max(20).optional() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await gate(data);
    let q = supabaseAdmin.from("transactions")
      .select("*, app_users(username,first_name,telegram_id)")
      .eq("tenant_id", data.tenantId).eq("type", "withdraw");
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows } = await q.order("created_at", { ascending: false }).limit(100);
    return rows ?? [];
  });

export const adminProcessWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z.object({
      ...Auth,
      txId: z.string().uuid(),
      approve: z.boolean(),
      reason: z.string().max(300).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, tenant } = await gate(data);
    return (await import("./withdrawal-processing.server")).processWithdrawalSecurely(
      supabaseAdmin, tenant, data.txId, data.approve, data.reason,
    );
  });
