import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listGlobalTasks, createGlobalTask, updateGlobalTask, deleteGlobalTask } from "@/lib/global-tasks.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/tasks")({
  component: GlobalTasksPage,
});

function GlobalTasksPage() {
  const list = useServerFn(listGlobalTasks);
  const create = useServerFn(createGlobalTask);
  const upd = useServerFn(updateGlobalTask);
  const del = useServerFn(deleteGlobalTask);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["global_tasks"], queryFn: () => list() });
  const [form, setForm] = useState({ title: "", url: "", reward: 100, kind: "social" as "social" | "partner" | "watch" });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["global_tasks"] });

  const mCreate = useMutation({
    mutationFn: () => create({ data: { title: form.title, url: form.url || null, reward: Number(form.reward), kind: form.kind, sort_order: 0 } }),
    onSuccess: () => { toast.success("Task added to all bots"); setForm({ title: "", url: "", reward: 100, kind: "social" }); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const mToggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => upd({ data: v }),
    onSuccess: () => invalidate(),
  });
  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Removed from all bots"); invalidate(); },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Global tasks</h1>
        <p className="text-sm text-muted-foreground">Tasks added here appear in <b>every bot's mini app</b>. Removing one hides it everywhere.</p>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold">Add a task</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Join our Telegram channel" /></div>
          <div><Label>URL (optional)</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://t.me/…" /></div>
          <div><Label>Reward (tokens)</Label><Input type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: Number(e.target.value) })} /></div>
          <div>
            <Label>Kind</Label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as any })}>
              <option value="social">Social</option>
              <option value="partner">Partner</option>
              <option value="watch">Watch</option>
            </select>
          </div>
        </div>
        <Button onClick={() => mCreate.mutate()} disabled={!form.title || mCreate.isPending}>Add global task</Button>
      </div>

      <div className="border rounded-lg divide-y">
        {(data ?? []).map((t: any) => (
          <div key={t.id} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{t.title}</div>
              <div className="text-xs text-muted-foreground">+{t.reward} · {t.kind}{t.url ? ` · ${t.url}` : ""}</div>
            </div>
            <Switch checked={t.active} onCheckedChange={(v) => mToggle.mutate({ id: t.id, active: v })} />
            <Button size="icon" variant="ghost" onClick={() => mDel.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {(!data || data.length === 0) && <div className="p-6 text-center text-sm text-muted-foreground">No global tasks yet.</div>}
      </div>
    </div>
  );
}
