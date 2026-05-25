import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "../$tenantSlug";
import { useServerFn } from "@tanstack/react-start";
import { getMyHistory } from "@/lib/miniapp.functions";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/app/$tenantSlug/history")({ component: History });

function History() {
  const { user } = useMini();
  const fn = useServerFn(getMyHistory);
  const { data: rows = [] } = useQuery({ queryKey: ["hist", user.id], queryFn: () => fn({ data: { userId: user.id } }) });
  return (
    <div className="p-4 pt-8">
      <h1 className="text-2xl font-bold mb-4">History</h1>
      <div className="space-y-2">
        {rows.map((r: any) => (
          <div key={r.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{r.type}</p>
              <p className="text-xs text-white/50">{new Date(r.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p>{Number(r.amount).toFixed(4)} {r.currency}</p>
              <p className="text-xs text-white/50">{r.status}</p>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-white/50 py-8">No transactions yet.</p>}
      </div>
    </div>
  );
}
