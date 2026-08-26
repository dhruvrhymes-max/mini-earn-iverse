// TEMPORARY diagnostic/ops route — remove after processing the pending payout.
import { createFileRoute } from "@tanstack/react-router";

const TOKEN = "zl-tmp-9d1f4c7a2b6e";

export const Route = createFileRoute("/api/public/ton-ops-temp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-ops-token") !== TOKEN) return new Response("no", { status: 401 });
        const body = (await request.json()) as { txId: string; hash?: string; action?: string };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tx } = await supabaseAdmin.from("transactions")
          .select("*, app_users(username,first_name,telegram_id)").eq("id", body.txId).maybeSingle();
        if (!tx) return Response.json({ error: "tx not found" }, { status: 404 });
        const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", tx.tenant_id).maybeSingle();
        if (!tenant) return Response.json({ error: "tenant not found" }, { status: 404 });

        if (body.action === "approve") {
          try {
            const { processWithdrawalSecurely } = await import("@/lib/withdrawal-processing.server");
            const res = await processWithdrawalSecurely(supabaseAdmin, tenant, body.txId, true, null);
            return Response.json({ ok: true, res });
          } catch (e: any) {
            return Response.json({ error: String(e?.message || e), stack: String(e?.stack || "") }, { status: 500 });
          }
        }


        if (body.action === "diag2") {
          try {
            const cfg = (tenant as any).payout_config?.ton || {};
            const { decryptSecret } = await import("@/lib/wallet-crypto.server");
            const { mnemonicToPrivateKey } = await import("@ton/crypto");
            const key = await mnemonicToPrivateKey(decryptSecret(cfg.phrase_enc).trim().split(/\s+/));
            const { TonPool } = await import("@/lib/ton-rpc.server");
            const { WalletContractV5R1 } = await import("@ton/ton");
            const pool = await TonPool.create(cfg);
            const w = WalletContractV5R1.create({ workchain: 0, publicKey: key.publicKey });
            const out: any = { address: w.address.toString({ bounceable: false }), libWalletId: JSON.parse(JSON.stringify(w.walletId, (_k, v) => typeof v === "bigint" ? String(v) : v)) };
            for (const m of ["seqno", "get_subwallet_id", "is_signature_allowed", "get_public_key"]) {
              try {
                const r: any = await pool.read((c: any) => c.runMethod(w.address, m));
                out[m] = String(r.stack.readBigNumber());
              } catch (e: any) { out[m] = "ERR " + String(e?.message || e).slice(0, 120); }
            }
            return Response.json(out);
          } catch (e: any) {
            return Response.json({ error: String(e?.message || e) }, { status: 500 });
          }
        }

        if (body.action === "diag") {
          try {
            const cfg = (tenant as any).payout_config?.ton || {};
            const { decryptSecret } = await import("@/lib/wallet-crypto.server");
            const { mnemonicToPrivateKey } = await import("@ton/crypto");
            const key = await mnemonicToPrivateKey(decryptSecret(cfg.phrase_enc).trim().split(/\s+/));
            const { TonPool } = await import("@/lib/ton-rpc.server");
            const pool = await TonPool.create(cfg);
            const { diagnoseTonWallets } = await import("@/lib/ton-wallet.server");
            return Response.json({ wallets: await diagnoseTonWallets(pool, key.publicKey) });
          } catch (e: any) {
            return Response.json({ error: String(e?.message || e) }, { status: 500 });
          }
        }


        try {
          await supabaseAdmin.rpc("claim_withdrawal", { _transaction_id: body.txId, _tenant_id: tx.tenant_id });
          const { data: completed, error } = await supabaseAdmin.rpc("complete_withdrawal", {
            _transaction_id: body.txId,
            _tenant_id: tx.tenant_id,
            _tx_hash: body.hash!,
          });
          if (error) return Response.json({ error: error.message }, { status: 500 });
          const { sendWithdrawalNotifications } = await import("@/lib/withdrawal-notifications.server");
          const notifications = await sendWithdrawalNotifications(
            supabaseAdmin, tenant, { ...completed, app_users: (tx as any).app_users }, "paid", body.hash!, null,
          );
          return Response.json({ ok: true, notifications });
        } catch (e: any) {
          return Response.json({ error: String(e?.message || e) }, { status: 500 });
        }
      },
    },
  },
});
