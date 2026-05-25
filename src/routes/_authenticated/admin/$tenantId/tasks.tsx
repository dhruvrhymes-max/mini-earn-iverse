import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTasks, upsertTask, deleteTask } from "@/lib/admin.functions";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/tasks")({
  component: Tasks,
});

function Tasks() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/tasks" });
  const list = useServerFn(listTasks);
  const up = useServerFn(upsertTask);
  const del = useServerFn(deleteTask);
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({ queryKey: ["tasks", tenantId], queryFn: () => list({ data: { tenantId } }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks", tenantId] });
  const m = useMutation({ mutationFn: (v: any) => up({ data: v }), onSuccess: () => { invalidate(); toast.success("Saved"); reset(); }, onError: (e: any) => toast.error(e.message) });
  const dm = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => invalidate() });

  const [form, setForm] = useState<any>({ kind: "social", title: "", url: "", reward: 100, daily_limit: null, sort_order: 0 });
  const reset = () => setForm({ kind: "social", title: "", url: "", reward: 100, daily_limit: null, sort_order: 0 });

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      <form onSubmit={(e) => { e.preventDefault(); m.mutate({ ...form, tenant_id: tenantId, url: form.url || null, daily_limit: form.daily_limit ? Number(form.daily_limit) : null }); }} className="border rounded-lg p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div><Label>Type</Label>
          <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="social">Social</SelectItem><SelectItem value="partner">Partner</SelectItem><SelectItem value="watch">Watch</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
        <div><Label>URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
        <div><Label>Reward</Label><Input type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: Number(e.target.value) })} /></div>
        <Button type="submit" disabled={m.isPending}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </form>
      <div className="space-y-2">
        {tasks.map((t) => (
          <div key={t.id} className="border rounded p-3 flex items-center gap-3">
            <span className="text-xs uppercase px-2 py-0.5 bg-accent rounded">{t.kind}</span>
            <span className="flex-1">{t.title}</span>
            <span className="text-sm text-muted-foreground">+{t.reward}</span>
            <Button size="icon" variant="ghost" onClick={() => dm.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {tasks.length === 0 && <p className="text-muted-foreground text-sm">No tasks yet.</p>}
      </div>
    </div>
  );
}
