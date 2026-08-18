import { sendWithdrawalProof } from "./proof.server";

const esc = (value: unknown) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TOKEN_LABELS: Record<string, string> = {
  usdt_bep20: "USDT BEP20",
  usdt_polygon: "USDT POL",
  gram_ton: "GRAM (TON)",
  bep20: "USDT BEP20",
  polygon: "USDT POL",
  ton: "GRAM (TON)",
};

async function notifyUser(tenant: any, tx: any, status: "requested" | "paid" | "rejected", hash?: string | null, reason?: string | null) {
  if (!tenant?.bot_token || !tx?.app_users?.telegram_id) return { ok: false, skipped: true };
  const label = TOKEN_LABELS[String(tx.network)] ?? String(tx.network || "Token").toUpperCase();
  const title = status === "paid" ? "✅ <b>Withdrawal approved</b>" : status === "rejected" ? "❌ <b>Withdrawal rejected</b>" : "🕓 <b>Withdrawal requested</b>";
  const lines = [title, "", `Amount: <b>${Number(tx.amount).toFixed(4)} USDT</b>`, `Token: <b>${esc(label)}</b>`, `Address: <code>${esc(tx.wallet)}</code>`];
  if (hash) lines.push(`Transaction: <code>${esc(hash)}</code>`);
  if (reason) lines.push(`Reason: ${esc(reason)}`);
  try {
    const response = await fetch(`https://api.telegram.org/bot${tenant.bot_token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: tx.app_users.telegram_id, text: lines.join("\n"), parse_mode: "HTML" }),
    });
    const body: any = await response.json();
    return { ok: response.ok && !!body?.ok, error: body?.description ?? null };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Telegram notification failed" };
  }
}

export async function sendWithdrawalNotifications(
  supabaseAdmin: any,
  tenant: any,
  tx: any,
  status: "requested" | "paid" | "rejected",
  hash: string | null = null,
  reason: string | null = null,
) {
  const user = await notifyUser(tenant, tx, status, hash, reason);
  const channel = status === "rejected" ? { ok: false, skipped: true } : await sendWithdrawalProof(supabaseAdmin, tenant, tx, status, hash, reason);
  return { user, channel };
}