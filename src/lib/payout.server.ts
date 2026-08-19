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

const TOKEN_META_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

const POLYGON_PUBLIC_RPCS = [
  "https://polygon-bor-rpc.publicnode.com",
  "https://polygon.drpc.org",
];

// Canonical USDT contracts have different decimals on each chain. Keep these
// values authoritative even when an older tenant setting contains a stale
// value (BSC USDT is 18 decimals; Polygon USDT is 6).
const KNOWN_TOKEN_DECIMALS: Record<string, number> = {
  "0x55d398326f99059ff775485246999027b3197955": 18,
  "0xc2132d05d31c914a87c6611c10748aacbaed4c19": 6,
  "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": 6,
};

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

  let hash: `0x${string}`;
  if (cfg.contract) {
    const token = String(cfg.contract).trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(token)) throw new Error("Token contract address in payout settings is invalid");
    const code = await publicClient.getCode({ address: token as `0x${string}` });
    if (!code || code === "0x") throw new Error(`No token contract found at ${token} on ${cfg.chain_label || "this chain"}. Check the USDT contract address in payout settings.`);

    // Decimals MUST come from the contract — a wrong value silently sends ~0 tokens.
    let decimals: number | null = KNOWN_TOKEN_DECIMALS[token.toLowerCase()] ?? null;
    for (let attempt = 0; attempt < 3 && decimals === null; attempt++) {
      try {
        const d = Number(await publicClient.readContract({ address: token as `0x${string}`, abi: TOKEN_META_ABI, functionName: "decimals" }));
        if (Number.isFinite(d) && d >= 0 && d <= 36) decimals = d;
      } catch { /* retry */ }
    }
    if (decimals === null) {
      throw new Error(`Could not read token decimals from ${token}. Payout aborted to avoid sending a wrong amount.`);
    }
    const value = toUnits(amount, decimals);
    if (value <= 0n) throw new Error("Computed payout amount is zero — check the amount and token decimals.");


    const [tokenBal, gasBal] = await Promise.all([
      publicClient.readContract({ address: token as `0x${string}`, abi: TOKEN_META_ABI, functionName: "balanceOf", args: [account.address] }).catch(() => null),
      publicClient.getBalance({ address: account.address }),
    ]);
    if (tokenBal !== null && (tokenBal as bigint) < value) {
      throw new Error(`Payout wallet holds only ${Number(tokenBal) / 10 ** decimals} tokens but ${amount} is required. Top up ${account.address}.`);
    }
    if (gasBal === 0n) throw new Error(`Payout wallet ${account.address} has no native gas balance on ${cfg.chain_label || "this chain"}.`);

    try {
      const sim = await publicClient.simulateContract({
        address: token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, value],
        account,
      });
      hash = await wallet.writeContract(sim.request as any);
    } catch (e: any) {
      const msg = String(e?.shortMessage || e?.message || e);
      throw new Error(`Token transfer rejected by the contract: ${msg}. Verify the contract address, decimals, and that the payout wallet has enough USDT and gas.`);
    }
  } else {
    const value = toUnits(amount, 18);
    if ((await publicClient.getBalance({ address: account.address })) < value) {
      throw new Error(`Payout wallet ${account.address} has insufficient native balance.`);
    }
    hash = await wallet.sendTransaction({ to: to as `0x${string}`, value, chain, account });
  }
  await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 90_000 });
  return { hash, explorer: cfg.explorer || null };
}

/** Split "address|memo" (or "address:memo" for non-raw addresses) into parts. */
export function splitTonDestination(raw: string): { address: string; memo: string | null } {
  const value = (raw || "").trim();
  const idx = value.indexOf("|");
  if (idx === -1) return { address: value, memo: null };
  const memo = value.slice(idx + 1).trim();
  return { address: value.slice(0, idx).trim(), memo: memo || null };
}

