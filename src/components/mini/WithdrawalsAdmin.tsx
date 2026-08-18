import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListWithdrawals, adminProcessWithdrawal } from "@/lib/bot-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Props = { tenantId: string; initData: string | null; previewTgId: number | null };

export function WithdrawalsAdmin({ tenantId, initData, previewTgId }: Props) {
  const auth = { tenantId, initData, previewTgId: initData ? null : previewTgId };
  const list = useServerFn(adminListWithdrawals);
  const process = useServerFn(adminProcessWithdrawal);
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [hash, setHash] = useState("");
  const [reason, setReason] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-withdrawals", tenantId],
    queryFn: () => list({ data: auth }),
  });

  const m = useMutation({
    mutationFn: (v: { txId: string; approve: boolean }) =>
      process({ data: { ...auth, ...v, tx_hash: v.approve ? hash || null : null, reason: v.approve ? null : reason || null } }),
    onSuccess: (r: any) => {
      setOpen(null); setHash(""); setReason("");
      qc.invalidateQueries({ queryKey: ["admin-withdrawals", tenantId] });
      toast.success(r?.tx_hash ? `Paid on-chain · ${String(r.tx_hash).slice(0, 14)}…` : "Request processed");
    },
    onError: (e: any) => toast.error(e.message || "Payment failed"),
  });


  return (
    <div className="space-y-3">
      {rows.map((r: any) => (
        <div key={r.id} className="bg-white/5 rounded-xl p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>{r.app_users?.username ? `@${r.app_users.username}` : r.app_users?.telegram_id}</span>
            <span className="font-semibold">${Number(r.amount).toFixed(2)}</span>
          </div>
          <div className="text-xs text-white/50 break-all">
            {String(r.network || "").toUpperCase()} · {r.wallet}
          </div>
          <div className="text-xs text-white/40">
            {new Date(r.created_at).toLocaleString()} · {r.status}
            {r.reject_reason ? ` · ${r.reject_reason}` : ""}
            {r.tx_hash ? ` · ${r.tx_hash.slice(0, 14)}…` : ""}
          </div>
          {r.status === "pending" && (
            open === r.id ? (
              <div className="space-y-2">
                <Input placeholder="Transaction hash (optional)" value={hash} onChange={(e) => setHash(e.target.value)} />
                <Input placeholder="Rejection reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => m.mutate({ txId: r.id, approve: true })}>Mark paid</Button>
                  <Button size="sm" variant="destructive" className="flex-1" onClick={() => m.mutate({ txId: r.id, approve: false })}>Reject</Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>×</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpen(r.id)}>Process</Button>
            )
          )}
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-white/40">No withdrawal requests yet.</p>}
    </div>
  );
}
