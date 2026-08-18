import { useState } from "react";
import { MINER_ICON_PRESETS } from "@/lib/icon-presets";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListMiners, adminSaveMiner, adminDeleteMiner } from "@/lib/miners.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Props = { tenantId: string; initData: string | null; previewTgId: number | null; tokenSymbol: string };

const BLANK = {
  id: null as string | null,
  name: "",
  emoji: "🧁",
  image_url: "",
  description: "",
  rarity: "common",
  currency: "token",
  price_tokens: 0,
  price_ton: 0,
  rate_boost_per_hour: 10,
  duration_hours: 0,
  is_free: false,
  active: true,
  sort_order: 0,
};

export function BakesAdmin({ tenantId, initData, previewTgId, tokenSymbol }: Props) {
  const list = useServerFn(adminListMiners);
  const save = useServerFn(adminSaveMiner);
  const del = useServerFn(adminDeleteMiner);
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any | null>(null);

  const auth = { tenantId, initData, previewTgId: initData ? null : previewTgId };
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-bakes", tenantId],
    queryFn: () => list({ data: auth }),
  });

  const m = useMutation({
    mutationFn: (miner: any) =>
      save({
        data: {
          ...auth,
          miner: {
            ...miner,
            image_url: miner.image_url?.trim() ? miner.image_url.trim() : null,
            description: miner.description?.trim() ? miner.description.trim() : null,
            price_tokens: Number(miner.price_tokens) || 0,
            price_ton: Number(miner.price_ton) || 0,
            rate_boost_per_hour: Number(miner.rate_boost_per_hour) || 0,
            duration_hours: Number(miner.duration_hours) || 0,
            sort_order: Number(miner.sort_order) || 0,
          },
        },
      }),
    onSuccess: () => { setEdit(null); qc.invalidateQueries({ queryKey: ["admin-bakes", tenantId] }); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const d = useMutation({
    mutationFn: (minerId: string) => del({ data: { ...auth, minerId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-bakes", tenantId] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      {rows.map((r: any) => (
        <div key={r.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
          <div className="text-2xl">{r.emoji || "🧁"}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{r.name}</div>
            <div className="text-xs text-white/50">
              {r.is_free ? "Free" : r.currency === "ton" ? `${r.price_ton} TON` : `${r.price_tokens} ${tokenSymbol}`}
              {" · "}+{r.rate_boost_per_hour}/h{r.duration_hours ? ` · ${r.duration_hours}h` : " · forever"}
              {!r.active && " · off"}
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setEdit({ ...BLANK, ...r })}>Edit</Button>
          <button className="p-2 text-white/40" onClick={() => d.mutate(r.id)}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}

      {!edit && (
        <Button variant="outline" className="w-full" onClick={() => setEdit({ ...BLANK, sort_order: rows.length })}>
          <Plus className="h-4 w-4 mr-1" /> Add bake
        </Button>
      )}

      {edit && (
        <div className="bg-white/5 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Emoji"><Input value={edit.emoji ?? ""} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} /></Field>
          </div>
          <Field label="Icon / logo">
            <div className="flex flex-wrap gap-2 mb-2">
              {MINER_ICON_PRESETS.map((p) => (
                <button key={p.label} type="button" title={p.label} onClick={() => setEdit({ ...edit, image_url: p.url })}
                  className={`h-9 w-9 rounded-full overflow-hidden border-2 ${edit.image_url === p.url ? "border-white" : "border-transparent"}`}>
                  <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <Input value={edit.image_url ?? ""} onChange={(e) => setEdit({ ...edit, image_url: e.target.value })} placeholder="https://… or pick above" />
          </Field>
          <Field label="Description"><Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Rarity">
              <select className="w-full bg-white/10 rounded-md px-3 py-2 text-sm" value={edit.rarity}
                onChange={(e) => setEdit({ ...edit, rarity: e.target.value })}>
                {["common", "rare", "epic", "legendary"].map((r) => <option key={r} value={r} className="bg-neutral-900">{r}</option>)}
              </select>
            </Field>
            <Field label="Pay with">
              <select className="w-full bg-white/10 rounded-md px-3 py-2 text-sm" value={edit.currency}
                onChange={(e) => setEdit({ ...edit, currency: e.target.value })}>
                <option value="token" className="bg-neutral-900">{tokenSymbol} (in-game)</option>
                <option value="ton" className="bg-neutral-900">TON</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Price (${tokenSymbol})`}>
              <Input type="number" value={edit.price_tokens} onChange={(e) => setEdit({ ...edit, price_tokens: e.target.value })} />
            </Field>
            <Field label="Price (TON)">
              <Input type="number" step="0.01" value={edit.price_ton} onChange={(e) => setEdit({ ...edit, price_ton: e.target.value })} />
            </Field>
            <Field label="Boost / hour">
              <Input type="number" value={edit.rate_boost_per_hour} onChange={(e) => setEdit({ ...edit, rate_boost_per_hour: e.target.value })} />
            </Field>
            <Field label="Duration (h, 0 = forever)">
              <Input type="number" value={edit.duration_hours} onChange={(e) => setEdit({ ...edit, duration_hours: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!edit.is_free} onChange={(e) => setEdit({ ...edit, is_free: e.target.checked })} /> Free starter
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active
            </label>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => m.mutate(edit)} disabled={m.isPending}>Save bake</Button>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
