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
    return {
      payout: {
        evm: {
          chain_label: payout?.evm?.chain_label ?? "Polygon",
          rpc_url: payout?.evm?.rpc_url ?? "",
          contract: payout?.evm?.contract ?? "",
          explorer: payout?.evm?.explorer ?? "https://polygonscan.com/tx/",
          decimals: payout?.evm?.decimals ?? 6,
          key_preview: maskSecret(payout?.evm?.private_key_enc),
        },
        ton: {
          api_key: payout?.ton?.api_key ?? "",
          explorer: payout?.ton?.explorer ?? "https://tonviewer.com/transaction/",
          phrase_preview: maskSecret(payout?.ton?.phrase_enc),
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
        evm: z.object({
          chain_label: z.string().max(40),
          rpc_url: z.string().max(300),
          contract: z.string().max(100),
          explorer: z.string().max(300),
          decimals: z.number().int().min(0).max(24),
          private_key: z.string().max(200).optional().nullable(),
        }).optional(),
        ton: z.object({
          api_key: z.string().max(200),
          explorer: z.string().max(300),
          endpoint: z.string().max(300).optional().nullable(),
          jetton_master: z.string().max(120).optional().nullable(),
          jetton_decimals: z.number().int().min(0).max(24).optional().nullable(),
          phrase: z.string().max(500).optional().nullable(),
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
      const evm = data.payout.evm
        ? {
            ...(cur.evm || {}),
            ...data.payout.evm,
            private_key_enc: data.payout.evm.private_key?.trim()
              ? encryptSecret(data.payout.evm.private_key.trim())
              : cur.evm?.private_key_enc ?? null,
          }
        : cur.evm;
      if (evm) delete (evm as any).private_key;
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
      patch.payout_config = { ...cur, evm, ton, auto_pay: data.payout.auto_pay ?? cur.auto_pay ?? false };
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

    const [{ count: refs }, { data: txs }, { data: ips }] = await Promise.all([
      supabaseAdmin.from("app_users").select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenantId).eq("referrer_id", row.id),
      supabaseAdmin.from("transactions").select("type,amount,status,created_at")
        .eq("user_id", row.id).order("created_at", { ascending: false }).limit(10),
      supabaseAdmin.from("ip_logs").select("ip,created_at").eq("user_id", row.id)
        .order("created_at", { ascending: false }).limit(5),
    ]);
    return { user: row, referrals: refs ?? 0, recent: txs ?? [], ips: ips ?? [] };
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
      tx_hash: z.string().max(120).optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, tenant } = await gate(data);
    const { data: tx } = await supabaseAdmin.from("transactions").select("*, app_users(username,telegram_id)")
      .eq("id", data.txId).eq("tenant_id", data.tenantId).maybeSingle();
    if (!tx) throw new Error("Request not found");
    if (tx.status !== "pending") throw new Error("Already processed");

    if (data.approve) {
      let hash = data.tx_hash?.trim() || null;
      if (!hash) {
        // No manual hash → send the payment on-chain with the tenant's stored key/phrase.
        const { sendPayout } = await import("./payout.server");
        const res = await sendPayout(tenant, {
          network: tx.network,
          wallet: tx.wallet,
          amount: Number(tx.amount),
        });
        hash = res.hash;
      }
      const { error } = await supabaseAdmin.from("transactions")
        .update({ status: "paid", tx_hash: hash }).eq("id", tx.id);
      if (error) throw new Error(error.message);
      await (await import("./proof.server")).sendWithdrawalProof(tenant, tx, "paid", hash, null);
      return { ok: true, tx_hash: hash };

    }

    // Refund on rejection
    const { data: u } = await supabaseAdmin.from("app_users").select("usd_balance").eq("id", tx.user_id).single();
    await supabaseAdmin.from("app_users")
      .update({ usd_balance: Number(u?.usd_balance || 0) + Number(tx.amount) }).eq("id", tx.user_id);
    const { error } = await supabaseAdmin.from("transactions")
      .update({ status: "rejected", reject_reason: data.reason ?? "Rejected by admin" }).eq("id", tx.id);
    if (error) throw new Error(error.message);
    await (await import("./proof.server")).sendWithdrawalProof(tenant, tx, "rejected", null, data.reason ?? null);
    return { ok: true };
  });
