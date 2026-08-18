import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function makeMemo(prefix: string) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${(prefix || "dep").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6) || "dep"}-${Date.now().toString(36).toUpperCase()}${rand}`;
}

/** Create (or reuse) a pending TON invoice for a bake purchase or a coin pack. */
export const createTonInvoice = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    userId: z.string().uuid(),
    kind: z.enum(["miner", "coins"]),
    minerId: z.string().uuid().nullable().optional(),
    tonAmount: z.number().positive().max(10000).nullable().optional(),
  }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await admin();
    const { resolveReceiveConfig } = await import("./ton-receive.server");

    const { data: user } = await supabaseAdmin.from("app_users").select("*").eq("id", data.userId).single();
    if (!user) throw new Error("User not found");
    const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", user.tenant_id).single();
    if (!tenant) throw new Error("Bot not found");

    let amountTon = 0;
    let tokens = 0;
    let minerId: string | null = null;

    if (data.kind === "miner") {
      if (!data.minerId) throw new Error("Missing bake");
      const { data: miner } = await supabaseAdmin.from("miners").select("*").eq("id", data.minerId).single();
      if (!miner || miner.tenant_id !== user.tenant_id || !miner.active) throw new Error("Bake not available");
      if ((miner as any).currency !== "ton") throw new Error("This bake is not paid with TON");
      amountTon = Number((miner as any).price_ton || 0);
      if (!(amountTon > 0)) throw new Error("This bake has no TON price set");
      minerId = miner.id;
    } else {
      const dep: any = tenant.deposit_config || {};
      if (dep.enabled === false) throw new Error("Coin purchases are disabled right now");
      amountTon = Number(data.tonAmount || 0);
      if (!(amountTon > 0)) throw new Error("Enter a TON amount");
      tokens = amountTon * Number(dep.tokens_per_ton || 0);
      if (!(tokens > 0)) throw new Error("Coin rate is not configured yet");
    }

    const cfg = await resolveReceiveConfig(tenant);
    const memo = makeMemo((tenant.deposit_config as any)?.memo_prefix || tenant.token_symbol);

    const { data: row, error } = await supabaseAdmin.from("ton_invoices").insert({
      tenant_id: user.tenant_id,
      user_id: user.id,
      kind: data.kind,
      miner_id: minerId,
      amount_ton: amountTon,
      tokens,
      memo,
      address: cfg.address,
    }).select("*").single();
    if (error) throw new Error(error.message);

    return {
      id: row.id, address: row.address, memo: row.memo,
      amountTon: Number(row.amount_ton), tokens: Number(row.tokens), status: row.status,
    };
  });

/** Verify an invoice on-chain; when paid, deliver the bake or credit the coins. */
export const checkTonInvoice = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ invoiceId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await admin();
    const { resolveReceiveConfig, findIncomingPayment } = await import("./ton-receive.server");

    const { data: inv } = await supabaseAdmin.from("ton_invoices").select("*").eq("id", data.invoiceId).single();
    if (!inv) throw new Error("Invoice not found");
    if (inv.status === "paid") return { status: "paid" as const, txHash: inv.tx_hash };

    const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", inv.tenant_id).single();
    if (!tenant) throw new Error("Bot not found");

    const cfg = await resolveReceiveConfig(tenant);
    const found = await findIncomingPayment(cfg, inv.memo, Number(inv.amount_ton));
    if (!found) return { status: "pending" as const };

    // Mark paid first so a double-check can never deliver twice.
    const { data: claimed } = await supabaseAdmin.from("ton_invoices")
      .update({ status: "paid", paid_at: new Date().toISOString(), tx_hash: found.hash })
      .eq("id", inv.id).eq("status", "pending").select("id").maybeSingle();
    if (!claimed) return { status: "paid" as const, txHash: found.hash };

    const { data: user } = await supabaseAdmin.from("app_users").select("*").eq("id", inv.user_id).single();

    if (inv.kind === "miner" && inv.miner_id) {
      const { data: miner } = await supabaseAdmin.from("miners").select("*").eq("id", inv.miner_id).single();
      const expiresAt = miner && Number(miner.duration_hours) > 0
        ? new Date(Date.now() + Number(miner.duration_hours) * 3600_000).toISOString()
        : null;
      await supabaseAdmin.from("user_miners").insert({
        tenant_id: inv.tenant_id, user_id: inv.user_id, miner_id: inv.miner_id, expires_at: expiresAt,
      });
      await supabaseAdmin.from("transactions").insert({
        tenant_id: inv.tenant_id, user_id: inv.user_id, type: "deposit" as any,
        amount: Number(inv.amount_ton), currency: "TON", status: "approved", tx_hash: found.hash,
      });
    } else {
      const credit = Number(inv.tokens);
      await supabaseAdmin.from("app_users")
        .update({ balance: Number(user?.balance ?? 0) + credit })
        .eq("id", inv.user_id);
      await supabaseAdmin.from("transactions").insert({
        tenant_id: inv.tenant_id, user_id: inv.user_id, type: "deposit" as any,
        amount: credit, currency: tenant.token_symbol, status: "approved", tx_hash: found.hash,
      });
    }

    return { status: "paid" as const, txHash: found.hash };
  });

/** Recent invoices for the signed-in mini app user. */
export const myTonInvoices = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await admin();
    const { data: rows } = await supabaseAdmin.from("ton_invoices")
      .select("id,kind,amount_ton,tokens,memo,status,created_at,paid_at,tx_hash")
      .eq("user_id", data.userId).order("created_at", { ascending: false }).limit(20);
    return rows ?? [];
  });
