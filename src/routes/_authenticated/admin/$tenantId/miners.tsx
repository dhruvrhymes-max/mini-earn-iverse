import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ownerListMiners, ownerSaveMiner, ownerDeleteMiner } from "@/lib/miners.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { IconPicker } from "@/components/admin/IconPicker";
import { MINER_ICON_PRESETS } from "@/lib/icon-presets";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/miners")({
  component: MinersPage,
});

const EMPTY = { id: null as string|null, name: "", emoji: "⛏️", image_url: MINER_ICON_PRESETS[0].url, description: "", rarity: "common" as const,
  price_tokens: 1000, rate_boost_per_hour: 20, duration_hours: 0, is_free: false, active: true, sort_order: 0 };

function MinersPage() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/miners" });
  const list = useServerFn(ownerListMiners);
  const save = useServerFn(ownerSaveMiner);
  const del = useServerFn(ownerDeleteMiner);
  const qc = useQueryClient();

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: ["admin-miners", tenantId],
    queryFn: () => list({ data: { tenantId } }),
    retry: false,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);

  const m = useMutation({
    mutationFn: async () => {
      const p = { ...form,
        price_tokens: Number(form.price_tokens) || 0,
        rate_boost_per_hour: Number(form.rate_boost_per_hour) || 0,
        duration_hours: Number(form.duration_hours) || 0,
        sort_order: Number(form.sort_order) || 0,
        image_url: form.image_url?.trim() || null,
        description: form.description?.trim() || null,
      };
      return save({ data: { tenantId, miner: p } });
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setForm(EMPTY); qc.invalidateQueries({ queryKey: ["admin-miners", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const dm = useMutation({
    mutationFn: (id: string) => del({ data: { tenantId, minerId: id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-miners", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Miners</h1>
          <p className="text-sm text-muted-foreground">Bottles / boosters sold in the marketplace.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(EMPTY); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New miner</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{form.id ? "Edit miner" : "New miner"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Emoji</Label><Input value={form.emoji ?? ""} onChange={(e) => setForm({ ...form, emoji: e.target.value })} /></div>
              </div>
              <div><Label>Miner icon / logo</Label>
                <IconPicker
                  value={form.image_url}
                  onChange={(url: string) => setForm({ ...form, image_url: url })}
                  presets={MINER_ICON_PRESETS}
                  uploadPrefix="miner-icons"
                />
              </div>
              <div><Label>Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Rarity</Label>
                  <select className="w-full border rounded-md h-10 px-2 bg-background" value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })}>
                    {["common","rare","epic","legendary"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Price (tokens)</Label><Input type="number" value={form.price_tokens} onChange={(e) => setForm({ ...form, price_tokens: e.target.value })} /></div>
                <div><Label>Boost /hr</Label><Input type="number" value={form.rate_boost_per_hour} onChange={(e) => setForm({ ...form, rate_boost_per_hour: e.target.value })} /></div>
                <div><Label>Duration (h, 0=∞)</Label><Input type="number" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v })} /> Free (starter)</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Active</label>
              </div>
            </div>
            <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving…" : "Save"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <div className="rounded-lg border p-4 text-sm text-destructive">{(error as any).message} — the miners CRUD requires you to open this page from the Telegram bot admin panel, or you must be a global super-admin.</div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (rows as any[]).length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground text-sm">No miners yet — click "New miner".</div>
      ) : (
        <div className="border rounded-lg divide-y">
          {(rows as any[]).map((mn) => (
            <div key={mn.id} className="p-3 flex items-center gap-3">
              {mn.image_url ? <img src={mn.image_url} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xl">{mn.emoji ?? "⛏️"}</div>}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{mn.name} <span className="text-xs uppercase text-muted-foreground ml-2">{mn.rarity}</span></div>
                <div className="text-xs text-muted-foreground">{mn.is_free ? "FREE" : `${mn.price_tokens} tokens`} · +{mn.rate_boost_per_hour}/h · {mn.duration_hours > 0 ? `${mn.duration_hours}h` : "permanent"}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => { setForm({ ...mn }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => confirm(`Delete ${mn.name}?`) && dm.mutate(mn.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
