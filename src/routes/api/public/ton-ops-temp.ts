// TEMPORARY diagnostic/ops route — remove after processing the pending payout.
import { createFileRoute } from "@tanstack/react-router";

const TOKEN = "zl-tmp-9d1f4c7a2b6e";

export const Route = createFileRoute("/api/public/ton-ops-temp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-ops-token") !== TOKEN) return new Response("no", { status: 401 });
        const body = (await request.json()) as { txId: string; hash?: string };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tx } = await supabaseAdmin.from("transactions")
          .select("*, app_users(username,first_name,telegram_id)").eq("id", body.txId).maybeSingle();
        if (!tx) return Response.json({ error: "tx not found" }, { status: 404 });
        const { data: tenant } = await supabaseAdmin.from("tenants").select("*").eq("id", tx.tenant_id).maybeSingle();
        if (!tenant) return Response.json({ error: "tenant not found" }, { status: 404 });

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
