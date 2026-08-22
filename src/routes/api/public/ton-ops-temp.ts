// TEMPORARY diagnostic/ops route — remove after processing the pending payout.
import { createFileRoute } from "@tanstack/react-router";

const TOKEN = "zl-tmp-9d1f4c7a2b6e";

export const Route = createFileRoute("/api/public/ton-ops-temp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-ops-token") !== TOKEN) return new Response("no", { status: 401 });
        const body = (await request.json()) as { txId: string; dry?: boolean };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tx } = await supabaseAdmin.from("transactions").select("*").eq("id", body.txId).maybeSingle();
        if (!tx) return Response.json({ error: "tx not found" }, { status: 404 });
        const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", tx.tenant_id).maybeSingle();
        if (!tenant) return Response.json({ error: "tenant not found" }, { status: 404 });

        try {
          if (body.dry) {
            const cfg = (tenant as any).payout_config?.ton || {};
            const { TonPool } = await import("@/lib/ton-rpc.server");
            const { pickTonWallet } = await import("@/lib/ton-wallet.server");
            const { decryptSecret } = await import("@/lib/wallet-crypto.server");
            const { mnemonicToPrivateKey } = await import("@ton/crypto");
            const pool = await TonPool.create(cfg);
            const key = await mnemonicToPrivateKey(decryptSecret(cfg.phrase_enc).trim().split(/\s+/));
            const picked = await pickTonWallet(
              { getBalance: (a: any) => pool.read((c: any) => c.getBalance(a)) },
              key.publicKey,
              cfg.wallet_version,
            );
            return Response.json({
              endpoints: pool.endpoints.map((e) => e.url),
              version: picked.version,
              balance: picked.balance.toString(),
              candidates: picked.candidates.map((c) => ({ v: c.version, a: c.address, b: c.balance.toString() })),
            });
          }
          const { processWithdrawalSecurely } = await import("@/lib/withdrawal-processing.server");
          const out = await processWithdrawalSecurely(supabaseAdmin, tenant, body.txId, true, null);
          return Response.json(out);
        } catch (e: any) {
          return Response.json({ error: String(e?.message || e) }, { status: 500 });
        }
      },
    },
  },
});
