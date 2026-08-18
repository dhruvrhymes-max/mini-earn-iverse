import { createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getPayoutSettings, savePayoutSettings } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/payout-settings")({
  head: () => ({
    meta: [
      { title: "Payout Settings | ZeroLabNetwork" },
      { name: "description", content: "Configure secure blockchain payouts and payment-channel notifications." },
      { property: "og:title", content: "Payout Settings | ZeroLabNetwork" },
      { property: "og:description", content: "Configure secure blockchain payouts and payment-channel notifications." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayoutSettings,
});

function PayoutSettings() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/payout-settings" });
  const get = useServerFn(getPayoutSettings);
  const save = useServerFn(savePayoutSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["payout-settings", tenantId], queryFn: () => get({ data: { tenantId } }) });
  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (data) setForm(JSON.parse(JSON.stringify(data))); }, [data]);
  const mutation = useMutation({
    mutationFn: () => save({ data: { tenantId, payout: { bep20: clean(form.bep20), polygon: clean(form.polygon), ton: { endpoint: form.ton.endpoint, explorer: form.ton.explorer, api_key: form.ton.api_key, phrase: form.ton.phrase || null } }, proof: form.proof } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payout-settings", tenantId] }); toast.success("Payout settings saved"); },
    onError: (error: any) => toast.error(error.message),
  });
  if (!form) return <p className="text-muted-foreground">Loading…</p>;
  const setNet = (key: "bep20" | "polygon", field: string, value: any) => setForm({ ...form, [key]: { ...form[key], [field]: value } });
  return <div className="max-w-2xl space-y-6 pb-12">
    <div><h1 className="text-2xl font-bold">Payout settings</h1><p className="text-sm text-muted-foreground mt-1">Each token uses its own network, RPC, contract, and encrypted signing key.</p></div>
    {(["bep20", "polygon"] as const).map((key) => <section key={key} className="space-y-3 border-b pb-6">
      <h2 className="font-semibold">{key === "bep20" ? "USDT BEP20" : "USDT POL"}</h2>
      <div className="grid sm:grid-cols-2 gap-3"><Field label="Chain ID"><Input type="number" value={form[key].chain_id} onChange={(e) => setNet(key, "chain_id", e.target.value)} /></Field><Field label="Decimals"><Input type="number" value={form[key].decimals} onChange={(e) => setNet(key, "decimals", e.target.value)} /></Field></div>
      <Field label="RPC URL"><Input value={form[key].rpc_url} onChange={(e) => setNet(key, "rpc_url", e.target.value)} /></Field>
      <Field label="USDT contract"><Input value={form[key].contract} onChange={(e) => setNet(key, "contract", e.target.value)} /></Field>
      <Field label="Explorer transaction base"><Input value={form[key].explorer} onChange={(e) => setNet(key, "explorer", e.target.value)} /></Field>
      <Field label={`Private key ${form[key].key_preview ? `(saved ${form[key].key_preview})` : "(not set)"}`}><Input type="password" value={form[key].private_key ?? ""} placeholder="Enter to replace" onChange={(e) => setNet(key, "private_key", e.target.value)} /></Field>
    </section>)}
    <section className="space-y-3 border-b pb-6"><h2 className="font-semibold">GRAM (TON)</h2><Field label={`Tonkeeper phrase ${form.ton.phrase_preview ? `(saved ${form.ton.phrase_preview})` : "(not set)"}`}><Textarea rows={2} value={form.ton.phrase ?? ""} placeholder="Enter to replace" onChange={(e) => setForm({ ...form, ton: { ...form.ton, phrase: e.target.value } })} /></Field><Field label="TON RPC endpoint"><Input value={form.ton.endpoint} onChange={(e) => setForm({ ...form, ton: { ...form.ton, endpoint: e.target.value } })} /></Field><Field label="Optional TON API key"><Input value={form.ton.api_key} onChange={(e) => setForm({ ...form, ton: { ...form.ton, api_key: e.target.value } })} /></Field><Field label="Explorer transaction base"><Input value={form.ton.explorer} onChange={(e) => setForm({ ...form, ton: { ...form.ton, explorer: e.target.value } })} /></Field></section>
    <section className="space-y-3"><h2 className="font-semibold">Payment channel</h2><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.proof.enabled} onChange={(e) => setForm({ ...form, proof: { ...form.proof, enabled: e.target.checked } })} /> Post requested and paid logs</label><Field label="Channel ID or @username"><Input value={form.proof.channel_id} onChange={(e) => setForm({ ...form, proof: { ...form.proof, channel_id: e.target.value } })} /></Field><Field label="Message template"><Textarea rows={7} value={form.proof.template} onChange={(e) => setForm({ ...form, proof: { ...form.proof, template: e.target.value } })} /></Field></section>
    <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save payout settings"}</Button>
  </div>;
}

function clean(value: any) { return { chain_label: value.chain_label, chain_id: Number(value.chain_id), rpc_url: value.rpc_url, contract: value.contract, explorer: value.explorer, decimals: Number(value.decimals), private_key: value.private_key || null }; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1"><Label>{label}</Label>{children}</div>; }