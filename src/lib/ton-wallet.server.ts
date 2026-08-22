/**
 * TON wallet derivation helpers (server only).
 *
 * A 24-word phrase does not map to a single address: every wallet contract
 * version derives a different one. Tonkeeper now creates W5 (V5R1) wallets by
 * default while older accounts are V4R2 (and some are V3R2). Deriving only V4
 * made the platform read/pay from an address the owner never funded, which
 * surfaced as "wallet is empty and not yet deployed".
 *
 * These helpers derive every common version and pick the one that is actually
 * deployed or funded, so payouts and deposits use the owner's real wallet.
 */

export type TonWalletVersion =
  | "v5r1" | "v5beta" | "v4"
  | "v3r2" | "v3r1"
  | "v2r2" | "v2r1"
  | "v1r3" | "v1r2" | "v1r1";

/** Preference order when several versions look equal — W5 first, then W4, W3… */
const ORDER: TonWalletVersion[] = ["v5r1", "v5beta", "v4", "v3r2", "v3r1", "v2r2", "v2r1", "v1r3", "v1r2", "v1r1"];

export async function deriveTonWallets(publicKey: Buffer) {
  const t = await import("@ton/ton");
  const make: Record<TonWalletVersion, any> = {
    v5r1: t.WalletContractV5R1.create({ workchain: 0, publicKey }),
    v5beta: t.WalletContractV5Beta.create({ publicKey }),
    v4: t.WalletContractV4.create({ workchain: 0, publicKey }),
    v3r2: t.WalletContractV3R2.create({ workchain: 0, publicKey }),
    v3r1: t.WalletContractV3R1.create({ workchain: 0, publicKey }),
    v2r2: t.WalletContractV2R2.create({ workchain: 0, publicKey }),
    v2r1: t.WalletContractV2R1.create({ workchain: 0, publicKey }),
    v1r3: t.WalletContractV1R3.create({ workchain: 0, publicKey }),
    v1r2: t.WalletContractV1R2.create({ workchain: 0, publicKey }),
    v1r1: t.WalletContractV1R1.create({ workchain: 0, publicKey }),
  };
  return ORDER.map((version) => ({ version, wallet: make[version] }));
}


/** Friendly (non-bounceable) address string used everywhere in the UI. */
export function tonAddressString(wallet: any): string {
  return wallet.address.toString({ bounceable: false, urlSafe: true });
}

const ALIASES: Record<string, TonWalletVersion> = {
  w5: "v5r1", v5: "v5r1", v5r1: "v5r1", v5beta: "v5beta",
  w4: "v4", v4: "v4", v4r2: "v4",
  w3: "v3r2", v3: "v3r2", v3r2: "v3r2", v3r1: "v3r1",
  w2: "v2r2", v2: "v2r2", v2r2: "v2r2", v2r1: "v2r1",
  w1: "v1r3", v1: "v1r3", v1r3: "v1r3", v1r2: "v1r2", v1r1: "v1r1",
};

/**
 * Pick the wallet the owner actually uses: an explicitly configured version if
 * set, otherwise the first funded one in W5 → W4 → W3 → W2 → W1 order.
 */
export async function pickTonWallet(
  client: any,
  publicKey: Buffer,
  preferred?: string | null,
): Promise<{ wallet: any; version: TonWalletVersion; balance: bigint; candidates: { version: TonWalletVersion; address: string; balance: bigint }[] }> {
  const derived = await deriveTonWallets(publicKey);
  const pref = ALIASES[String(preferred || "").toLowerCase().replace(/[^a-z0-9]/g, "")];

  const balanceOf = async (wallet: any): Promise<bigint> => {
    try {
      // The caller passes a failover-aware client, so one attempt is enough.
      return await client.getBalance(wallet.address);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "no response");
      throw new Error(`TON RPC balance lookup failed: ${message}`);
    }
  };



  if (pref) {
    const hit = derived.find((d) => d.version === pref)!;
    const balance = await balanceOf(hit.wallet);
    return {
      wallet: hit.wallet,
      version: hit.version,
      balance,
      candidates: [{ version: hit.version, address: tonAddressString(hit.wallet), balance }],
    };
  }

  const candidates: { version: TonWalletVersion; address: string; balance: bigint }[] = [];
  for (const { version, wallet } of derived) {
    const balance = await balanceOf(wallet);
    candidates.push({ version, address: tonAddressString(wallet), balance });
    if (balance > 0n) return { wallet, version, balance, candidates };
  }

  const fallback = derived[0]!; // W5R1 — the current Tonkeeper default
  return { wallet: fallback.wallet, version: fallback.version, balance: 0n, candidates };
}

