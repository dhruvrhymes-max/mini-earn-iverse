import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenant, getTenantStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/")({
  component: Analytics,
});

function Analytics() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/" });
  const get = useServerFn(getTenant);
  const stats = useServerFn(getTenantStats);
  const { data: tenant } = useQuery({ queryKey: ["tenant", tenantId], queryFn: () => get({ data: { id: tenantId } }) });
  const { data: s } = useQuery({ queryKey: ["stats", tenantId], queryFn: () => stats({ data: { id: tenantId } }) });
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{tenant?.name ?? "Loading…"}</h1>
      <p className="text-sm text-muted-foreground mb-6">/{tenant?.slug}</p>
      <div className="grid md:grid-cols-4 gap-4">
        <Stat label="Active users" value={s?.userCount ?? "—"} />
        <Stat label="Token liability" value={s ? s.liability.toLocaleString() : "—"} />
        <Stat label="Ad impressions" value={s?.adImpressions ?? "—"} />
        <Stat label="Pending withdrawals" value={s ? `$${s.pendingWithdraw.toFixed(2)}` : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border rounded-lg p-5">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
