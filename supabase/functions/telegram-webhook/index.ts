// Telegram webhook — handles /start and replies with welcome message + Mini App button.
// Public endpoint (verify_jwt = false). Tenant is identified by bot_token from DB lookup.
// Token of the bot that received the update is NOT in the payload; we rely on the URL path
// secret (?t=<tenant_id>) set at registration time so we know which bot to respond as.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "https://mini-earn-iverse.lovable.app";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("t");
    if (!tenantId) return json({ ok: false, error: "missing tenant" }, 400);

    const update = await req.json().catch(() => ({}));
    const msg = update?.message ?? update?.edited_message;
    if (!msg || typeof msg.text !== "string") return json({ ok: true, ignored: true });

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: tenant, error } = await supa
      .from("tenants")
      .select("id, slug, name, bot_token, welcome_text, welcome_image_url, welcome_cta_text")
      .eq("id", tenantId)
      .maybeSingle();
    if (error || !tenant?.bot_token) return json({ ok: false, error: "tenant not found" }, 404);

    const text = msg.text.trim();
    if (!text.startsWith("/start")) return json({ ok: true, ignored: true });

    const startParam = text.split(" ")[1] ?? "";
    const webAppUrl = `${PUBLIC_APP_URL}/app/${tenant.slug}${startParam ? `?ref=${encodeURIComponent(startParam)}` : ""}`;

    const welcomeText = tenant.welcome_text || `Welcome to ${tenant.name}! Tap below to start mining 24/7.`;
    const ctaText = tenant.welcome_cta_text || `Open ${tenant.name}`;

    const reply_markup = {
      inline_keyboard: [[{ text: ctaText, web_app: { url: webAppUrl } }]],
    };

    const tgBase = `https://api.telegram.org/bot${tenant.bot_token}`;
    const chat_id = msg.chat.id;
    let tgRes: Response;
    if (tenant.welcome_image_url) {
      tgRes = await fetch(`${tgBase}/sendPhoto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id, photo: tenant.welcome_image_url, caption: welcomeText, reply_markup }),
      });
    } else {
      tgRes = await fetch(`${tgBase}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id, text: welcomeText, reply_markup }),
      });
    }
    const tgJson = await tgRes.json().catch(() => ({}));
    return json({ ok: true, telegram: tgJson });
  } catch (e) {
    console.error("telegram-webhook error", e);
    return json({ ok: false, error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}
