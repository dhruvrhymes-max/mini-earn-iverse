import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMini } from "@/lib/miniapp-context";
import { myTonInvoices } from "@/lib/ton-pay.functions";
import { TonPayDialog, type TonPayRequest } from "@/components/mini/TonPayDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Wallet } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/deposit")({
  head: () => ({
    meta: [
      { title: "Buy coins with TON" },
      { name: "description", content: "Top up your in-game balance by sending Gram (TON) with a unique memo — coins are credited automatically once confirmed." },
      { property: "og:title", content: "Buy coins with TON" },
      { property: "og:description", content: "Send Gram (TON) with your unique memo and get coins credited automatically." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Deposit,
});

const PRESETS = [0.5, 1, 2, 5];

function Deposit() {
  const { tenant, user, refetchUser } = useMini();
  const theme = tenant.theme as any;
  const dep: any = (tenant as any).deposit_config || {};
  const rate = Number(dep.tokens_per_ton || 0);
  const qc = useQueryClient();
  const [amount, setAmount] = useState("1");
  const [pay, setPay] = useState<TonPayRequest | null>(null);

  const invFn = useServerFn(myTonInvoices);
  const { data: invoices = [] } = useQuery({
    queryKey: ["ton-invoices", user.id],
    queryFn: () => invFn({ data: { userId: user.id } }),
    enabled: !!user.id,
  });

  const ton = Number(amount) || 0;
  const coins = ton * rate;
  const disabled = !(ton > 0) || rate <= 0 || dep.enabled === false;

  return (
    <div className="px-4 pt-8 pb-28 space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="h-6 w-6" style={{ color: theme.primary }} />
        <div>
          <h1 className="text-2xl font-black">Buy coins</h1>
          <p className="text-xs text-white/60">Pay with Gram (TON) — credited after confirmation</p>
        </div>
      </div>

      {rate > 0 ? (
        <div className="rounded-2xl p-4 space-y-3" style={{ background: `${theme.primary}12`, border: `1px solid ${theme.primary}44` }}>
          <p className="text-xs text-white/60">Rate: <b className="text-white">1 TON = {rate.toLocaleString()} {tenant.token_symbol}</b></p>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setAmount(String(p))}
                className="py-2 rounded-xl text-sm font-bold"
                style={{ background: String(p) === amount ? `${theme.primary}33` : "rgba(255,255,255,0.06)", border: `1px solid ${String(p) === amount ? theme.primary : "rgba(255,255,255,0.1)"}` }}>
                {p} TON
              </button>
            ))}
          </div>
          <Input type="number" min="0" step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="TON amount" />
          <p className="text-sm">You receive <b style={{ color: theme.primary }}>{coins.toLocaleString()} {tenant.token_symbol}</b></p>
          <Button className="w-full" disabled={disabled} style={{ background: theme.primary, color: "#000" }}
            onClick={() => setPay({ kind: "coins", tonAmount: ton, label: `${coins.toLocaleString()} ${tenant.token_symbol}` })}>
            <Wallet className="h-4 w-4 mr-2" /> Pay {ton} TON
          </Button>
        </div>
      ) : (
        <p className="text-sm text-white/50">Coin purchases are not configured for this bot yet.</p>
      )}

      <div>
        <p className="text-xs uppercase tracking-widest text-white/45 mb-2">Payment history</p>
        <div className="space-y-2">
          {(invoices as any[]).length === 0 && <p className="text-sm text-white/40">No payments yet.</p>}
          {(invoices as any[]).map((i) => (
            <div key={i.id} className="rounded-2xl px-3 py-2 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{i.kind === "coins" ? `${Number(i.tokens).toLocaleString()} ${tenant.token_symbol}` : "Bake purchase"}</p>
                <p className="text-[11px] text-white/45 font-mono truncate">{i.memo} · {new Date(i.created_at).toLocaleString()}</p>
              </div>
              <span className="text-xs font-bold" style={{ color: i.status === "paid" ? theme.primary : "rgba(255,255,255,0.5)" }}>
                {Number(i.amount_ton)} TON · {i.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <TonPayDialog
        open={!!pay}
        request={pay}
        userId={user.id}
        theme={theme}
        onClose={() => setPay(null)}
        onPaid={() => { refetchUser(); qc.invalidateQueries({ queryKey: ["ton-invoices", user.id] }); }}
      />
    </div>
  );
}