async function payTon(payout: any, toRaw: string, amount: number): Promise<PayoutResult> {
  const cfg = payout?.ton || {};
  const enc = cfg.phrase_enc;
  if (!enc) throw new Error("TON wallet phrase is not configured in payout settings");

  const { mnemonicToPrivateKey } = await import("@ton/crypto");
  const { TonClient, internal, JettonMaster } = await import("@ton/ton");
  const { Address, beginCell, toNano, fromNano } = await import("@ton/core");

  const words = decryptSecret(enc).trim().split(/\s+/);
  if (words.length < 12) throw new Error("Stored TON phrase is malformed");
  const key = await mnemonicToPrivateKey(words);

  const { address: toAddress, memo } = splitTonDestination(toRaw);
  let dest: InstanceType<typeof Address>;
  try {
    dest = Address.parse(toAddress);
  } catch {
    throw new Error("Destination TON address is invalid");
  }

  const endpoint = cfg.endpoint || "https://toncenter.com/api/v2/jsonRPC";
  const client = new TonClient({ endpoint, apiKey: cfg.api_key || undefined });

  // The phrase maps to a different address per wallet version (Tonkeeper W5 vs
  // V4). Use the version that actually holds funds so payouts leave the wallet
  // the owner funded.
  const { pickTonWallet } = await import("./ton-wallet.server");
  const picked = await pickTonWallet(client, key.publicKey, cfg.wallet_version);
  const wallet = picked.wallet;
  const contract = client.open(wallet);
  const from = wallet.address.toString({ bounceable: false });

  const nativeBalance: bigint = picked.balance;

  // Public RPC endpoints rate-limit aggressively, so retry before giving up.
  let seqno = 0;
  let seqnoErr: any = null;
  let seqnoRead = false;
  for (let attempt = 0; attempt < 4 && !seqnoRead; attempt++) {
    try {
      seqno = await contract.getSeqno();
      seqnoRead = true;
    } catch (e) {
      seqnoErr = e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  if (!seqnoRead) {
    if (nativeBalance === 0n) {
      const list = picked.candidates.map((c) => `${c.version.toUpperCase()}: ${c.address}`).join(" · ");
      throw new Error(
        `TON payout wallet is empty. This phrase maps to these addresses — fund the one you use in Tonkeeper: ${list}`,
      );
    }
    // A funded but not-yet-deployed wallet has no seqno; it deploys itself on
    // the first outgoing transfer, so start at 0 instead of failing.
    const msg = String(seqnoErr?.message || seqnoErr || "");
    if (/exit_code|not (deployed|initialized)|uninit|method|-13|4294967282/i.test(msg)) {
      seqno = 0;
    } else {
      throw new Error(
        `Could not read the TON payout wallet state from the RPC endpoint (${msg || "no response"}). ` +
          `Add a toncenter API key in payout settings to avoid rate limits, then try again.`,
      );
    }
  }



  let messages;
  if (cfg.jetton_master) {
    // Jetton (e.g. USDT on TON) transfer from our jetton wallet.
    const gasNeeded = toNano("0.08");
    if (nativeBalance < gasNeeded) {
      throw new Error(`TON payout wallet ${from} has only ${fromNano(nativeBalance)} TON — at least 0.08 TON is required for gas on a jetton transfer.`);
    }
    const master = client.open(JettonMaster.create(Address.parse(cfg.jetton_master)));
    const jettonWallet = await master.getWalletAddress(wallet.address);
    const decimals = Number(cfg.jetton_decimals ?? 6);
    const value = toUnits(amount, decimals);
    if (value <= 0n) throw new Error("Computed payout amount is zero — check the amount and jetton decimals.");

    let jettonBalance: bigint | null = null;
    try {
      const res = await client.runMethod(jettonWallet, "get_wallet_data");
      jettonBalance = res.stack.readBigNumber();
    } catch {
      jettonBalance = 0n;
    }
    if (jettonBalance !== null && jettonBalance < value) {
      throw new Error(`TON payout wallet holds only ${Number(jettonBalance) / 10 ** decimals} tokens but ${amount} is required. Top up ${from}.`);
    }

    let body = beginCell()
      .storeUint(0xf8a7ea5, 32) // op::transfer
      .storeUint(0, 64)
      .storeCoins(value)
      .storeAddress(dest)
      .storeAddress(wallet.address) // response destination
      .storeBit(0)
      .storeCoins(toNano("0.02")); // forward amount
    if (memo) {
      const forward = beginCell().storeUint(0, 32).storeStringTail(memo).endCell();
      body = body.storeBit(1).storeRef(forward) as typeof body;
    } else {
      body = body.storeBit(0) as typeof body;
    }
    messages = [internal({ to: jettonWallet, value: toNano("0.08"), bounce: true, body: body.endCell() })];
  } else {
    const value = toNano(amount.toFixed(9));
    const needed = value + toNano("0.01");
    if (nativeBalance < needed) {
      throw new Error(`TON payout wallet ${from} has only ${fromNano(nativeBalance)} TON but ${amount} TON plus network fees are required. Top up the wallet and try again.`);
    }
    messages = [internal({ to: dest, value, bounce: false, body: memo || cfg.comment || "" })];
  }

  try {
    await contract.sendTransfer({ seqno, secretKey: key.secretKey, messages });
  } catch (e: any) {
    throw new Error(`TON transfer was rejected by the network: ${String(e?.message || e)}`);
  }

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
