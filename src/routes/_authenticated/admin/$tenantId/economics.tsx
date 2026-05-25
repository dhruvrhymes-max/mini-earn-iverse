import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenant, updateTenant } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/economics")({
  component: Economics,
});

function Economics() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/economics" });
  const get = useServerFn(getTenant);
  const upd = useServerFn(updateTenant);
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ["tenant", tenantId], queryFn: () => get({ data: { id: tenantId } }) });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (t) setForm({ ...(t.economics as any) }); }, [t]);
  const m = useMutation({
    mutationFn: () => upd({ data: { id: tenantId, patch: { economics: form } } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenant", tenantId] }); toast.success("Saved"); },
  });
  if (!t) return null;
  const usdt = form.token_per_usdt ? (1 / form.token_per_usdt).toFixed(6) : "—";
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Economics</h1>
      <div className="space-y-4">
        <Field label="Tokens per 1 USDT"><Input type="number" value={form.token_per_usdt ?? ""} onChange={(e) => setForm({ ...form, token_per_usdt: Number(e.target.value) })} /></Field>
        <p className="text-sm text-muted-foreground">→ 1 token = {usdt} USDT</p>
        <Field label="Minimum withdrawal (USDT)"><Input type="number" step="0.01" value={form.min_withdraw_usdt ?? ""} onChange={(e) => setForm({ ...form, min_withdraw_usdt: Number(e.target.value) })} /></Field>
        <Field label="Mining rate (tokens/hour)"><Input type="number" value={form.mining_rate_per_hour ?? ""} onChange={(e) => setForm({ ...form, mining_rate_per_hour: Number(e.target.value) })} /></Field>
        <Field label="Mining cycle (hours)"><Input type="number" value={form.mining_cycle_hours ?? ""} onChange={(e) => setForm({ ...form, mining_cycle_hours: Number(e.target.value) })} /></Field>
        <Button onClick={() => m.mutate()} disabled={m.isPending}>Save</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
