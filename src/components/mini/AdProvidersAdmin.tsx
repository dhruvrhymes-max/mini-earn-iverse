import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { tgListAdProviders, tgSaveAdProvider, tgDeleteAdProvider } from "@/lib/ad-providers.functions";
import { AD_KINDS, EMPTY_AD_PROVIDER } from "@/lib/ad-kinds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X } from "lucide-react";

export function AdProvidersAdmin({
  tenantId,
  initData,
  previewTgId,
}: {
  tenantId: string;
  initData: string | null;
  previewTgId?: number | null;
}) {
  const list = useServerFn(tgListAdProviders);
  const save = useServerFn(tgSaveAdProvider);
  const del = useServerFn(tgDeleteAdProvider);
  const qc = useQueryClient();
  const auth = { tenantId, initData, previewTgId: previewTgId ?? null };

  const { data: rows = [] } = useQuery({
    queryKey: ["tg-ad-providers", tenantId],
    queryFn: () => list({ data: auth }) as Promise<any[]>,
  });

  const [form, setForm] = useState<any | null>(null);
  const kindDef = AD_KINDS.find((k) => k.id === form?.kind) ?? AD_KINDS[0]!;

  const m = useMutation({
    mutationFn: () =>
      save({ data: { ...auth, provider: {
        ...form,
        reward_tokens: Number(form.reward_tokens) || 0,
        daily_cap: Number(form.daily_cap) || 0,
        sort_order: Number(form.sort_order) || 0,
      } } }),
    onSuccess: () => { toast.success("Ad saved — it's live in the bot"); setForm(null); qc.invalidateQueries({ queryKey: ["tg-ad-providers", tenantId] }); qc.invalidateQueries({ queryKey: ["ad-providers", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const dm = useMutation({
    mutationFn: (providerId: string) => del({ data: { ...auth, providerId } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["tg-ad-providers", tenantId] }); qc.invalidateQueries({ queryKey: ["ad-providers", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {rows.length === 0 && !form && <p className="text-sm text-white/50">No ad providers yet.</p>}
      {rows.map((p) => (
        <div key={p.id} className="bg-white/5 rounded-lg p-3 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.label} <span className="text-[10px] uppercase text-white/40 ml-1">{p.kind}</span>{!p.active && <span className="text-[10px] text-red-400 ml-1">off</span>}</p>
            <p className="text-xs text-white/50">+{p.reward_tokens} · cap {p.daily_cap}/day</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setForm({ ...EMPTY_AD_PROVIDER, ...p, config: p.config ?? {} })}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => dm.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}

      {form ? (
        <div className="bg-white/5 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{form.id ? "Edit ad" : "New ad"}</p>
            <Button size="icon" variant="ghost" onClick={() => setForm(null)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Network</Label>
            <select
              className="w-full h-10 rounded-md bg-black/40 border border-white/15 px-2 text-sm"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value, config: {} })}
            >
              {AD_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
            <p className="text-[11px] text-white/40">{kindDef.hint}</p>
          </div>
          <div className="space-y-1"><Label className="text-xs">Label shown to users</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Watch & earn" />
          </div>
          {kindDef.fields.map((f) => (
            <div key={f.name} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              {f.kind === "textarea" ? (
                <Textarea rows={4} className="font-mono text-xs" placeholder={f.placeholder} value={form.config?.[f.name] ?? ""} onChange={(e) => setForm({ ...form, config: { ...form.config, [f.name]: e.target.value } })} />
              ) : (
                <Input placeholder={f.placeholder} value={form.config?.[f.name] ?? ""} onChange={(e) => setForm({ ...form, config: { ...form.config, [f.name]: e.target.value } })} />
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Reward (tokens)</Label><Input type="number" value={form.reward_tokens} onChange={(e) => setForm({ ...form, reward_tokens: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Daily cap</Label><Input type="number" value={form.daily_cap} onChange={(e) => setForm({ ...form, daily_cap: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
          </label>
          <Button className="w-full" onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving…" : "Save ad"}</Button>
        </div>
      ) : (
        <Button variant="secondary" className="w-full" onClick={() => setForm({ ...EMPTY_AD_PROVIDER })}>
          <Plus className="h-4 w-4 mr-1" /> Add ad provider
        </Button>
      )}
    </div>
  );
}
