import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenant, updateTenant } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/channels")({
  component: Channels,
});

type Ch = { title: string; url: string; chat_id?: string };

const DEFAULTS = {
  enabled: false,
  require_join: false,
  title: "Welcome!",
  text: "Join our community to get started.",
  image_url: "",
  channels: [] as Ch[],
};

function Channels() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/channels" });
  const get = useServerFn(getTenant);
  const upd = useServerFn(updateTenant);
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ["tenant", tenantId], queryFn: () => get({ data: { id: tenantId } }) });
  const [form, setForm] = useState(DEFAULTS);

  useEffect(() => {
    if (t) setForm({ ...DEFAULTS, ...((t as any).onboarding ?? {}) });
  }, [t]);

  const m = useMutation({
    mutationFn: () =>
      upd({
        data: {
          id: tenantId,
          patch: {
            onboarding: {
              ...form,
              channels: form.channels.filter((c) => c.url?.trim() || c.chat_id?.trim()),
            },
          },
        },
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenant", tenantId] }); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!t) return null;
  const ch = form.channels ?? [];
  const setCh = (next: Ch[]) => setForm({ ...form, channels: next });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Check channels</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Members must join these channels or groups before the mini app unlocks. The platform check bot must be an
          admin of each chat for verification to work.
        </p>
      </div>

      <div className="space-y-4 border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <Label>Show welcome screen on first open</Label>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Require joining before playing</Label>
          <Switch checked={form.require_join} onCheckedChange={(v) => setForm({ ...form, require_join: v })} />
        </div>
        <div className="space-y-1">
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Message</Label>
          <Textarea rows={3} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Image URL</Label>
          <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
      </div>

      <div className="space-y-3 border rounded-xl p-5">
        <Label>Required channels / groups</Label>
        {ch.map((c, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_1fr_auto] gap-2">
            <Input placeholder="Title" value={c.title ?? ""} onChange={(e) => setCh(ch.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
            <Input placeholder="https://t.me/…" value={c.url ?? ""} onChange={(e) => setCh(ch.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
            <Input placeholder="@chat_id or -100…" value={c.chat_id ?? ""} onChange={(e) => setCh(ch.map((x, j) => j === i ? { ...x, chat_id: e.target.value } : x))} />
            <Button variant="ghost" size="icon" onClick={() => setCh(ch.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {ch.length < 6 && (
          <Button variant="outline" size="sm" onClick={() => setCh([...ch, { title: "", url: "", chat_id: "" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add channel
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Chat ID is used for the join check — use @username for public chats or the numeric -100… ID for private ones.
        </p>
      </div>

      <Button onClick={() => m.mutate()} disabled={m.isPending}>Save</Button>
    </div>
  );
}
