/**
 * TON RPC pool with failover (server only).
 *
 * Public toncenter is rate-limited to ~1 rps for anonymous callers, so a single
 * client made every read fail with HTTP 429. This pool spreads reads across the
 * configured endpoint plus decentralised fallbacks and remembers which endpoint
 * last worked. Writes (sendTransfer) intentionally use a single endpoint per
 * attempt — TON broadcasts are not idempotent.
 */
import { tonFetchAdapter } from "./ton-http-adapter.server";

export type TonEndpoint = { url: string; apiKey?: string | null };

function isRateLimited(error: unknown): boolean {
  const msg = String((error as any)?.message || error || "");
  return /\b429\b|rate.?limit|too many requests/i.test(msg);
}

async function orbsEndpoints(): Promise<TonEndpoint[]> {
  try {
    const { getHttpEndpoint } = await import("@orbs-network/ton-access");
    const urls = await Promise.all([
      getHttpEndpoint({ network: "mainnet" }).catch(() => null),
      getHttpEndpoint({ network: "mainnet" }).catch(() => null),
    ]);
    return [...new Set(urls.filter(Boolean) as string[])].map((url) => ({ url }));
  } catch {
    return [];
  }
}

export async function buildTonEndpoints(cfg: any): Promise<TonEndpoint[]> {
  const apiKey = (cfg?.api_key && String(cfg.api_key).trim()) || null;
  const configured = String(cfg?.endpoint || "").trim();
  const list: TonEndpoint[] = [];
  if (configured) list.push({ url: configured, apiKey });
  if (apiKey) list.push({ url: "https://toncenter.com/api/v2/jsonRPC", apiKey });
  list.push(...(await orbsEndpoints()));
  list.push({ url: "https://toncenter.com/api/v2/jsonRPC" });

  const seen = new Set<string>();
  return list.filter((e) => {
    const key = `${e.url}|${e.apiKey || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class TonPool {
  private idx = 0;
  private constructor(
    private readonly clients: any[],
    readonly endpoints: TonEndpoint[],
  ) {}

  static async create(cfg: any): Promise<TonPool> {
    const { TonClient } = await import("@ton/ton");
    const endpoints = await buildTonEndpoints(cfg);
    const clients = endpoints.map(
      (e) => new TonClient({ endpoint: e.url, apiKey: e.apiKey || undefined, httpAdapter: tonFetchAdapter }),
    );
    if (clients.length === 0) throw new Error("No TON RPC endpoint is configured");
    return new TonPool(clients, endpoints);
  }

  /** The endpoint that most recently answered — used for the single broadcast. */
  get current(): any {
    return this.clients[this.idx];
  }

  /** Run a read-only RPC call, failing over across endpoints on error/429. */
  async read<T>(fn: (client: any) => Promise<T>): Promise<T> {
    let lastError: unknown = null;
    const rounds = 2;
    for (let round = 0; round < rounds; round++) {
      for (let step = 0; step < this.clients.length; step++) {
        const i = (this.idx + step) % this.clients.length;
        try {
          const out = await fn(this.clients[i]);
          this.idx = i;
          return out;
        } catch (error) {
          lastError = error;
          if (isRateLimited(error)) await new Promise((r) => setTimeout(r, 350 + Math.random() * 350));
        }
      }
      await new Promise((r) => setTimeout(r, 700 * (round + 1)));
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError || "TON RPC call failed"));
  }
}
