// Telegram webhook — /start welcome message + in-chat admin panel (/panel).
// Public endpoint (verify_jwt = false). Tenant identified by ?t=<tenant_id>.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "https://mini-earn-iverse.lovable.app";
const SUPER_ADMIN_IDS = [7438823799, 6792289044];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });
}

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function defaultWelcome(tenant: any) {
  const verb = tenant.action_verb || "Mine";
  return [
    `🥐 <b>Welcome to ${esc(tenant.name)}</b>`,
    "",
    `Ovens keep ${verb.toLowerCase()}ing offline — collect your tray.`,
    "",
    "🍞 <b>Earn more:</b>",
    "• Daily tasks",
    "• Watch ads &amp; earn",
    "• Invite friends",
  ].join("\n");
}

function renderWelcome(tenant: any, from: any) {
  const raw = (tenant.welcome_text && String(tenant.welcome_text).trim()) || defaultWelcome(tenant);
  return raw
    .replace(/\{first_name\}/g, esc(from?.first_name ?? "friend"))
    .replace(/\{name\}/g, esc(tenant.name ?? ""))
    .replace(/\{symbol\}/g, esc(tenant.token_symbol ?? ""))
    .replace(/\{token\}/g, esc(tenant.token_name ?? ""));
}

export type TgApi = (method: string, body: unknown) => Promise<any>;
function makeApi(token: string): TgApi {
  return async (method, body) => {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return await r.json().catch(() => ({}));
  };
}

const PANEL_KB = {
  inline_keyboard: [
    [{ text: "📢 Broadcast Message", callback_data: "p:broadcast" }],
    [{ text: "💬 Message User", callback_data: "p:dm" }],
    [{ text: "📝 Start Message", callback_data: "p:start" }],
    [{ text: "❌ Close", callback_data: "p:close" }],
  ],
};

