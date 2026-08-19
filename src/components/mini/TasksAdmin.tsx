import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { tgListTasks, tgSaveTask, tgDeleteTask, tgTaskChannelStatus } from "@/lib/bot-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, ShieldCheck, ShieldAlert } from "lucide-react";

type Props = { tenantId: string; initData: string | null; previewTgId: number | null; tokenSymbol: string };

const CATS = [
  { id: "social", label: "Social" },
  { id: "partner", label: "Partners" },
  { id: "watch", label: "Watch" },
] as const;

const empty = { id: null as string | null, title: "", url: "", reward: 100, daily_limit: 0, sort_order: 0 };

export function TasksAdmin({ tenantId, initData, previewTgId, tokenSymbol }: Props) {
  const auth = { tenantId, initData, previewTgId: initData ? null : previewTgId };
  const list = useServerFn(tgListTasks);
  const save = useServerFn(tgSaveTask);
  const del = useServerFn(tgDeleteTask);
  const status = useServerFn(tgTaskChannelStatus);
  const qc = useQueryClient();
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("social");
  const [form, setForm] = useState({ ...empty });

  const key = ["tg-tasks", tenantId];
  const { data: tasks = [], isLoading } = useQuery({ queryKey: key, queryFn: () => list({ data: auth }) });
  const { data: channelStatus = {} } = useQuery({
    queryKey: ["tg-task-channels", tenantId],
    queryFn: () => status({ data: auth }) as Promise<Record<string, string>>,
  });

  const m = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...auth,
          id: form.id,
          kind: cat,
          title: form.title,
          url: form.url,
          reward: Number(form.reward) || 0,
          daily_limit: Math.max(0, Math.floor(Number(form.daily_limit) || 0)),
          sort_order: Math.max(0, Math.floor(Number(form.sort_order) || 0)),
        },
      }),
    onSuccess: () => { toast.success("Saved"); setForm({ ...empty }); qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["tg-task-channels", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const dm = useMutation({
    mutationFn: (id: string) => del({ data: { ...auth, id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast.error(e.message),
  });

  const rows = (tasks as any[]).filter((t) => t.kind === cat);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCat(c.id); setForm({ ...empty }); }}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${cat === c.id ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="bg-white/5 rounded-xl p-3 space-y-2">
        <div className="space-y-1"><Label className="text-xs">Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Join our channel" /></div>
        <div className="space-y-1"><Label className="text-xs">Link {cat !== "watch" && "(t.me channel/group)"}</Label>
          <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://t.me/yourchannel" /></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1"><Label className="text-xs">Reward</Label>
            <Input type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label className="text-xs">Per day (0=once)</Label>
            <Input type="number" value={form.daily_limit} onChange={(e) => setForm({ ...form, daily_limit: Number(e.target.value) })} /></div>
          <div className="space-y-1"><Label className="text-xs">Order</Label>
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
        </div>
        <Button className="w-full" onClick={() => m.mutate()} disabled={!form.title.trim() || m.isPending}>
          <Plus className="h-4 w-4 mr-1" />{form.id ? "Update task" : `Add ${CATS.find((c) => c.id === cat)!.label} task`}
        </Button>
        {form.id && <Button variant="secondary" className="w-full" onClick={() => setForm({ ...empty })}>Cancel edit</Button>}
      </div>

      {isLoading && <p className="text-xs text-white/40">Loading tasks…</p>}
      <div className="space-y-2">
        {rows.map((t) => {
          const st = channelStatus[t.id];
          return (
            <div key={t.id} className="bg-white/5 rounded-lg p-3 space-y-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.title}</p>
                  <p className="text-xs text-white/40 truncate">+{t.reward} {tokenSymbol}{t.url ? ` · ${t.url}` : ""}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => dm.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {cat !== "watch" && st && (
                <p className={`flex items-center gap-1 text-[11px] ${st === "verifiable" ? "text-green-400" : "text-amber-400"}`}>
                  {st === "verifiable"
                    ? <><ShieldCheck className="h-3.5 w-3.5" /> Membership check active</>
                    : st === "no_admin"
                      ? <><ShieldAlert className="h-3.5 w-3.5" /> Make the check bot an admin of this channel to verify joins</>
                      : <><ShieldAlert className="h-3.5 w-3.5" /> No Telegram channel link — claims are not verified</>}
                </p>
              )}
              <button className="text-[11px] text-white/50 underline" onClick={() => setForm({ id: t.id, title: t.title, url: t.url ?? "", reward: Number(t.reward), daily_limit: Number(t.daily_limit ?? 0), sort_order: Number(t.sort_order ?? 0) })}>
                Edit
              </button>
            </div>
          );
        })}
        {!isLoading && rows.length === 0 && <p className="text-xs text-white/40">No {cat} tasks yet.</p>}
      </div>
    </div>
  );
}
