import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ApplySchema = z.object({
  bot_token: z.string().regex(/^\d+:[A-Za-z0-9_-]{20,}$/),
  bot_username: z.string().min(1).max(64),
  config: z.object({
    name: z.string(),
    slug_hint: z.string(),
    token_name: z.string(),
    token_symbol: z.string(),
    action_verb: z.string(),
    welcome_text: z.string(),
    welcome_cta_text: z.string(),
    theme: z.object({ primary: z.string(), background: z.string(), accent: z.string() }),
    scene: z.string(),
    tasks: z.array(z.any()),
    miners: z.array(z.any()),
  }),
});

export const applyAiBotConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ApplySchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const username = data.bot_username.replace(/^@/, "");
    const baseSlug = (data.config.slug_hint || username).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || `bot-${Date.now()}`;
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: tenant, error } = await supabase.from("tenants").insert({
      slug, name: data.config.name, owner_user_id: userId,
      bot_token: data.bot_token, bot_username: username,
      token_name: data.config.token_name,
      token_symbol: data.config.token_symbol,
      action_verb: data.config.action_verb,
      welcome_text: data.config.welcome_text,
      welcome_cta_text: data.config.welcome_cta_text,
      theme: { ...data.config.theme, scene: data.config.scene },
    }).select().single();
    if (error) throw new Error(error.message);

    // Seed tasks + miners via admin client (RLS friendly since owner_user_id is auth.uid)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.config.tasks?.length) {
      await supabaseAdmin.from("tasks").insert(data.config.tasks.map((t: any, idx: number) => ({
        tenant_id: tenant.id, title: t.title, reward: Number(t.reward) || 0,
        url: t.url ?? null, type: "social", sort_order: idx, active: true,
      })));
    }
    if (data.config.miners?.length) {
      await supabaseAdmin.from("miners").insert(data.config.miners.map((m: any, idx: number) => ({
        tenant_id: tenant.id, name: m.name, emoji: m.emoji,
        price_tokens: Number(m.price_tokens) || 0,
        rate_boost_per_hour: Number(m.rate_boost_per_hour) || 0,
        duration_hours: Number(m.duration_hours) || 0,
        rarity: m.rarity || "common",
        is_free: !!m.is_free, active: true, sort_order: idx,
      })));
    }
    return tenant;
  });
