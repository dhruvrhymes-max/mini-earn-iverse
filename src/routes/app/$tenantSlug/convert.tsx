import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "../$tenantSlug";
import { useServerFn } from "@tanstack/react-start";
import { convertToUsdt } from "@/lib/miniapp.functions";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$tenantSlug/convert")({ component: Convert });

function Convert() {
  const { tenant, user, refetchUser } = useMini();
  const [tokens, setTokens] = useState("");
  const fn = useServerFn(convertToUsdt);
  const m = useMutation({
    mutationFn: () => fn({ data: { userId: user.id, tokens: Number(tokens) } }),
    onSuccess: (r: any) => { toast.success(`+$${r.usdt.toFixed(4)} USDT`); refetchUser(); setTokens(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const rate = (tenant.economics as any).token_per_usdt;
  const usdt = tokens ? (Number(tokens) / rate).toFixed(4) : "0";
  return (
    <div className="p-6 pt-12">
      <h1 className="text-2xl font-bold mb-2">Convert {tenant.token_symbol} → USDT</h1>
      <p className="text-sm text-white/60">Rate: {rate} {tenant.token_symbol} = 1 USDT</p>
      <p className="text-sm text-white/60">Balance: {Number(user.balance).toFixed(2)} {tenant.token_symbol}</p>
      <div className="space-y-4 mt-6">
        <div><Label>{tenant.token_symbol} amount</Label><Input type="number" value={tokens} onChange={(e) => setTokens(e.target.value)} className="bg-white/10 border-white/20" /></div>
        <p className="text-white/80">≈ ${usdt} USDT</p>
        <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending || !tokens}>Convert</Button>
      </div>
    </div>
  );
}
