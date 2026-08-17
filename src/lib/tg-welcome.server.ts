/**
 * Sends the bot's welcome message (same content the /start command replies with)
 * to a member's private chat. Used when a member launches the Mini App straight
 * from a direct link (t.me/<bot>/<app>?startapp=…) so the bot chat is started
 * for them too, instead of only opening the app.
 *
 * Telegram rejects messages to users who never interacted with the bot; those
 * failures are swallowed on purpose — opening the app must never break.
 */
const PUBLIC_APP_ORIGIN = "https://mini-earn-iverse.lovable.app";

export async function sendBotWelcome(tenantRow: any, chatId: number, startParam?: string | null) {
  const token = tenantRow?.bot_token;
  if (!token || !chatId) return;
  const webAppUrl = `${PUBLIC_APP_ORIGIN}/app/${tenantRow.slug}${startParam ? `?ref=${encodeURIComponent(startParam)}` : ""}`;
  const text = tenantRow.welcome_text || `Welcome to ${tenantRow.name}! Tap below to start earning.`;
  const ctaText = tenantRow.welcome_cta_text || `Open ${tenantRow.name}`;
  const reply_markup = { inline_keyboard: [[{ text: ctaText, web_app: { url: webAppUrl } }]] };
  const base = `https://api.telegram.org/bot${token}`;
  try {
    if (tenantRow.welcome_image_url) {
      await fetch(`${base}/sendPhoto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: tenantRow.welcome_image_url, caption: text, reply_markup }),
      });
    } else {
      await fetch(`${base}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, reply_markup }),
      });
    }
  } catch {
    /* user has not started the bot yet — ignore */
  }
}
