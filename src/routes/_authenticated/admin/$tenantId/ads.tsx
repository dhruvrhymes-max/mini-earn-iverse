import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenant, updateTenant } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/ads")({
  component: Ads,
});

function Ads() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/ads" });
  const get = useServerFn(getTenant);
  const upd = useServerFn(updateTenant);
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ["tenant", tenantId], queryFn: () => get({ data: { id: tenantId } }) });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (t) setForm({ ...(t.ad_config as any) }); }, [t]);
  const m = useMutation({
    mutationFn: () => upd({ data: { id: tenantId, patch: { ad_config: form } } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenant", tenantId] }); toast.success("Saved"); },
  });
  if (!t) return null;
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Ad Monetization</h1>
      <div className="space-y-4">
        <Field label="AdsGram Zone ID"><Input value={form.adsgram ?? ""} onChange={(e) => setForm({ ...form, adsgram: e.target.value })} /></Field>
        <Field label="Monetag Zone ID"><Input value={form.monetag ?? ""} onChange={(e) => setForm({ ...form, monetag: e.target.value })} /></Field>
        <Field label="Adexium Zone ID"><Input value={form.adexium ?? ""} onChange={(e) => setForm({ ...form, adexium: e.target.value })} /></Field>
        <Field label="Daily watch limit"><Input type="number" value={form.daily_watch_limit ?? 20} onChange={(e) => setForm({ ...form, daily_watch_limit: Number(e.target.value) })} /></Field>
        <div className="flex items-center justify-between">
          <Label>Startup interstitial ad</Label>
          <Switch checked={!!form.startup_ad_enabled} onCheckedChange={(v) => setForm({ ...form, startup_ad_enabled: v })} />
        </div>
        <Button onClick={() => m.mutate()} disabled={m.isPending}>Save</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
