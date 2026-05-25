import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAnnouncements, createAnnouncement, toggleAnnouncement } from "@/lib/super.functions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/super/announcements")({
  component: Ann,
});

function Ann() {
  const list = useServerFn(listAnnouncements);
  const create = useServerFn(createAnnouncement);
  const toggle = useServerFn(toggleAnnouncement);
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["ann"] });
  const { data: rows = [] } = useQuery({ queryKey: ["ann"], queryFn: () => list() });
  const m = useMutation({ mutationFn: (msg: string) => create({ data: { message: msg, severity: "info" } }), onSuccess: () => { inv(); setMsg(""); } });
  const t = useMutation({ mutationFn: (v: any) => toggle({ data: v }), onSuccess: inv });
  const [msg, setMsg] = useState("");
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Global Announcements</h1>
      <form onSubmit={(e) => { e.preventDefault(); if (msg) m.mutate(msg); }} className="space-y-3 mb-6">
        <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message shown to all bot admins" />
        <Button type="submit" disabled={m.isPending}>Publish</Button>
      </form>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="border rounded p-3 flex items-center gap-3">
            <span className="flex-1">{r.message}</span>
            <Switch checked={r.active} onCheckedChange={(v) => t.mutate({ id: r.id, active: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}
