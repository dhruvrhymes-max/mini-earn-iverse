import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListPromos, adminSavePromo, adminDeletePromo } from "@/lib/promo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Ticket } from "lucide-react";

type Props = { tenantId: string; initData: string | null; previewTgId: number | null };

const BLANK = { id: null as string | null, code: "", reward: 100, max_uses: 100, active: true, expires_at: "" };

export function PromosAdmin({ tenantId, initData, previewTgId }: Props) {
  const auth = { tenantId, initData, previewTgId: initData ? null : previewTgId };
  const list = useServerFn(adminListPromos);
  const save = useServerFn(adminSavePromo);
  const del = useServerFn(adminDeletePromo);
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(BLANK);

  const { data: promos = [] } = useQuery({ queryKey: ["admin-promos", tenantId], queryFn: () => list({ data: auth }) });

  const saveM = useMutation({
    mutationFn: () => save({ data: { ...auth, promo: {
      id: form.id, code: form.code, reward: Number(form.reward) || 0,
      max_uses: Number(form.max_uses) || 1, active: !!form.active,
      expires_at: form.expires_at || null,
    } } }),
    onSuccess: () => { toast.success("Saved"); setForm(BLANK); qc.invalidateQueries({ queryKey: ["admin-promos", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (promoId: string) => del({ data: { ...auth, promoId } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-promos", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {(promos as any[]).map((p) => (
          <div key={p.id} className="rounded-2xl px-3 py-2 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Ticket className="h-4 w-4 text-white/40" />
            <div className="flex-1 min-w-0">
              <p className="font-mono font-bold text-sm">{p.code}</p>
              <p className="text-[11px] text-white/50">
                {Number(p.reward)} reward · {p.uses}/{p.max_uses} claimed{p.active ? "" : " · paused"}
                {p.expires_at ? ` · until ${new Date(p.expires_at).toLocaleDateString()}` : ""}
              </p>
            </div>
            <button className="text-white/50 text-xs underline" onClick={() => setForm({
              id: p.id, code: p.code, reward: Number(p.reward), max_uses: p.max_uses,
              active: p.active, expires_at: p.expires_at ? String(p.expires_at).slice(0, 10) : "",
            })}>Edit</button>
            <button className="p-2 text-white/40" onClick={() => delM.mutate(p.id)}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {(promos as any[]).length === 0 && <p className="text-sm text-white/40">No promo codes yet.</p>}
      </div>

      <div className="space-y-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <p className="text-xs uppercase tracking-widest text-white/50">{form.id ? "Edit code" : "New code"}</p>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Code</Label><Input value={form.code} placeholder="WELCOME50" onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
          <div><Label className="text-xs">Reward (tokens)</Label><Input type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} /></div>
          <div><Label className="text-xs">Max users</Label><Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></div>
          <div><Label className="text-xs">Expires (optional)</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active
        </label>
        <div className="flex gap-2">
          <Button size="sm" disabled={saveM.isPending || !form.code} onClick={() => saveM.mutate()}>
            <Plus className="h-4 w-4 mr-1" />{form.id ? "Save changes" : "Create code"}
          </Button>
          {form.id && <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>Cancel</Button>}
        </div>
        <p className="text-[11px] text-white/40">Each person can claim a code once. Rewards are credited instantly to their in-game balance.</p>
      </div>
    </div>
  );
}
