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
      slug: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens"),
      name: z.string().trim().min(1).max(80),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("tenants")
      .insert({ slug: data.slug, name: data.name, owner_user_id: userId })
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
      .from("tenants").update(data.patch).eq("id", data.id);
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
  .inputValidator((i) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const s = context.supabase;
    const { data: tx, error: e1 } = await s.from("transactions").select("*").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    if (tx.status !== "pending") throw new Error("Already processed");
    if (data.approve) {
      // Mock Web3 payout — TODO: integrate signer/RPC here.
      const mockHash = "0x" + Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64);
      const { error } = await s.from("transactions").update({
        status: "paid",
        tx_hash: mockHash,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, tx_hash: mockHash };
    } else {
      // Refund the user's USDT balance
      const { error: refundErr } = await s.rpc as any; // skip rpc; just update
      const { data: user } = await s.from("app_users").select("usd_balance").eq("id", tx.user_id).single();
      await s.from("app_users").update({
        usd_balance: Number(user?.usd_balance || 0) + Number(tx.amount),
      }).eq("id", tx.user_id);
      const { error } = await s.from("transactions").update({ status: "rejected" }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
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
