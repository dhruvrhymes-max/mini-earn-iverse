/**
 * Telegram channel membership verification (server only).
 *
 * Uses the platform check bot (falls back to the tenant bot). Verification only
 * works when that bot is an administrator of the channel/group — when it is not,
 * `verifyMembership` returns "unavailable" and callers skip the gate instead of
 * blocking members on a check that can never pass.
 */

export function chatIdFromLink(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (value.startsWith("-")) return value;
  if (value.startsWith("@")) return value;
  const m = value.match(/t\.me\/(?:s\/)?([A-Za-z0-9_]{4,})/);
  if (m) return `@${m[1]}`;
  if (/^[A-Za-z0-9_]{4,}$/.test(value)) return `@${value}`;
  return null;
}

export async function checkBotToken(supabaseAdmin: any, tenantId: string, tenantBotToken?: string | null) {
  const { data: bot } = await supabaseAdmin.from("check_bots")
    .select("bot_token")
    .eq("active", true)
    .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
    .order("tenant_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return bot?.bot_token || tenantBotToken || null;
}

async function tg(token: string, method: string, body: unknown) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch {
    return null;
  }
}

/** "ok" = member, "not_member" = joined check failed, "unavailable" = bot cannot check. */
export async function verifyMembership(
  token: string,
  chat: string,
  telegramUserId: number,
): Promise<"ok" | "not_member" | "unavailable"> {
  const res: any = await tg(token, "getChatMember", { chat_id: chat, user_id: telegramUserId });
  if (!res) return "unavailable";
  if (res.ok) {
    const status = res.result?.status;
    return ["creator", "administrator", "member", "restricted"].includes(status) ? "ok" : "not_member";
  }
  const desc = String(res.description || "").toLowerCase();
  // "user not found" means the bot can read the chat but the member isn't there.
  if (desc.includes("user not found") || desc.includes("participant")) return "not_member";
  // chat not found / bot is not a member / not enough rights → cannot verify
  return "unavailable";
}
