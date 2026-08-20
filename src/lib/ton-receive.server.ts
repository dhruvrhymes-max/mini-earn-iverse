/**
 * Server-only helpers to RECEIVE TON payments into the bot's Tonkeeper wallet.
 * A single deposit address is used for every user; payments are matched by a
 * unique memo (comment) attached to the transfer.
 */
import { decryptSecret } from "./wallet-crypto.server";
import { tonFetchAdapter } from "./ton-http-adapter.server";

export type TonReceiveConfig = { address: string; apiKey?: string; api: string };

function apiBase(endpoint?: string | null) {
  const raw = (endpoint || "https://toncenter.com/api/v2/jsonRPC").trim();
  return raw.replace(/\/jsonRPC\/?$/, "").replace(/\/$/, "");
}

/** Resolve the address users must pay: explicit deposit wallet, else the payout phrase wallet. */
export async function resolveReceiveConfig(tenant: any): Promise<TonReceiveConfig> {
  const dep: any = tenant?.deposit_config || {};
  const ton: any = tenant?.payout_config?.ton || {};
  const api = apiBase(ton.endpoint);
  const apiKey = ton.api_key || undefined;

  const explicit = String(dep.ton_wallet || "").trim();
  if (explicit) return { address: explicit, apiKey, api };

  const enc = ton.phrase_enc;
  if (!enc) throw new Error("TON payments are not configured for this bot yet");
  const words = decryptSecret(enc).trim().split(/\s+/);
  if (words.length < 12) throw new Error("Stored TON phrase is malformed");
  const { mnemonicToPrivateKey } = await import("@ton/crypto");
  const { TonClient } = await import("@ton/ton");
  const { pickTonWallet, tonAddressString } = await import("./ton-wallet.server");
  const key = await mnemonicToPrivateKey(words);
  const client = new TonClient({
    endpoint: ton.endpoint || "https://toncenter.com/api/v2/jsonRPC",
    apiKey,
    httpAdapter: tonFetchAdapter,
  });
  const picked = await pickTonWallet(client, key.publicKey, ton.wallet_version);
  return { address: tonAddressString(picked.wallet), apiKey, api };

}

type Found = { hash: string; amountTon: number } | null;

/**
 * Look for a confirmed incoming transfer carrying `memo` worth at least `minTon`.
 * Uses the toncenter REST API so it stays Worker-friendly.
 */
export async function findIncomingPayment(cfg: TonReceiveConfig, memo: string, minTon: number): Promise<Found> {
  const url = `${cfg.api}/getTransactions?address=${encodeURIComponent(cfg.address)}&limit=60&archival=true`;
  const res = await fetch(url, { headers: cfg.apiKey ? { "X-API-Key": cfg.apiKey } : {} });
  if (!res.ok) throw new Error(`TON explorer error (${res.status}) — try again in a moment`);
  const json: any = await res.json();
  if (!json?.ok) throw new Error("TON explorer returned an error — try again in a moment");

  for (const tx of json.result ?? []) {
    const inMsg = tx?.in_msg;
    if (!inMsg) continue;
    const comment: string = String(inMsg.message ?? inMsg.msg_data?.text ?? "").trim();
    if (comment !== memo) continue;
    const amountTon = Number(inMsg.value || 0) / 1e9;
    if (amountTon + 1e-9 < minTon) continue;
    const hash = String(tx?.transaction_id?.hash ?? "");
    return { hash, amountTon };
  }
  return null;
}
