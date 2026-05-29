import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { useServerFn } from "@tanstack/react-start";
import { requestWithdrawal } from "@/lib/miniapp.functions";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$tenantSlug/withdraw")({ component: Withdraw });

function Withdraw() {
  const { tenant, user, refetchUser } = useMini();
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<"polygon" | "bep20" | "ton">("polygon");
  const fn = useServerFn(requestWithdrawal);
  const m = useMutation({
    mutationFn: () => fn({ data: { userId: user.id, amount_usdt: Number(amount), network } }),
    onSuccess: () => { toast.success("Withdrawal requested"); refetchUser(); setAmount(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const min = (tenant.economics as any).min_withdraw_usdt;
  return (
    <div className="p-6 pt-12">
      <h1 className="text-2xl font-bold mb-2">Withdraw USDT</h1>
      <p className="text-sm text-white/60">Balance: ${Number(user.usd_balance).toFixed(4)} · Min: ${min}</p>
      <div className="space-y-4 mt-6">
        <div><Label>Network</Label>
          <Select value={network} onValueChange={(v) => setNetwork(v as any)}>
            <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="polygon">Polygon</SelectItem><SelectItem value="bep20">BEP20</SelectItem><SelectItem value="ton">TON</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Amount (USDT)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white/10 border-white/20" /></div>
        <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending || !amount}>Request withdrawal</Button>
      </div>
    </div>
  );
}
