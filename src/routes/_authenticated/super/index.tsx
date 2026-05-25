import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { platformOverview } from "@/lib/super.functions";

export const Route = createFileRoute("/_authenticated/super/")({
  component: Overview,
});

function Overview() {
  const fn = useServerFn(platformOverview);
  const { data: s } = useQuery({ queryKey: ["platform"], queryFn: () => fn() });
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Platform Overview</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Total bots" value={s?.totalBots ?? "—"} />
        <Stat label="Total users" value={s?.totalUsers ?? "—"} />
        <Stat label="Pending withdrawals" value={s ? `$${s.pendingWithdrawUsd.toFixed(2)}` : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return <div className="border rounded-lg p-5"><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>;
}
