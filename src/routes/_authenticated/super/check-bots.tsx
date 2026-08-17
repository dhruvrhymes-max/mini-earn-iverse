import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCheckBots, saveCheckBot, deleteCheckBot, listAllTenants } from "@/lib/super.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super/check-bots")({
  component: CheckBots,
  head: () => ({
    meta: [
      { title: "Check bots — Platform control" },
      { name: "description", content: "Create verification bots that enforce channel and group joins across mini apps." },
      { property: "og:title", content: "Check bots — Platform control" },
      { property: "og:description", content: "Create verification bots that enforce channel and group joins across mini apps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const BLANK = { id: null as string | null, tenant_id: null as string | null, label: "", bot_token: "", channels: [] as any[], active: true };

function CheckBots() {
  const list = useServerFn(listCheckBots);
  const save = useServerFn(saveCheckBot);
  const del = useServerFn(deleteCheckBot);
  const tenantsFn = useServerFn(listAllTenants);
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any | null>(null);

  const { data: rows = [] } = useQuery({ queryKey: ["check-bots"], queryFn: () => list() });
  const { data: tenants = [] } = useQuery({ queryKey: ["all-tenants"], queryFn: () => tenantsFn() });

  const m = useMutation({
    mutationFn: (v: any) => save({ data: { ...v, channels: v.channels.filter((c: any) => c.url?.trim()) } }),
    onSuccess: (r: any) => { setEdit(null); qc.invalidateQueries({ queryKey: ["check-bots"] }); toast.success(`Saved @${r.bot_username ?? "bot"}`); },
    onError: (e: any) => toast.error(e.message),
  });
  const d = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["check-bots"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Check bots</h1>
        {!edit && <Button onClick={() => setEdit({ ...BLANK })}><Plus className="h-4 w-4 mr-1" /> New check bot</Button>}
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        A check bot is added as admin on the channels or groups a mini app requires. Members must join them before the app unlocks.
      </p>

      {edit && (
        <div className="border rounded-xl p-5 space-y-4 mb-6">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Bot token</Label>
              <Input type="password" value={edit.bot_token} onChange={(e) => setEdit({ ...edit, bot_token: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Applies to</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={edit.tenant_id ?? ""}
                onChange={(e) => setEdit({ ...edit, tenant_id: e.target.value || null })}>
                <option value="">All bots</option>
                {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Required channels / groups</Label>
            {edit.channels.map((c: any, i: number) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Title" value={c.title ?? ""} onChange={(e) => setEdit({ ...edit, channels: edit.channels.map((x: any, j: number) => j === i ? { ...x, title: e.target.value } : x) })} />
                <Input placeholder="https://t.me/…" value={c.url ?? ""} onChange={(e) => setEdit({ ...edit, channels: edit.channels.map((x: any, j: number) => j === i ? { ...x, url: e.target.value } : x) })} />
                <Input placeholder="@chat_id" value={c.chat_id ?? ""} onChange={(e) => setEdit({ ...edit, channels: edit.channels.map((x: any, j: number) => j === i ? { ...x, chat_id: e.target.value } : x) })} />
                <Button variant="ghost" size="icon" onClick={() => setEdit({ ...edit, channels: edit.channels.filter((_: any, j: number) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {edit.channels.length < 6 && (
              <Button variant="outline" size="sm" onClick={() => setEdit({ ...edit, channels: [...edit.channels, { title: "", url: "", chat_id: "" }] })}>
                <Plus className="h-4 w-4 mr-1" /> Add channel
              </Button>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active
          </label>

          <div className="flex gap-2">
            <Button onClick={() => m.mutate(edit)} disabled={m.isPending}>Save check bot</Button>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r: any) => (
          <div key={r.id} className="border rounded-lg p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{r.label} {r.bot_username && <span className="text-muted-foreground text-sm">@{r.bot_username}</span>}</div>
              <div className="text-xs text-muted-foreground">
                {r.tenants?.name ?? "All bots"} · {(r.channels as any[])?.length ?? 0} channels · {r.active ? "active" : "off"}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEdit({ ...BLANK, ...r, bot_token: "", channels: r.channels ?? [] })}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => d.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No check bots yet.</p>}
      </div>
    </div>
  );
}
