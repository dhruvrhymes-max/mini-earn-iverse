/** Payment-proof channel posting (server only). */

export const DEFAULT_PROOF_TEMPLATE = [
  "{status_emoji} <b>{status}</b>",
  "",
  "👤 User: {username}",
  "🆔 ID: {user_id}",
  "💵 Amount: {amount} {currency}",
  "🌐 Network: {network}",
  "🪙 Token: {token}",
  "🔗 Tx: {tx}",
  "",
  "{footer}",
].join("\n");

export function renderProof(template: string, vars: Record<string, string>): string {
  return (template || DEFAULT_PROOF_TEMPLATE).replace(/\{(\w+)\}/g, (_m, k) => vars[k] ?? "—");
}

export async function postProof(
  botToken: string | null | undefined,
  chatId: string | null | undefined,
  text: string,
) {
  if (!botToken || !chatId) return { ok: false, skipped: true };
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    const json: any = await res.json();
    return { ok: !!json?.ok, error: json?.description ?? null };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/** Render + post a withdrawal proof for a transaction row. */
export async function sendWithdrawalProof(
  tenant: any,
  tx: any,
  status: "paid" | "rejected" | "requested",
  hash: string | null,
  reason: string | null,
) {
  const cfg: any = tenant.proof_config || {};
  if (!cfg.enabled || !cfg.channel_id) return { ok: false, skipped: true };
  const payout: any = tenant.payout_config || {};
  const explorer = tx.network === "ton" ? payout?.ton?.explorer : payout?.evm?.explorer;
  const text = renderProof(cfg.template || DEFAULT_PROOF_TEMPLATE, {
    status:
      status === "paid" ? "Withdrawal successful"
      : status === "rejected" ? "Withdrawal rejected"
      : "Withdrawal requested",
    status_emoji: status === "paid" ? "✅" : status === "rejected" ? "❌" : "🕓",
    username: tx.app_users?.username ? `@${tx.app_users.username}` : tx.app_users?.first_name || "user",
    user_id: String(tx.app_users?.telegram_id ?? "—"),
    amount: Number(tx.amount).toFixed(4),
    currency: tx.currency || "USDT",
    network: String(tx.network || "—").toUpperCase(),
    token: tenant.token_symbol || "TKN",
    tx: hash ? (explorer ? `${explorer}${hash}` : hash) : "—",
    reason: reason || "—",
    footer: cfg.footer || tenant.name || "",
    bot: tenant.bot_username ? `@${tenant.bot_username}` : "",
  });
  return postProof(tenant.bot_token, cfg.channel_id, text);
}
