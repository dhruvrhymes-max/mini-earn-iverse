import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWithdrawals, processWithdrawal } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/withdrawals")({
  component: Withdrawals,
});

function Withdrawals() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/withdrawals" });
  const list = useServerFn(listWithdrawals);
  const proc = useServerFn(processWithdrawal);
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const { data: rows = [] } = useQuery({ queryKey: ["withdrawals", tenantId], queryFn: () => list({ data: { tenantId } }) });
  const m = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) => proc({ data: { ...v, reason: v.approve ? undefined : reason || "Rejected by admin" } }),
    onSuccess: (r: any) => { qc.invalidateQueries({ queryKey: ["withdrawals", tenantId] }); toast.success(r.tx_hash ? `Paid: ${r.tx_hash.slice(0, 16)}…` : "Updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Withdrawals</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr><th className="p-3 text-left">User</th><th className="p-3 text-left">Amount</th><th className="p-3 text-left">Network</th><th className="p-3 text-left">Wallet</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">{r.app_users?.username || r.app_users?.telegram_id || "?"}</td>
                <td className="p-3">${Number(r.amount).toFixed(2)}</td>
                <td className="p-3 uppercase">{r.network}</td>
                <td className="p-3 font-mono text-xs">{r.wallet?.slice(0, 20)}…</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-right">
                  {r.status === "pending" && (
                    <div className="flex gap-2 justify-end">
                       <Button size="sm" disabled={m.isPending} onClick={() => m.mutate({ id: r.id, approve: true })}>{m.isPending ? "Sending…" : "Approve & send"}</Button>
                      <Button size="sm" variant="outline" onClick={() => m.mutate({ id: r.id, approve: false })}>Reject</Button>
                    </div>
                  )}
                  {r.tx_hash && <span className="text-xs font-mono text-muted-foreground">{r.tx_hash.slice(0, 12)}…</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No withdrawals yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
