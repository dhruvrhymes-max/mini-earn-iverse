import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPayoutProof } from "@/lib/game.functions";
import { getMyHistory } from "@/lib/miniapp.functions";
import { useMini } from "@/lib/miniapp-context";
import { formatUsd } from "@/lib/format";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/payouts")({
  component: Payouts,
});

const STATUS_STYLE: Record<string, string> = {
  paid: "text-emerald-400",
  approved: "text-emerald-400",
  pending: "text-amber-400",
  rejected: "text-rose-400",
};

function Payouts() {
  const { tenantSlug } = useParams({ from: "/app/$tenantSlug/payouts" });
  const { tenant, user } = useMini();
  const theme = tenant?.theme || {};
  const fetchProof = useServerFn(getPayoutProof);
  const fetchHistory = useServerFn(getMyHistory);
  const { data, isLoading } = useQuery({
    queryKey: ["payout-proof", tenantSlug],
    queryFn: () => fetchProof({ data: { tenantSlug } }),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["my-withdrawals", user?.id],
    queryFn: () => fetchHistory({ data: { userId: user.id } }),
    enabled: !!user?.id,
  });
  const mine = (history as any[]).filter((t) => t.type === "withdraw");
  const openChannel = (url: string) =>
    (window as any).Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, "_blank");

  return (
    <div className="px-5 pt-6 pb-28">
      <h1 className="text-2xl font-black text-white">Payouts</h1>
      <p className="text-sm text-white/60 mt-1">
        Track your own withdrawals and verify every payout published by the check bot.
      </p>

      <div className="mt-5 rounded-2xl p-4 border" style={{ borderColor: `${theme.primary}44`, background: `${theme.primary}12` }}>
        <p className="text-xs uppercase tracking-widest text-white/60">Total paid out</p>
        <p className="text-3xl font-black" style={{ color: theme.primary }}>${formatUsd(data?.total_usdt ?? 0, 2)}</p>
      </div>

      {data?.channel_url ? (
        <button
          onClick={() => openChannel(data.channel_url as string)}
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-black"
          style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary})` }}
        >
          <Megaphone className="h-4 w-4" /> Join payout channel
        </button>
      ) : null}

      <h2 className="mt-7 text-sm font-bold uppercase tracking-widest text-white/50">My withdrawals</h2>
      <div className="mt-2 space-y-2">
        {mine.length === 0 ? (
          <p className="text-sm text-white/50">You haven't requested a withdrawal yet.</p>
        ) : mine.map((t: any) => (
          <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                ${formatUsd(Number(t.amount), 2)} · {String(t.network || t.currency || "USDT").toUpperCase()}
              </p>
              <p className="text-[11px] text-white/45">
                {new Date(t.created_at).toLocaleString()}
                {t.tx_hash ? ` · ${String(t.tx_hash).slice(0, 10)}…` : ""}
                {t.reject_reason ? ` · ${t.reject_reason}` : ""}
              </p>
            </div>
            <span className={`text-xs font-bold uppercase ${STATUS_STYLE[t.status] ?? "text-white/60"}`}>{t.status}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-7 text-sm font-bold uppercase tracking-widest text-white/50">Public proof</h2>
      <div className="mt-2 space-y-2">
        {isLoading ? <p className="text-sm text-white/50">Loading payouts…</p> : null}
        {!isLoading && !(data?.payouts?.length) ? (
          <p className="text-sm text-white/50">No payouts published yet. Approved withdrawals appear here automatically.</p>
        ) : null}
        {(data?.payouts ?? []).map((p: any) => (
          <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-white font-semibold">@{p.user}</p>
              <p className="text-[11px] text-white/45">
                {new Date(p.created_at).toLocaleDateString()} · {p.network || "USDT"}
                {p.tx_hash ? ` · ${String(p.tx_hash).slice(0, 10)}…` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <p className="font-black" style={{ color: theme.primary }}>${formatUsd(p.amount, 2)}</p>
              {data?.channel_url ? (
                <button
                  onClick={() => openChannel(data.channel_url as string)}
                  aria-label="Join payout channel"
                  title="Join payout channel"
                  className="rounded-full p-1.5 border border-white/10 bg-white/5 text-white/70"
                >
                  <Megaphone className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
