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
  const fn = useServerFn(requestWithdrawal);
  const m = useMutation({
    mutationFn: () => fn({ data: { tenantId: tenant.id, initData, previewTgId: initData ? null : previewTgId, amount_usdt: Number(amount), token, wallet: wallet.trim() } }),
    onSuccess: () => { toast.success("Withdrawal requested"); refetchUser(); setAmount(""); setWallet(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const min = (tenant.economics as any).min_withdraw_usdt;
  return (
    <div className="p-6 pt-12">
      <h1 className="text-2xl font-bold mb-2">Withdraw</h1>
      <p className="text-sm text-white/60">Balance: ${Number(user.usd_balance).toFixed(4)} · Min: ${min}</p>
      <div className="space-y-4 mt-6">
        <div><Label>Select token</Label>
          <Select value={token} onValueChange={(v) => setToken(v as typeof token)}>
            <SelectTrigger className="bg-white/10 border-white/20"><SelectValue /></SelectTrigger>
            <SelectContent>{tokens.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Destination address</Label><Input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder={token === "gram_ton" ? "TON wallet address" : "0x…"} className="bg-white/10 border-white/20" /></div>
        <div><Label>Amount (USDT)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white/10 border-white/20" /></div>
        <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending || !amount || !wallet.trim()}>{m.isPending ? "Submitting…" : "Request withdrawal"}</Button>
      </div>
    </div>
  );
}
