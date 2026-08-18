/**
 * On-chain payout engine (server only).
 * EVM: native or ERC-20 transfer signed with the tenant's stored private key.
 * TON: native TON or jetton transfer signed with the tenant's stored 24-word phrase.
 */
import { decryptSecret } from "./wallet-crypto.server";

export type PayoutResult = { hash: string; explorer: string | null };

const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const POLYGON_PUBLIC_RPCS = [
  "https://polygon-bor-rpc.publicnode.com",
  "https://polygon.drpc.org",
];

function evmRpcUrls(cfg: any): string[] {
  const configured = String(cfg.rpc_url || "").trim();
  const isPolygon = Number(cfg.chain_id) === 137 || String(cfg.chain_label || "").toLowerCase().includes("polygon");
  const disabledLegacyPolygon = /\bpolygon-rpc\.com\b/i.test(configured);
  if (isPolygon) {
    return [...new Set([...(disabledLegacyPolygon ? [] : [configured]), ...POLYGON_PUBLIC_RPCS].filter(Boolean))];
  }
  return configured ? [configured] : [];
}

function toUnits(amount: number, decimals: number): bigint {
  const [i, f = ""] = String(amount).split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(i || "0") * 10n ** BigInt(decimals) + BigInt(frac || "0");
}

async function payEvm(cfg: any, to: string, amount: number): Promise<PayoutResult> {
  const enc = cfg.private_key_enc;
  if (!enc) throw new Error("EVM private key is not configured in payout settings");
  const rpcUrls = evmRpcUrls(cfg);
  if (rpcUrls.length === 0) throw new Error("EVM RPC URL is not configured in payout settings");
  if (!/^0x[a-fA-F0-9]{40}$/.test(to)) throw new Error("Invalid EVM destination address");

  const { createWalletClient, createPublicClient, fallback, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");

  let pk = decryptSecret(enc).trim();
  if (!pk.startsWith("0x")) pk = `0x${pk}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(pk)) throw new Error("Stored EVM private key is malformed");

  const account = privateKeyToAccount(pk as `0x${string}`);
  const transport = rpcUrls.length === 1
    ? http(rpcUrls[0])
    : fallback(rpcUrls.map((url) => http(url)), { rank: false });
  const publicClient = createPublicClient({ transport });
  const chainId = await publicClient.getChainId();
  if (cfg.chain_id && Number(cfg.chain_id) !== chainId) {
    throw new Error(`Configured RPC is chain ${chainId}, expected ${cfg.chain_id}`);
  }
  const chain = { id: chainId, name: cfg.chain_label || "EVM", nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: rpcUrls } } } as any;
  const wallet = createWalletClient({ account, chain, transport });

  const decimals = Number(cfg.decimals ?? 6);
  const value = toUnits(amount, cfg.contract ? decimals : 18);

  const hash = cfg.contract
    ? await wallet.writeContract({
        address: cfg.contract as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, value],
        chain,
        account,
      })
    : await wallet.sendTransaction({ to: to as `0x${string}`, value, chain, account });
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 90_000 });
  return { hash, explorer: cfg.explorer || null };
}

async function payTon(payout: any, to: string, amount: number): Promise<PayoutResult> {
  const cfg = payout?.ton || {};
  const enc = cfg.phrase_enc;
  if (!enc) throw new Error("TON wallet phrase is not configured in payout settings");

  const { mnemonicToPrivateKey } = await import("@ton/crypto");
  const { TonClient, WalletContractV4, internal, JettonMaster } = await import("@ton/ton");
  const { Address, beginCell, toNano } = await import("@ton/core");

  const words = decryptSecret(enc).trim().split(/\s+/);
  if (words.length < 12) throw new Error("Stored TON phrase is malformed");
  const key = await mnemonicToPrivateKey(words);

  const endpoint = cfg.endpoint || "https://toncenter.com/api/v2/jsonRPC";
  const client = new TonClient({ endpoint, apiKey: cfg.api_key || undefined });
  const wallet = WalletContractV4.create({ workchain: 0, publicKey: key.publicKey });
  const contract = client.open(wallet);
  const seqno = await contract.getSeqno();
  const dest = Address.parse(to);

  let messages;
  if (cfg.jetton_master) {
    // Jetton (e.g. USDT on TON) transfer from our jetton wallet.
    const master = client.open(JettonMaster.create(Address.parse(cfg.jetton_master)));
    const jettonWallet = await master.getWalletAddress(wallet.address);
    const decimals = Number(cfg.jetton_decimals ?? 6);
    const body = beginCell()
      .storeUint(0xf8a7ea5, 32) // op::transfer
      .storeUint(0, 64)
      .storeCoins(toUnits(amount, decimals))
      .storeAddress(dest)
      .storeAddress(wallet.address) // response destination
      .storeBit(0)
      .storeCoins(toNano("0.01")) // forward amount
      .storeBit(0)
      .endCell();
    messages = [internal({ to: jettonWallet, value: toNano("0.05"), bounce: true, body })];
  } else {
    messages = [internal({ to: dest, value: toNano(amount.toFixed(9)), bounce: false, body: cfg.comment || "" })];
  }

  await contract.sendTransfer({ seqno, secretKey: key.secretKey, messages });

  // Wait for seqno advancement; never report a fake hash as a successful payment.
  let accepted = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const now = await contract.getSeqno().catch(() => seqno);
    if (now > seqno) { accepted = true; break; }
  }
  if (!accepted) throw new Error("TON transfer was not confirmed by the RPC endpoint");

  // Report the outgoing tx hash from the wallet's latest transaction.
  let hash = "";
  try {
    const txs = await client.getTransactions(wallet.address, { limit: 1 });
    hash = txs[0]?.hash().toString("hex") ?? "";
  } catch {
    /* explorer hash is best-effort */
  }
  if (!hash) throw new Error("TON transfer was accepted but its transaction hash could not be resolved");
  return { hash, explorer: cfg.explorer || "https://tonviewer.com/transaction/" };
}

/** Send a withdrawal on-chain. Throws with a readable message on failure. */
export async function sendPayout(
  tenant: any,
  opts: { network: string | null; wallet: string | null; amount: number },
): Promise<PayoutResult> {
  const to = (opts.wallet || "").trim();
  if (!to) throw new Error("This request has no destination wallet");
  const amount = Number(opts.amount);
  if (!(amount > 0)) throw new Error("Invalid payout amount");
  const payout: any = tenant?.payout_config || {};
  const net = String(opts.network || "").toLowerCase();
  if (net === "gram_ton" || net === "ton") return payTon(payout, to, amount);
  const key = net === "usdt_bep20" || net === "bep20" ? "bep20" : net === "usdt_polygon" || net === "polygon" ? "polygon" : "";
  if (!key) throw new Error("Unsupported payout token");
  const cfg = payout?.[key] || (payout?.evm?.chain_label?.toLowerCase().includes(key === "bep20" ? "bep" : "polygon") ? payout.evm : null);
  if (!cfg) throw new Error(`${key === "bep20" ? "BEP20" : "Polygon"} payout is not configured`);
  return payEvm(cfg, to, amount);
}
