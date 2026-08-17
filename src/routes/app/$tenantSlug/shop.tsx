import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listMiners, myMiners, buyMiner, myReceipts } from "@/lib/miners.functions";
import { useMini } from "@/lib/miniapp-context";
import { Button } from "@/components/ui/button";
import { Zap, Timer, Gift, Receipt, ShoppingBag, Check } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/shop")({
  head: () => ({
    meta: [
      { title: "Bake shop — free and premium boosts" },
      { name: "description", content: "Claim your free bake tier and upgrade with Gram (TON) or in-game tokens. Every purchase gets a receipt." },
      { property: "og:title", content: "Bake shop — free and premium boosts" },
      { property: "og:description", content: "Claim the free tier, buy premium bakes with Gram or in-game tokens, and keep receipts of every purchase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

const TIER_LABEL = ["Free tier", "Tier 2", "Tier 3", "Tier 4", "Tier 5"];

function Shop() {
  const { tenant, user, refetchUser } = useMini();
  const theme = tenant.theme as any;
  const qc = useQueryClient();
  const [tab, setTab] = useState<"shop" | "receipts">("shop");

  const listFn = useServerFn(listMiners);
  const myFn = useServerFn(myMiners);
  const buyFn = useServerFn(buyMiner);
  const receiptFn = useServerFn(myReceipts);

  const { data: bakes = [] } = useQuery({
    queryKey: ["shop-bakes", tenant.id],
    queryFn: () => listFn({ data: { tenantId: tenant.id } }),
    enabled: !!tenant.id,
  });
  const { data: owned = [] } = useQuery({
    queryKey: ["my-miners", user.id],
    queryFn: () => myFn({ data: { userId: user.id } }),
    enabled: !!user.id,
  });
  const { data: receipts = [] } = useQuery({
    queryKey: ["shop-receipts", user.id],
    queryFn: () => receiptFn({ data: { userId: user.id } }),
    enabled: !!user.id,
  });

  const ownedIds = new Set(
    (owned as any[])
      .filter((o) => !o.expires_at || new Date(o.expires_at).getTime() > Date.now())
      .map((o) => o.miner_id),
  );

  const buy = useMutation({
    mutationFn: (id: string) => buyFn({ data: { userId: user.id, minerId: id } }),
    onSuccess: () => {
      toast.success("Purchase complete — receipt saved");
      refetchUser();
      qc.invalidateQueries({ queryKey: ["my-miners", user.id] });
      qc.invalidateQueries({ queryKey: ["shop-receipts", user.id] });
      setTab("receipts");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const all = bakes as any[];
  const free = all.filter((b) => b.is_free);
  const paid = all.filter((b) => !b.is_free).slice(0, 4);

  return (
    <div className="px-4 pt-8 pb-28">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-6 w-6" style={{ color: theme.primary }} />
        <div>
          <h1 className="text-2xl font-black">Bake shop</h1>
          <p className="text-xs text-white/60">1 free tier + up to 4 premium tiers</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl p-3 flex items-center justify-between"
        style={{ background: `${theme.primary}14`, border: `1px solid ${theme.primary}44` }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50">In-game balance</p>
          <p className="font-black text-lg">{Number(user.balance).toFixed(2)} {tenant.token_symbol}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/50">Gram (TON)</p>
          <p className="font-black text-lg">{Number((user as any).ton_deposited ?? 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 rounded-2xl p-1 mt-4" style={{ background: "rgba(255,255,255,0.05)" }}>
        {(["shop", "receipts"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2.5 rounded-xl text-sm font-semibold capitalize ${tab === t ? "" : "text-white/50"}`}
            style={tab === t ? { background: "rgba(255,255,255,0.08)", border: `1px solid ${theme.primary}44` } : {}}>
            {t === "shop" ? "Shop" : `Receipts (${(receipts as any[]).length})`}
          </button>
        ))}
      </div>

      {tab === "shop" ? (
        <div className="mt-4 space-y-3">
          {[...free.slice(0, 1), ...paid].map((b: any, i: number) => (
            <TierCard
              key={b.id}
              index={i}
              bake={b}
              theme={theme}
              tokenSymbol={tenant.token_symbol}
              owned={ownedIds.has(b.id)}
              busy={buy.isPending}
              balance={Number(user.balance)}
              ton={Number((user as any).ton_deposited ?? 0)}
              onBuy={() => buy.mutate(b.id)}
            />
          ))}
          {all.length === 0 && (
            <p className="text-center text-white/50 text-sm py-12">No bakes configured yet.</p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {(receipts as any[]).length === 0 && (
            <p className="text-center text-white/50 text-sm py-12">No receipts yet. Your purchases appear here.</p>
          )}
          {(receipts as any[]).map((r) => (
            <div key={r.id} className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Receipt className="h-4 w-4 text-white/40" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.emoji} {r.name}</p>
                <p className="text-[11px] text-white/45">
                  {new Date(r.purchased_at).toLocaleString()} · +{r.boost}/h
                  {r.expires_at ? ` · until ${new Date(r.expires_at).toLocaleDateString()}` : " · permanent"}
                </p>
              </div>
              <p className="text-sm font-black" style={{ color: theme.primary }}>
                {r.free ? "FREE" : r.currency === "ton" ? `${r.price} Gram` : `${r.price} ${tenant.token_symbol}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TierCard({ index, bake, theme, tokenSymbol, owned, busy, balance, ton, onBuy }: any) {
  const isFree = !!bake.is_free;
  const isTon = bake.currency === "ton";
  const price = isTon ? Number(bake.price_ton) : Number(bake.price_tokens);
  const affordable = isFree || (isTon ? ton >= price : balance >= price);
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3"
      style={{
        background: isFree ? `linear-gradient(135deg, ${theme.primary}22, transparent)` : "rgba(255,255,255,0.03)",
        border: `1px solid ${isFree ? `${theme.primary}66` : "rgba(255,255,255,0.1)"}`,
      }}>
      <div className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${theme.primary}22, ${theme.accent}11)` }}>
        {bake.image_url ? <img src={bake.image_url} alt={bake.name} className="h-full w-full object-cover" /> : (bake.emoji ?? "🧁")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
            style={{ background: `${theme.accent}22`, color: theme.accent }}>{TIER_LABEL[index] ?? `Tier ${index + 1}`}</span>
          {isFree && <Gift className="h-3.5 w-3.5" style={{ color: theme.primary }} />}
        </div>
        <p className="font-bold truncate mt-0.5">{bake.name}</p>
        {bake.description && <p className="text-xs text-white/55 line-clamp-2">{bake.description}</p>}
        <p className="text-xs text-white/60 flex items-center gap-1 mt-1">
          <Zap className="h-3 w-3" style={{ color: theme.accent }} />
          <span style={{ color: theme.accent }}>+{bake.rate_boost_per_hour}</span> {tokenSymbol}/hr
          {bake.duration_hours > 0 && <><Timer className="h-3 w-3 ml-1" />{bake.duration_hours}h</>}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="text-right">
          <p className="font-black" style={{ color: theme.primary }}>
            {isFree ? "FREE" : price.toLocaleString()}
          </p>
          {!isFree && <p className="text-[10px] text-white/50 uppercase">{isTon ? "Gram (TON)" : tokenSymbol}</p>}
        </div>
        <Button size="sm" disabled={owned || busy || !affordable} onClick={onBuy}
          style={{ background: theme.primary, color: "#000" }}>
          {owned ? <><Check className="h-3.5 w-3.5 mr-1" />Owned</> : isFree ? "Claim" : affordable ? "Buy" : "Low funds"}
        </Button>
      </div>
    </div>
  );
}
