import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { useServerFn } from "@tanstack/react-start";
import { requestWithdrawal, getWithdrawEligibility } from "@/lib/miniapp.functions";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/withdraw")({ component: Withdraw });

function Crit({ done, label, progress }: { done: boolean; label: string; progress: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Circle className="h-4 w-4 text-white/30" />}
      <span className={done ? "text-white/70 line-through" : "text-white"}>{label}</span>
      <span className="ml-auto text-xs text-white/60">{progress}</span>
    </div>
  );
}

function Withdraw() {
  const { tenant, user, refetchUser, initData, previewTgId } = useMini();
  const [amount, setAmount] = useState("");
  const nets = ((tenant as any).withdraw_networks ?? {}) as Record<string, boolean>;
  const tokens = ([
    { id: "usdt_bep20", label: "USDT BEP20" },
    { id: "usdt_polygon", label: "USDT POL" },
    { id: "gram_ton", label: "GRAM (TON)" },
  ] as const).filter((t) => nets[t.id] !== false);
  const [token, setToken] = useState<"usdt_bep20" | "usdt_polygon" | "gram_ton">(tokens[0]?.id ?? "usdt_bep20");
  const [wallet, setWallet] = useState("");
  const [memo, setMemo] = useState("");
  const fn = useServerFn(requestWithdrawal);
  const eligFn = useServerFn(getWithdrawEligibility);
  const { data: elig, refetch: refetchElig } = useQuery({
    queryKey: ["withdraw-eligibility", user.id],
    queryFn: () => eligFn({ data: { tenantId: tenant.id, userId: user.id } }),
  });
  const m = useMutation({
    mutationFn: () => fn({ data: { tenantId: tenant.id, initData, previewTgId: initData ? null : previewTgId, amount_usdt: Number(amount), token, wallet: wallet.trim(), memo: token === "gram_ton" ? memo.trim() || null : null } }),
    onSuccess: () => { toast.success("Withdrawal requested"); refetchUser(); refetchElig(); setAmount(""); setWallet(""); setMemo(""); },
    onError: (e: any) => toast.error(e.message),
  });

  const min = (tenant.economics as any).min_withdraw_usdt;
  return (
    <div className="p-6 pt-12">
      <h1 className="text-2xl font-bold mb-2">Withdraw</h1>
      <p className="text-sm text-white/60">Balance: ${Number(user.usd_balance).toFixed(4)} · Min: ${min}</p>
      {elig?.req.enabled && (
        <div className="mt-4 rounded-xl bg-white/5 p-4 space-y-2">
          <p className="text-xs uppercase tracking-wider text-white/50">Withdrawal criteria</p>
          {elig.req.ads > 0 && <Crit done={elig.ads >= elig.req.ads} label={`Watch ${elig.req.ads} ads`} progress={`${Math.min(elig.ads, elig.req.ads)}/${elig.req.ads}`} />}
          {elig.req.tasks > 0 && <Crit done={elig.tasks >= elig.req.tasks} label={`Complete ${elig.req.tasks} tasks`} progress={`${Math.min(elig.tasks, elig.req.tasks)}/${elig.req.tasks}`} />}
          {elig.req.refs > 0 && <Crit done={elig.activeRefs >= elig.req.refs} label={`Get ${elig.req.refs} active invites`} progress={`${Math.min(elig.activeRefs, elig.req.refs)}/${elig.req.refs}`} />}
          <p className="text-xs pt-1">
            {elig.eligible ? <span className="text-green-400">You are eligible to withdraw 🎉</span> : <span className="text-white/60">Finish the steps above to unlock withdrawals.</span>}
          </p>
        </div>
      )}

      <div className="space-y-4 mt-6">
        <div><Label>Select token</Label>
          <Select value={token} onValueChange={(v) => setToken(v as typeof token)}>
            <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
            <SelectContent>{tokens.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Destination address</Label><Input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder={token === "gram_ton" ? "TON wallet address" : "0x…"} className="bg-white/10 border-white/20" /></div>
        {token === "gram_ton" && <div><Label>Memo / comment (optional)</Label><Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Required by some exchanges" className="bg-white/10 border-white/20" /></div>}

        <div><Label>Amount (USDT)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white/10 border-white/20" /></div>
        {tokens.length === 0 && <p className="text-xs text-white/50">Withdrawals are temporarily disabled.</p>}
        <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending || !amount || !wallet.trim() || tokens.length === 0 || (!!elig && !elig.eligible)}>{m.isPending ? "Submitting…" : "Request withdrawal"}</Button>
      </div>
    </div>
  );
}
