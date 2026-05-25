import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMilestones, upsertMilestone, deleteMilestone } from "@/lib/admin.functions";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/milestones")({
  component: Milestones,
});

function Milestones() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/milestones" });
  const list = useServerFn(listMilestones);
  const up = useServerFn(upsertMilestone);
  const del = useServerFn(deleteMilestone);
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ queryKey: ["milestones", tenantId], queryFn: () => list({ data: { tenantId } }) });
  const inv = () => qc.invalidateQueries({ queryKey: ["milestones", tenantId] });
  const m = useMutation({ mutationFn: (v: any) => up({ data: v }), onSuccess: () => { inv(); reset(); } });
  const dm = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: inv });
  const [f, setF] = useState({ threshold: 5, reward: 100, label: "" });
  const reset = () => setF({ threshold: 5, reward: 100, label: "" });
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Referral Milestones</h1>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate({ ...f, tenant_id: tenantId, label: f.label || null }); }} className="border rounded-lg p-4 mb-6 grid grid-cols-4 gap-3 items-end">
        <div><Label>Threshold</Label><Input type="number" value={f.threshold} onChange={(e) => setF({ ...f, threshold: Number(e.target.value) })} /></div>
        <div><Label>Reward</Label><Input type="number" value={f.reward} onChange={(e) => setF({ ...f, reward: Number(e.target.value) })} /></div>
        <div><Label>Label</Label><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></div>
        <Button type="submit"><Plus className="h-4 w-4 mr-1" />Add</Button>
      </form>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="border rounded p-3 flex items-center gap-3">
            <span>{r.threshold} referrals → +{r.reward}</span>
            {r.label && <span className="text-muted-foreground text-sm">{r.label}</span>}
            <Button size="icon" variant="ghost" className="ml-auto" onClick={() => dm.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
