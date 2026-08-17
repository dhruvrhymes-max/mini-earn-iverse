import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenant, updateTenant } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/$tenantId/referrals")({
  component: Referrals,
});

const DEFAULTS = {
  signup_reward: 0,
  inviter_reward: 50,
  lifetime_pct: 20,
  require_activity: true,
  activity_types: ["mine", "task", "ad"] as string[],
  daily_cap: 20,
  weekly_cap: 200,
};

const ACTIVITIES = [
  { key: "mine", label: "First mining claim" },
  { key: "task", label: "Completing any task" },
  { key: "ad", label: "Watching one ad" },
] as const;

function Referrals() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/referrals" });
  const get = useServerFn(getTenant);
  const upd = useServerFn(updateTenant);
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ["tenant", tenantId], queryFn: () => get({ data: { id: tenantId } }) });
  const [form, setForm] = useState<typeof DEFAULTS>(DEFAULTS);

  useEffect(() => {
    if (t) setForm({ ...DEFAULTS, ...((t as any).referral_config ?? {}) });
  }, [t]);

  const m = useMutation({
    mutationFn: () => upd({ data: { id: tenantId, patch: { referral_config: form } } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenant", tenantId] }); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!t) return null;
  const tokenSymbol = (t as any).token_symbol || "TKN";

  const toggleActivity = (key: string) => {
    setForm((f) => ({
      ...f,
      activity_types: f.activity_types.includes(key)
        ? f.activity_types.filter((k) => k !== key)
        : [...f.activity_types, key],
    }));
  };

  return (
    <div className="max-w-xl pb-12">
      <h1 className="text-2xl font-bold mb-2">Referral rewards</h1>
      <p className="text-sm text-muted-foreground mb-6">Control what users earn when they invite friends. Changes apply to new referrals immediately.</p>

      <div className="space-y-5">
        <Field label={`Inviter reward (${tokenSymbol})`} hint="Tokens the inviter receives per referred friend.">
          <Input type="number" min={0} value={form.inviter_reward}
            onChange={(e) => setForm({ ...form, inviter_reward: Number(e.target.value) })} />
        </Field>

        <Field label={`Newbie signup bonus (${tokenSymbol})`} hint="Tokens credited to a new user the moment they open the app via an invite link.">
          <Input type="number" min={0} value={form.signup_reward}
            onChange={(e) => setForm({ ...form, signup_reward: Number(e.target.value) })} />
        </Field>

        <Field label="Lifetime earning share (%)" hint="Every time a referred friend earns, this % is also credited to the inviter — forever.">
          <Input type="number" min={0} max={100} step={1} value={form.lifetime_pct}
            onChange={(e) => setForm({ ...form, lifetime_pct: Number(e.target.value) })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Daily cap" hint="Max credited invites per inviter per 24h (0 = unlimited).">
            <Input type="number" min={0} value={form.daily_cap}
              onChange={(e) => setForm({ ...form, daily_cap: Number(e.target.value) })} />
          </Field>
          <Field label="Weekly cap" hint="Max credited invites per inviter per 7 days (0 = unlimited).">
            <Input type="number" min={0} value={form.weekly_cap}
              onChange={(e) => setForm({ ...form, weekly_cap: Number(e.target.value) })} />
          </Field>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Require activity</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {form.require_activity
                  ? "Inviter reward is held until the new user does a qualifying activity."
                  : "Inviter receives the reward instantly when the friend opens the app."}
              </p>
            </div>
            <Switch checked={form.require_activity} onCheckedChange={(v) => setForm({ ...form, require_activity: v })} />
          </div>

          {form.require_activity && (
            <div className="pl-1 space-y-2 pt-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wider">Qualifying activities</Label>
              {ACTIVITIES.map((a) => (
                <label key={a.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.activity_types.includes(a.key)}
                    onCheckedChange={() => toggleActivity(a.key)}
                  />
                  {a.label}
                </label>
              ))}
              {form.activity_types.length === 0 && (
                <p className="text-xs text-destructive">Pick at least one activity, otherwise the inviter reward will never unlock.</p>
              )}
            </div>
          )}
        </div>

        <Button onClick={() => m.mutate()} disabled={m.isPending}>Save changes</Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
