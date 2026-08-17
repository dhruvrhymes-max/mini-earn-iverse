import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPayoutProof } from "@/lib/game.functions";
import { useMini } from "@/lib/miniapp-context";
import { formatUsd } from "@/lib/format";

export const Route = createFileRoute("/app/$tenantSlug/payouts")({
  component: Payouts,
});

function Payouts() {
  const { tenantSlug } = useParams({ from: "/app/$tenantSlug/payouts" });
  const { tenant } = useMini();
  const theme = tenant?.theme || {};
  const fetchProof = useServerFn(getPayoutProof);
  const { data, isLoading } = useQuery({
    queryKey: ["payout-proof", tenantSlug],
    queryFn: () => fetchProof({ data: { tenantSlug } }),
  });

  return (
    <div className="px-5 pt-6 pb-28">
      <h1 className="text-2xl font-black text-white">Payout proof</h1>
      <p className="text-sm text-white/60 mt-1">
        Every completed withdrawal is listed publicly so anyone can verify that rewards are really paid.
      </p>

      <div className="mt-5 rounded-2xl p-4 border" style={{ borderColor: `${theme.primary}44`, background: `${theme.primary}12` }}>
        <p className="text-xs uppercase tracking-widest text-white/60">Total paid out</p>
        <p className="text-3xl font-black" style={{ color: theme.primary }}>${formatUsd(data?.total_usdt ?? 0, 2)}</p>
      </div>

      {data?.channel_url ? (
        <a
          href={data.channel_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block text-center rounded-2xl py-3 font-bold text-black"
          style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary})` }}
        >
          Open payout channel
        </a>
      ) : null}

      <div className="mt-6 space-y-2">
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
            <p className="font-black" style={{ color: theme.primary }}>${formatUsd(p.amount, 2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
