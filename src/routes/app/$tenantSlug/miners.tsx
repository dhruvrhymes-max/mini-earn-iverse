import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMiners, myMiners, buyMiner } from "@/lib/miners.functions";
import { useMini } from "@/lib/miniapp-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, Timer } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/miners")({
  component: Miners,
});

function Miners() {
  const { tenant, user, refetchUser } = useMini();
  const listFn = useServerFn(listMiners);
  const myFn = useServerFn(myMiners);
  const buyFn = useServerFn(buyMiner);
  const qc = useQueryClient();
  const theme = (tenant.theme as any);
  const { data: miners } = useQuery({ queryKey: ["miners", tenant.id], queryFn: () => listFn({ data: { tenantId: tenant.id } }), enabled: !!tenant.id });
  const { data: mine } = useQuery({ queryKey: ["my-miners", user.id], queryFn: () => myFn({ data: { userId: user.id } }), enabled: !!user.id });

  const m = useMutation({
    mutationFn: (minerId: string) => buyFn({ data: { userId: user.id, minerId } }),
    onSuccess: () => {
      toast.success("Miner activated!");
      refetchUser();
      qc.invalidateQueries({ queryKey: ["my-miners"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const owned = new Map<string, any>();
  for (const um of (mine ?? [])) {
    const exp = um.expires_at ? new Date(um.expires_at).getTime() : Infinity;
    if (exp > Date.now()) owned.set(um.miner_id, um);
  }

  return (
    <div className="p-4 pt-8 pb-24 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Miners</h1>
        <p className="text-sm text-white/60">Boost your {tenant.token_symbol}/hour rate.</p>
      </div>

      {mine && mine.length > 0 && (
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xs uppercase text-white/50 mb-2">Active</div>
          <div className="space-y-2">
            {mine.filter((um: any) => !um.expires_at || new Date(um.expires_at).getTime() > Date.now()).map((um: any) => (
              <div key={um.id} className="flex items-center gap-3 text-sm">
                <span className="text-2xl">{um.miners?.emoji ?? "⛏️"}</span>
                <div className="flex-1">
                  <div className="font-medium">{um.miners?.name}</div>
                  <div className="text-xs text-white/60">+{um.miners?.rate_boost_per_hour}/h{um.expires_at ? ` · expires ${new Date(um.expires_at).toLocaleDateString()}` : " · permanent"}</div>
                </div>
                <Zap className="h-4 w-4" style={{ color: theme.primary }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(miners ?? []).map((mn: any) => {
          const has = owned.has(mn.id);
          const affordable = Number(user.balance) >= Number(mn.price_tokens);
          return (
            <div
              key={mn.id}
              className="rounded-xl p-4 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${theme.primary}22, ${theme.accent}11)`, border: `1px solid ${theme.primary}44` }}
            >
              <div className="text-4xl">{mn.emoji ?? "⛏️"}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{mn.name}</div>
                <div className="text-xs text-white/70 flex items-center gap-2">
                  <Zap className="h-3 w-3" />+{mn.rate_boost_per_hour} {tenant.token_symbol}/h
                  {mn.duration_hours > 0 && <><Timer className="h-3 w-3 ml-1" />{mn.duration_hours}h</>}
                </div>
              </div>
              <Button
                size="sm"
                disabled={has || m.isPending || (!mn.is_free && !affordable)}
                onClick={() => m.mutate(mn.id)}
                style={{ background: theme.primary, color: "#000" }}
              >
                {has ? "Active" : mn.is_free ? "Free" : `${Number(mn.price_tokens)} ${tenant.token_symbol}`}
              </Button>
            </div>
          );
        })}
        {(!miners || miners.length === 0) && (
          <div className="text-center py-12 text-white/50 text-sm">No miners configured yet.</div>
        )}
      </div>
    </div>
  );
}
