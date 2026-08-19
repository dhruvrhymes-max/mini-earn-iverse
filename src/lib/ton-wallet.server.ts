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
    v5beta: t.WalletContractV5Beta.create({ workchain: 0, publicKey }),
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

/**
 * Pick the wallet the owner actually uses: highest balance among derived
 * versions, falling back to a deployed one, else the preferred/default version.
 */
export async function pickTonWallet(
  client: any,
  publicKey: Buffer,
  preferred?: string | null,
): Promise<{ wallet: any; version: TonWalletVersion; balance: bigint; candidates: { version: TonWalletVersion; address: string; balance: bigint }[] }> {
  const derived = await deriveTonWallets(publicKey);
  const pref = String(preferred || "").toLowerCase() as TonWalletVersion;

  const candidates: { version: TonWalletVersion; address: string; balance: bigint; wallet: any }[] = [];
  for (const { version, wallet } of derived) {
    let balance = 0n;
    try {
      balance = await client.getBalance(wallet.address);
    } catch {
      balance = 0n;
    }
    candidates.push({ version, address: tonAddressString(wallet), balance, wallet });
  }

  const explicit = candidates.find((c) => c.version === pref);
  const best = explicit ?? candidates.slice().sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0))[0]!;

  return {
    wallet: best.wallet,
    version: best.version,
    balance: best.balance,
    candidates: candidates.map(({ version, address, balance }) => ({ version, address, balance })),
  };
}
