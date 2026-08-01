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

type FieldDef = { name: string; label: string; kind?: "text" | "textarea"; placeholder?: string };
const KINDS: { id: string; label: string; hint: string; fields: FieldDef[] }[] = [
  { id: "monetag", label: "Monetag (rewarded)", hint: "Paste your Monetag zone ID.", fields: [{ name: "zone_id", label: "Zone ID", placeholder: "1234567" }] },
  { id: "adsgram", label: "Adsgram", hint: "Paste your Adsgram block ID.", fields: [{ name: "block_id", label: "Block ID", placeholder: "int-1234" }] },
  { id: "onclicka", label: "Onclicka", hint: "Paste your Onclicka spot/zone ID.", fields: [{ name: "zone_id", label: "Zone / Spot ID", placeholder: "123456" }] },
  { id: "direct_link", label: "Direct link (smart link)", hint: "User opens the link, gets rewarded after the wait time.", fields: [
    { name: "url", label: "Direct link URL", placeholder: "https://…" },
    { name: "wait_seconds", label: "Reward after (seconds)", placeholder: "5" },
  ] },
  { id: "ao_code", label: "AO code / HTML snippet", hint: "Paste the ad network's raw code. Scripts inside run automatically.", fields: [
    { name: "code", label: "Ad code (HTML / JS)", kind: "textarea", placeholder: "<script src='…'></script>" },
    { name: "show_function", label: "Show function name (optional)", placeholder: "show_1234567" },
    { name: "selector", label: "CSS selector to mount into (optional)", placeholder: "#ad-container" },
    { name: "css", label: "Custom CSS (optional)", kind: "textarea", placeholder: ".ad-slot-mount iframe { width:100%; }" },
    { name: "wait_seconds", label: "Reward after (seconds)", placeholder: "3" },
  ] },
  { id: "custom", label: "Custom script URL", hint: "External SDK URL plus optional zone and CSS.", fields: [
    { name: "script_url", label: "Script URL", placeholder: "//cdn.network.com/sdk.js" },
    { name: "zone_id", label: "Zone ID (optional)" },
    { name: "show_function", label: "Show function name (optional)" },
    { name: "css", label: "Custom CSS (optional)", kind: "textarea" },
  ] },
];

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
              <p className="text-xs text-muted-foreground -mt-2">{kindDef.hint}</p>
              <div><Label>Label (shown to users)</Label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Watch & earn" /></div>
              {kindDef.fields.map((f) => (
                <div key={f.name}>
                  <Label>{f.label}</Label>
                  {f.kind === "textarea" ? (
                    <Textarea rows={5} className="font-mono text-xs" placeholder={f.placeholder} value={form.config?.[f.name] ?? ""} onChange={(e) => setForm({ ...form, config: { ...form.config, [f.name]: e.target.value } })} />
                  ) : (
                    <Input placeholder={f.placeholder} value={form.config?.[f.name] ?? ""} onChange={(e) => setForm({ ...form, config: { ...form.config, [f.name]: e.target.value } })} />
                  )}
                </div>
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
