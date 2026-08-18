import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const Auth = {
  tenantId: z.string().uuid(),
  initData: z.string().nullable().optional(),
  previewTgId: z.number().int().positive().nullable().optional(),
};

/** Redeem a promo code — one claim per user, capped by max uses. */
export const redeemPromo = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    userId: z.string().uuid(),
    code: z.string().min(2).max(40),
  }).parse(i))
  .handler(async ({ data }) => {
    const supabaseAdmin = await admin();
    const { data: user } = await supabaseAdmin.from("app_users").select("*").eq("id", data.userId).single();
    if (!user) throw new Error("User not found");
    if (user.banned) throw new Error("Account is blocked");

    const code = data.code.trim().toUpperCase();
    const { data: promo } = await supabaseAdmin.from("promo_codes")
      .select("*").eq("tenant_id", user.tenant_id).eq("code", code).maybeSingle();
    if (!promo || !promo.active) throw new Error("Invalid promo code");
    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) throw new Error("This code has expired");
    if (promo.uses >= promo.max_uses) throw new Error("This code has reached its limit");

    const { error: dupe } = await supabaseAdmin.from("promo_redemptions").insert({
      tenant_id: user.tenant_id, promo_id: promo.id, user_id: user.id, amount: Number(promo.reward),
    });
    if (dupe) {
      if (String(dupe.code) === "23505") throw new Error("You already used this code");
      throw new Error(dupe.message);
    }

    await supabaseAdmin.from("promo_codes").update({ uses: promo.uses + 1 }).eq("id", promo.id);
    await supabaseAdmin.from("app_users")
      .update({ balance: Number(user.balance) + Number(promo.reward) }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      tenant_id: user.tenant_id, user_id: user.id, type: "task" as any,
      amount: Number(promo.reward), status: "approved",
    });

    return { reward: Number(promo.reward) };
  });

export const adminListPromos = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object(Auth).parse(i))
  .handler(async ({ data }) => {
    const { gateTgAdmin } = await import("./tg-admin.server");
    const { supabaseAdmin } = await gateTgAdmin(data);
    const { data: rows } = await supabaseAdmin.from("promo_codes")
      .select("*").eq("tenant_id", data.tenantId).order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminSavePromo = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    ...Auth,
    promo: z.object({
      id: z.string().uuid().nullable().optional(),
      code: z.string().min(2).max(40),
      reward: z.number().min(0),
      max_uses: z.number().int().min(1).max(1000000),
      active: z.boolean().default(true),
      expires_at: z.string().nullable().optional(),
    }),
  }).parse(i))
  .handler(async ({ data }) => {
    const { gateTgAdmin } = await import("./tg-admin.server");
    const { supabaseAdmin } = await gateTgAdmin(data);
    const { id, ...fields } = data.promo;
    const payload = {
      ...fields,
      code: fields.code.trim().toUpperCase(),
      expires_at: fields.expires_at ? new Date(fields.expires_at).toISOString() : null,
    };
    if (id) {
      const { error } = await supabaseAdmin.from("promo_codes").update(payload).eq("id", id).eq("tenant_id", data.tenantId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("promo_codes").insert({ ...payload, tenant_id: data.tenantId });
      if (error) throw new Error(error.code === "23505" ? "That code already exists" : error.message);
    }
    return { ok: true };
  });

export const adminDeletePromo = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ ...Auth, promoId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { gateTgAdmin } = await import("./tg-admin.server");
    const { supabaseAdmin } = await gateTgAdmin(data);
    const { error } = await supabaseAdmin.from("promo_codes").delete().eq("id", data.promoId).eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
