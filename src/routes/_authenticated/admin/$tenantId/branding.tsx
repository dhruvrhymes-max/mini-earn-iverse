import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenant, updateTenant } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/branding")({
  component: Branding,
});

function Branding() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/branding" });
  const get = useServerFn(getTenant);
  const upd = useServerFn(updateTenant);
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ["tenant", tenantId], queryFn: () => get({ data: { id: tenantId } }) });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (t) setForm({
    token_name: t.token_name, token_symbol: t.token_symbol, action_verb: t.action_verb,
    token_icon_url: t.token_icon_url ?? "",
    primary: (t.theme as any).primary, background: (t.theme as any).background, accent: (t.theme as any).accent,
  }); }, [t]);
  const m = useMutation({
    mutationFn: () => upd({ data: { id: tenantId, patch: {
      token_name: form.token_name, token_symbol: form.token_symbol, action_verb: form.action_verb,
      token_icon_url: form.token_icon_url || null,
      theme: { primary: form.primary, background: form.background, accent: form.accent },
    }}}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenant", tenantId] }); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  if (!t) return null;
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Branding & Theme</h1>
      <div className="space-y-4">
        <Field label="Token name"><Input value={form.token_name ?? ""} onChange={(e) => setForm({ ...form, token_name: e.target.value })} /></Field>
        <Field label="Token symbol"><Input value={form.token_symbol ?? ""} onChange={(e) => setForm({ ...form, token_symbol: e.target.value })} /></Field>
        <Field label="Action verb (Mine / Fish / Wood)"><Input value={form.action_verb ?? ""} onChange={(e) => setForm({ ...form, action_verb: e.target.value })} /></Field>
        <Field label="Token icon URL"><Input value={form.token_icon_url ?? ""} onChange={(e) => setForm({ ...form, token_icon_url: e.target.value })} placeholder="https://…" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Primary"><Input type="color" value={form.primary ?? "#f59e0b"} onChange={(e) => setForm({ ...form, primary: e.target.value })} /></Field>
          <Field label="Background"><Input type="color" value={form.background ?? "#0a0a0a"} onChange={(e) => setForm({ ...form, background: e.target.value })} /></Field>
          <Field label="Accent"><Input type="color" value={form.accent ?? "#fbbf24"} onChange={(e) => setForm({ ...form, accent: e.target.value })} /></Field>
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending}>Save</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