/** Parses trailing "BUTTON: Label | https://url" lines into an inline keyboard. */
function extractButtons(text: string | undefined) {
  if (!text) return { text, reply_markup: undefined as any };
  const lines = text.split("\n");
  const rows: any[] = [];
  const keep: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*BUTTON:\s*(.+?)\s*\|\s*(https?:\/\/\S+)\s*$/i);
    if (m) rows.push([{ text: m[1], url: m[2] }]);
    else keep.push(line);
  }
  return {
    text: keep.join("\n").trim(),
    reply_markup: rows.length ? { inline_keyboard: rows } : undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("t");
    if (!tenantId) return json({ ok: false, error: "missing tenant" }, 400);

    const update = await req.json().catch(() => ({}));
    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: tenant } = await supa
      .from("tenants")
      .select("id, slug, name, action_verb, token_name, token_symbol, bot_token, welcome_text, welcome_image_url, welcome_cta_text, admin_telegram_ids")
      .eq("id", tenantId)
      .maybeSingle();
    if (!tenant?.bot_token) return json({ ok: false, error: "tenant not found" }, 404);
    const api = makeApi(tenant.bot_token);

    const isAdmin = (id?: number) =>
      !!id && (SUPER_ADMIN_IDS.includes(id) || (tenant.admin_telegram_ids ?? []).includes(id));

    // ---- callback buttons from the admin panel ----
    const cb = update?.callback_query;
    if (cb) {
      const tgId = cb.from?.id as number;
      const chatId = cb.message?.chat?.id;
      const data = String(cb.data ?? "");
      if (!isAdmin(tgId)) {
        await api("answerCallbackQuery", { callback_query_id: cb.id, text: "Not allowed", show_alert: true });
        return json({ ok: true });
      }
      await api("answerCallbackQuery", { callback_query_id: cb.id });
      const setMode = (mode: string) =>
        supa.from("bot_admin_sessions").upsert({ tenant_id: tenant.id, tg_id: tgId, mode, target_tg: null, updated_at: new Date().toISOString() });

      if (data === "p:close") {
        await supa.from("bot_admin_sessions").delete().eq("tenant_id", tenant.id).eq("tg_id", tgId);
        await api("deleteMessage", { chat_id: chatId, message_id: cb.message.message_id }).catch(() => {});
      } else if (data === "p:broadcast") {
        await setMode("broadcast");
        await api("sendMessage", {
          chat_id: chatId,
          parse_mode: "HTML",
          text: "📢 <b>Send Broadcast Message</b>\n\nSend a photo, GIF, text, sticker or forwarded post.\n⚡ It will be delivered to all users and auto-pinned in their chat.\n\n🔗 To add a button, add this as the last line:\n<code>BUTTON: Button Text | https://yourlink.com</code>\n\nSend /cancel to abort.",
        });
      } else if (data === "p:dm") {
        await setMode("dm_uid");
        await api("sendMessage", {
          chat_id: chatId,
          parse_mode: "HTML",
          text: "💬 <b>Message a user</b>\n\nSend the user's Telegram ID (UID).\n\nSend /cancel to abort.",
        });
      } else if (data === "p:start") {
        await setMode("start_msg");
        await api("sendMessage", {
          chat_id: chatId,
          parse_mode: "HTML",
          text: `📝 <b>Start message</b>\n\nCurrent:\n\n${renderWelcome(tenant, cb.from)}\n\nSend the new text (HTML allowed: <b>bold</b>, <i>italic</i>).\nSend /cancel to abort.`,
        });
      }
      return json({ ok: true });
    }

    const msg = update?.message ?? update?.edited_message;
    if (!msg?.chat?.id) return json({ ok: true, ignored: true });
    const chatId = msg.chat.id;
    const tgId = msg.from?.id as number;
    const text: string = typeof msg.text === "string" ? msg.text.trim() : "";

    // ---- commands ----
    if (text === "/cancel") {
      await supa.from("bot_admin_sessions").delete().eq("tenant_id", tenant.id).eq("tg_id", tgId);
      await api("sendMessage", { chat_id: chatId, text: "Cancelled." });
      return json({ ok: true });
    }

    if (text === "/panel" || text === "/adminpanel") {
      if (!isAdmin(tgId)) return json({ ok: true, ignored: true });
      await api("sendMessage", {
        chat_id: chatId,
        parse_mode: "HTML",
        text: `🛠️ <b>${esc(tenant.name)} Admin Panel</b>\n\nChoose an option:`,
        reply_markup: PANEL_KB,
      });
      return json({ ok: true });
    }

    if (text.startsWith("/start")) {
      const startParam = text.split(" ")[1] ?? "";
      const webAppUrl = `${PUBLIC_APP_URL}/app/${tenant.slug}${startParam ? `?ref=${encodeURIComponent(startParam)}` : ""}`;
      const welcomeText = renderWelcome(tenant, msg.from);
      const ctaText = tenant.welcome_cta_text || `Open ${tenant.name}`;
      const reply_markup = { inline_keyboard: [[{ text: ctaText, web_app: { url: webAppUrl } }]] };
      const res = tenant.welcome_image_url
        ? await api("sendPhoto", { chat_id: chatId, photo: tenant.welcome_image_url, caption: welcomeText, parse_mode: "HTML", reply_markup })
        : await api("sendMessage", { chat_id: chatId, text: welcomeText, parse_mode: "HTML", reply_markup });
      return json({ ok: true, telegram: res });
    }

    // ---- admin conversation flows ----
    if (!isAdmin(tgId)) return json({ ok: true, ignored: true });
    const { data: session } = await supa
      .from("bot_admin_sessions")
      .select("mode, target_tg")
      .eq("tenant_id", tenant.id)
      .eq("tg_id", tgId)
      .maybeSingle();
    if (!session) return json({ ok: true, ignored: true });

    const clear = () => supa.from("bot_admin_sessions").delete().eq("tenant_id", tenant.id).eq("tg_id", tgId);

    if (session.mode === "start_msg") {
      if (!text) {
        await api("sendMessage", { chat_id: chatId, text: "Please send text." });
        return json({ ok: true });
      }
      await supa.from("tenants").update({ welcome_text: text }).eq("id", tenant.id);
      await clear();
      await api("sendMessage", { chat_id: chatId, parse_mode: "HTML", text: `✅ Start message updated.\n\n${text}` });
      return json({ ok: true });
    }

    if (session.mode === "dm_uid") {
      const uid = Number(text);
      if (!Number.isFinite(uid) || uid <= 0) {
        await api("sendMessage", { chat_id: chatId, text: "Send a valid numeric UID, or /cancel." });
        return json({ ok: true });
      }
      await supa.from("bot_admin_sessions").upsert({
        tenant_id: tenant.id, tg_id: tgId, mode: "dm_msg", target_tg: uid, updated_at: new Date().toISOString(),
      });
      await api("sendMessage", { chat_id: chatId, parse_mode: "HTML", text: `Now send the message for <b>${uid}</b>.\nYou can add <code>BUTTON: Text | https://link</code> as the last line.` });
      return json({ ok: true });
    }

    if (session.mode === "dm_msg") {
      const target = session.target_tg;
      const { text: body, reply_markup } = extractButtons(msg.text ?? msg.caption);
      let res: any;
      if (msg.text) {
        res = await api("sendMessage", { chat_id: target, text: body, parse_mode: "HTML", reply_markup });
      } else {
        res = await api("copyMessage", { chat_id: target, from_chat_id: chatId, message_id: msg.message_id, caption: body || undefined, parse_mode: body ? "HTML" : undefined, reply_markup });
      }
      await clear();
      await api("sendMessage", { chat_id: chatId, text: res?.ok ? `✅ Sent to ${target}.` : `❌ Failed: ${res?.description ?? "unknown error"}` });
      return json({ ok: true });
    }

    if (session.mode === "broadcast") {
      await clear();
      const { text: body, reply_markup } = extractButtons(msg.text ?? msg.caption);
      const { data: users } = await supa
        .from("app_users")
        .select("telegram_id")
        .eq("tenant_id", tenant.id)
        .eq("banned", false);
      const ids = (users ?? []).map((u: any) => u.telegram_id).filter(Boolean);
      await api("sendMessage", { chat_id: chatId, text: `📢 Broadcasting to ${ids.length} users…` });
      let sent = 0, failed = 0;
      for (const id of ids) {
        const res = msg.text
          ? await api("sendMessage", { chat_id: id, text: body, parse_mode: "HTML", reply_markup })
          : await api("copyMessage", { chat_id: id, from_chat_id: chatId, message_id: msg.message_id, caption: body || undefined, parse_mode: body ? "HTML" : undefined, reply_markup });
        if (res?.ok) {
          sent++;
          const mid = res.result?.message_id;
          if (mid) await api("pinChatMessage", { chat_id: id, message_id: mid, disable_notification: true });
        } else failed++;
        await new Promise((r) => setTimeout(r, 35));
      }
      await api("sendMessage", { chat_id: chatId, parse_mode: "HTML", text: `📢 <b>Broadcast Finished &amp; Pinned!</b>\n\n✅ Sent: ${sent}\n❌ Failed: ${failed}` });
      return json({ ok: true });
    }

    return json({ ok: true, ignored: true });
  } catch (e) {
    console.error("telegram-webhook error", e);
    return json({ ok: false, error: String((e as any)?.message ?? e) }, 500);
  }
});
