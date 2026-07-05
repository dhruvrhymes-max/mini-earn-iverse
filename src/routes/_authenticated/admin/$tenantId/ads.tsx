import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ownerListAdProviders, ownerSaveAdProvider, ownerDeleteAdProvider } from "@/lib/ad-providers.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/ads")({
  component: AdsPage,
});

const KINDS = [
  { id: "monetag", label: "Monetag", fields: ["zone_id"] },
  { id: "adsgram", label: "Adsgram", fields: ["block_id"] },
  { id: "onclicka", label: "Onclicka", fields: ["zone_id"] },
  { id: "custom", label: "Custom", fields: ["script_url", "zone_id"] },
] as const;

const EMPTY = { id: null as string|null, kind: "monetag", label: "", config: {} as Record<string,string>, reward_tokens: 100, daily_cap: 20, active: true, sort_order: 0 };

function AdsPage() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/ads" });
  const list = useServerFn(ownerListAdProviders);
  const save = useServerFn(ownerSaveAdProvider);
  const del = useServerFn(ownerDeleteAdProvider);
  const qc = useQueryClient();

  const { data: rows = [] } = useQuery({ queryKey: ["ad-providers", tenantId], queryFn: () => list({ data: { tenantId } }) });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const kindDef = KINDS.find((k) => k.id === form.kind)!;

  const m = useMutation({
    mutationFn: () => save({ data: { tenantId, provider: {
      ...form, reward_tokens: Number(form.reward_tokens)||0, daily_cap: Number(form.daily_cap)||0, sort_order: Number(form.sort_order)||0,
    } } }),
    onSuccess: () => { toast.success("Saved"); setOpen(false); setForm(EMPTY); qc.invalidateQueries({ queryKey: ["ad-providers", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const dm = useMutation({
    mutationFn: (id: string) => del({ data: { tenantId, providerId: id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["ad-providers", tenantId] }); },
  });

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ad providers</h1>
          <p className="text-sm text-muted-foreground">Add one or more networks. The mini app picks a live one at random per slot.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(EMPTY); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Add provider</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit" : "New"} ad provider</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Network</Label>
                <select className="w-full border rounded-md h-10 px-2 bg-background" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, config: {} })}>
                  {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>
              <div><Label>Label (shown to admin)</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
              {kindDef.fields.map((f) => (
                <div key={f}><Label>{f.replace(/_/g, " ")}</Label><Input value={form.config?.[f] ?? ""} onChange={(e) => setForm({ ...form, config: { ...form.config, [f]: e.target.value } })} /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Reward (tokens)</Label><Input type="number" value={form.reward_tokens} onChange={(e) => setForm({ ...form, reward_tokens: e.target.value })} /></div>
                <div><Label>Daily cap</Label><Input type="number" value={form.daily_cap} onChange={(e) => setForm({ ...form, daily_cap: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Active</label>
            </div>
            <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">No ad providers configured yet.</div>
      ) : (
        <div className="border rounded-lg divide-y">
          {rows.map((p: any) => (
            <div key={p.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{p.label} <span className="text-xs uppercase text-muted-foreground ml-2">{p.kind}</span> {!p.active && <span className="text-xs text-destructive ml-2">off</span>}</div>
                <div className="text-xs text-muted-foreground">+{p.reward_tokens} tokens · cap {p.daily_cap}/day · {Object.entries(p.config).map(([k,v]) => `${k}=${v}`).join(" · ") || "no config"}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setForm(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => confirm(`Delete ${p.label}?`) && dm.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
