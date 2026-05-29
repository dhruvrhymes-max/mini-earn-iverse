import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { useServerFn } from "@tanstack/react-start";
import { setWallets } from "@/lib/miniapp.functions";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$tenantSlug/wallets")({ component: Wallets });

function Wallets() {
  const { user, refetchUser } = useMini();
  const [f, setF] = useState({ wallet_polygon: "", wallet_bep20: "", wallet_ton: "" });
  useEffect(() => { setF({
    wallet_polygon: user.wallet_polygon ?? "",
    wallet_bep20: user.wallet_bep20 ?? "",
    wallet_ton: user.wallet_ton ?? "",
  }); }, [user]);
  const fn = useServerFn(setWallets);
  const m = useMutation({
    mutationFn: () => fn({ data: { userId: user.id, ...f } }),
    onSuccess: () => { toast.success("Saved"); refetchUser(); },
  });
  return (
    <div className="p-6 pt-12">
      <h1 className="text-2xl font-bold mb-6">Wallet addresses</h1>
      <div className="space-y-4">
        <div><Label>Polygon</Label><Input value={f.wallet_polygon} onChange={(e) => setF({ ...f, wallet_polygon: e.target.value })} className="bg-white/10 border-white/20" /></div>
        <div><Label>BEP20</Label><Input value={f.wallet_bep20} onChange={(e) => setF({ ...f, wallet_bep20: e.target.value })} className="bg-white/10 border-white/20" /></div>
        <div><Label>TON</Label><Input value={f.wallet_ton} onChange={(e) => setF({ ...f, wallet_ton: e.target.value })} className="bg-white/10 border-white/20" /></div>
        <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending}>Save</Button>
      </div>
    </div>
  );
}
