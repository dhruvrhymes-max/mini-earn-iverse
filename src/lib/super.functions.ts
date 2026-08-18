import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireSuperAdmin = async (supabase: any, userId: string) => {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle();
  if (!data) throw new Error("Forbidden: super admin only");
};

export const platformOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const s = context.supabase;
    const [tenants, users, withdraws] = await Promise.all([
      s.from("tenants").select("id", { count: "exact", head: true }),
      s.from("app_users").select("id", { count: "exact", head: true }),
      s.from("transactions").select("amount").eq("type", "withdraw").eq("status", "pending"),
    ]);
    return {
      totalBots: tenants.count ?? 0,
      totalUsers: users.count ?? 0,
      pendingWithdrawUsd: (withdraws.data ?? []).reduce((a: number, r: any) => a + Number(r.amount || 0), 0),
    };
  });

export const listAllTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("tenants").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setTenantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), status: z.enum(["active", "suspended"]) }).parse(i))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("tenants").update({ status: data.status }).eq("id", data.id);
    (await import("./tenant-cache.server")).invalidateTenant(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("tenants").delete().eq("id", data.id);
    (await import("./tenant-cache.server")).invalidateTenant(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { data } = await context.supabase.from("announcements").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      message: z.string().min(1).max(500),
      severity: z.enum(["info", "warning", "critical"]).default("info"),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("announcements").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("announcements").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Check bots (join-verification bots per project) ────────────────
export const listCheckBots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("check_bots").select("*, tenants(name,slug)").order("created_at", { ascending: false });
    return data ?? [];
  });

export const saveCheckBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      id: z.string().uuid().optional().nullable(),
      tenant_id: z.string().uuid().nullable(),
      label: z.string().trim().min(1).max(80),
      bot_token: z.string().trim().regex(/^\d+:[A-Za-z0-9_-]{20,}$/, "Invalid bot token"),

      active: z.boolean().default(true),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    let username: string | null = null;
    try {
      const me = await (await fetch(`https://api.telegram.org/bot${data.bot_token}/getMe`)).json();
      if (!me?.ok) throw new Error(me?.description || "Telegram rejected this token");
      username = me.result?.username ?? null;
    } catch (e: any) {
      throw new Error(e?.message || "Could not verify bot token");
    }
    const row: any = { ...data, bot_username: username };
    if (!row.id) delete row.id;
    const { error } = await context.supabase.from("check_bots").upsert(row);
    if (error) throw new Error(error.message);
    return { ok: true, bot_username: username };
  });

export const deleteCheckBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("check_bots").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
