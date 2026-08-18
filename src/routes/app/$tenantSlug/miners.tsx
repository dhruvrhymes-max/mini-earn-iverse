import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMiners, myMiners, buyMiner } from "@/lib/miners.functions";
import { TonPayDialog, type TonPayRequest } from "@/components/mini/TonPayDialog";
import { useMini } from "@/lib/miniapp-context";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, Timer, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/$tenantSlug/miners")({
  component: Miners,
});

const RARITY_STYLE: Record<string, { border: string; label: string; text: string }> = {
  common:    { border: "rgba(148,163,184,0.4)", label: "COMMON",    text: "#94a3b8" },
  rare:      { border: "rgba(59,130,246,0.6)",  label: "RARE",      text: "#60a5fa" },
  epic:      { border: "rgba(168,85,247,0.6)",  label: "EPIC",      text: "#c084fc" },
  legendary: { border: "rgba(250,204,21,0.7)",  label: "LEGENDARY", text: "#facc15" },
};

function Miners() {
  const { tenant, user, refetchUser } = useMini();
  const listFn = useServerFn(listMiners);
  const myFn = useServerFn(myMiners);
  const buyFn = useServerFn(buyMiner);
  const qc = useQueryClient();
  const theme = (tenant.theme as any);
  const [tab, setTab] = useState<"market" | "mine">("market");
  const [pay, setPay] = useState<TonPayRequest | null>(null);
  const { data: miners = [] } = useQuery({ queryKey: ["miners", tenant.id], queryFn: () => listFn({ data: { tenantId: tenant.id } }), enabled: !!tenant.id });
  const { data: mine = [] } = useQuery({ queryKey: ["my-miners", user.id], queryFn: () => myFn({ data: { userId: user.id } }), enabled: !!user.id });

  const m = useMutation({
    mutationFn: (id: string) => buyFn({ data: { userId: user.id, minerId: id } }),
    onSuccess: () => { toast.success("Miner activated!"); refetchUser(); qc.invalidateQueries({ queryKey: ["my-miners"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const owned = new Map<string, any>();
  for (const um of (mine as any[])) {
    const exp = um.expires_at ? new Date(um.expires_at).getTime() : Infinity;
    if (exp > Date.now()) owned.set(um.miner_id, um);
  }
  const startBuy = (mn: any) => {
    if (!mn.is_free && mn.currency === "ton") { setPay({ kind: "miner", minerId: mn.id, label: mn.name }); return; }
    m.mutate(mn.id);
  };
  const freeMiner = (miners as any[]).find((m: any) => m.is_free);

  return (
    <div className="relative z-10 p-4 pt-8 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6" style={{ color: theme.primary }} />
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-xs text-white/60">Boost your {tenant.token_symbol}/hour</p>
        </div>
      </div>

      {freeMiner && !owned.has(freeMiner.id) && (
        <button
          onClick={() => m.mutate(freeMiner.id)}
          className="w-full flex items-center gap-3 rounded-2xl p-3 text-left"
          style={{ background: `linear-gradient(135deg, ${theme.primary}22, transparent)`, border: `1px solid ${theme.primary}66` }}
        >
          <div className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${theme.primary}22` }}>{freeMiner.emoji ?? "🎁"}</div>
          <div className="flex-1">
            <div className="font-bold" style={{ color: theme.primary }}>1 Free {freeMiner.name} to Claim</div>
            <div className="text-xs text-white/60">Farm {tenant.token_symbol.toLowerCase()} every hour — tap to claim</div>
          </div>
          <span className="text-2xl" style={{ color: theme.primary }}>→</span>
        </button>
      )}

      <div className="grid grid-cols-2 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
        <button onClick={() => setTab("market")} className={`py-2.5 rounded-xl text-sm font-medium ${tab === "market" ? "" : "text-white/50"}`}
          style={tab === "market" ? { background: "rgba(255,255,255,0.08)", border: `1px solid ${theme.primary}44` } : {}}>Marketplace</button>
        <button onClick={() => setTab("mine")} className={`py-2.5 rounded-xl text-sm font-medium ${tab === "mine" ? "" : "text-white/50"}`}
          style={tab === "mine" ? { background: "rgba(255,255,255,0.08)", border: `1px solid ${theme.primary}44` } : {}}>My Miners ({owned.size})</button>
      </div>

      {tab === "market" ? (
        <>
          <div className="text-xs uppercase tracking-wider text-white/40">Available — max 1 per type</div>
          <div className="space-y-3">
            {(miners as any[]).filter((mn) => !mn.is_free).map((mn: any) => {
              const has = owned.has(mn.id);
              const affordable = mn.currency === "ton" || Number(user.balance) >= Number(mn.price_tokens);
              const rarity = RARITY_STYLE[mn.rarity] || RARITY_STYLE.common;
              return (
                <div key={mn.id} className="rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${rarity.border}` }}>
                  <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-4xl overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${theme.primary}22, ${theme.accent}11)` }}>
                    {mn.image_url ? <img src={mn.image_url} alt="" className="h-full w-full object-cover" /> : (mn.emoji ?? "⛏️")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-bold truncate">{mn.name}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${rarity.text}22`, color: rarity.text }}>{rarity.label}</span>
                    </div>
                    {mn.description && <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{mn.description}</p>}
                    <div className="text-xs text-white/60 flex items-center gap-2 mt-1">
                      <Zap className="h-3 w-3" style={{ color: theme.accent }} /><span style={{ color: theme.accent }}>+{mn.rate_boost_per_hour}</span> {tenant.token_symbol}/hr
                      {mn.duration_hours > 0 && <><Timer className="h-3 w-3 ml-1" />{mn.duration_hours}h</>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="font-bold text-lg" style={{ color: theme.primary }}>{Number(mn.currency === "ton" ? mn.price_ton : mn.price_tokens).toLocaleString()}</div>
                      <div className="text-[10px] text-white/50 uppercase">{mn.currency === "ton" ? "Gram (TON)" : tenant.token_symbol}</div>
                    </div>
                    <Button size="sm" disabled={has || m.isPending || !affordable} onClick={() => startBuy(mn)}
                      style={{ background: theme.primary, color: "#000" }}>{has ? "Owned" : mn.currency === "ton" ? "Pay TON" : "+ Buy"}</Button>
                  </div>
                </div>
              );
            })}
            {(miners as any[]).length === 0 && (
              <div className="text-center py-12 text-white/50 text-sm">No miners configured yet.</div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {owned.size === 0 ? (
            <div className="text-center py-12 text-white/50 text-sm">You don't own any miners yet.</div>
          ) : (mine as any[]).filter((um: any) => !um.expires_at || new Date(um.expires_at).getTime() > Date.now()).map((um: any) => (
            <div key={um.id} className="flex items-center gap-3 rounded-2xl p-3 bg-white/5">
              <span className="text-3xl">{um.miners?.emoji ?? "⛏️"}</span>
              <div className="flex-1">
                <div className="font-medium">{um.miners?.name}</div>
                <div className="text-xs text-white/60">+{um.miners?.rate_boost_per_hour}/h · {um.expires_at ? `expires ${new Date(um.expires_at).toLocaleDateString()}` : "permanent"}</div>
              </div>
              <Zap className="h-4 w-4" style={{ color: theme.primary }} />
            </div>
          ))}
        </div>
      )}

      <TonPayDialog
        open={!!pay}
        request={pay}
        userId={user.id}
        theme={theme}
        onClose={() => setPay(null)}
        onPaid={() => { refetchUser(); qc.invalidateQueries({ queryKey: ["my-miners"] }); }}
      />
    </div>
  );
}
