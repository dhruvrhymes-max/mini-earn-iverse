import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { miniAdminUpdateTenant } from "@/lib/miniapp.functions";
import { useMini } from "@/lib/miniapp-context";
import { isMiniAdmin } from "@/lib/mini-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/admin")({
  component: MiniAdmin,
});

function readInitData(): string | null {
  if (typeof window === "undefined") return null;
  const wa = (window as any).Telegram?.WebApp;
  return typeof wa?.initData === "string" && wa.initData ? wa.initData : null;
}

function MiniAdmin() {
  const nav = useNavigate();
  const { tenant, user } = useMini();
  const t: any = tenant;
  const admin = isMiniAdmin(user?.telegram_id, t);
  const upd = useServerFn(miniAdminUpdateTenant);
  const [form, setForm] = useState<any>({});
  const [initData, setInitData] = useState<string | null>(null);

  useEffect(() => { setInitData(readInitData()); }, []);

  useEffect(() => {
    if (!t?.id) return;
    const econ: any = t.economics || {};
    const ref: any = t.referral_config || {};
    const ad: any = t.ad_config || {};
    const th: any = t.theme || {};
    setForm({
      name: t.name || "",
      token_name: t.token_name || "",
      token_symbol: t.token_symbol || "",
      token_icon_url: t.token_icon_url || "",
      action_verb: t.action_verb || "",
      welcome_text: t.welcome_text || "",
      welcome_cta_text: t.welcome_cta_text || "",
      theme_primary: th.primary || "#f59e0b",
      theme_background: th.background || "#0a0a0a",
      theme_accent: th.accent || "#fbbf24",
      theme_scene: th.scene || "gold",
      theme_mascot_url: th.mascot_url || "",
      tokens_per_mine: econ.tokens_per_mine ?? econ.mining_rate_per_hour ?? 100,
      mine_duration_seconds: econ.mine_duration_seconds ?? (Number(econ.mining_cycle_hours ?? 4) * 3600),
      token_per_usdt: econ.token_per_usdt ?? 10000,
      min_withdraw_usdt: econ.min_withdraw_usdt ?? 0.1,
      signup_reward: ref.signup_reward ?? 0,
      inviter_reward: ref.inviter_reward ?? 50,
      lifetime_pct: ref.lifetime_pct ?? 20,
      daily_watch_limit: ad.daily_watch_limit ?? 20,
      startup_ad_enabled: ad.startup_ad_enabled ?? true,
      admin_telegram_ids: Array.isArray(t.admin_telegram_ids) ? t.admin_telegram_ids.join(", ") : "",
    });
  }, [t?.id]);


  const m = useMutation({
    mutationFn: () => {
      const patch: any = {
        name: form.name,
        token_name: form.token_name,
        token_symbol: form.token_symbol,
        token_icon_url: form.token_icon_url?.trim() ? form.token_icon_url.trim() : null,
        action_verb: form.action_verb,
        welcome_text: form.welcome_text,
        welcome_cta_text: form.welcome_cta_text,
        theme: {
          primary: form.theme_primary,
          background: form.theme_background,
          accent: form.theme_accent,
          scene: form.theme_scene,
          mascot_url: form.theme_mascot_url?.trim() ? form.theme_mascot_url.trim() : null,
        },
        economics: {
          tokens_per_mine: Number(form.tokens_per_mine) || 0,
          mine_duration_seconds: Math.max(1, Number(form.mine_duration_seconds) || 1),
          token_per_usdt: Number(form.token_per_usdt) || 0,
          min_withdraw_usdt: Number(form.min_withdraw_usdt) || 0,
        },
        referral_config: {
          signup_reward: Number(form.signup_reward) || 0,
          inviter_reward: Number(form.inviter_reward) || 0,
          lifetime_pct: Number(form.lifetime_pct) || 0,
        },
        ad_config: {
          daily_watch_limit: Number(form.daily_watch_limit) || 0,
          startup_ad_enabled: !!form.startup_ad_enabled,
        },
        admin_telegram_ids: String(form.admin_telegram_ids || "")
          .split(/[\s,]+/).map((s: string) => s.trim()).filter(Boolean)
          .map((s: string) => Number(s)).filter((n: number) => Number.isFinite(n) && n > 0),
      };
      return upd({ data: { tenantId: t.id, initData, previewTgId: initData ? null : Number(user.telegram_id), patch } });
    },

    onSuccess: () => toast.success("Saved — reopen the app to see changes"),
    onError: (e: any) => toast.error(e.message),
  });

  if (!admin) return (
    <div className="p-6 pt-12 text-center text-white/70">
      <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-white/40" />
      <p>Admin panel is restricted.</p>
    </div>
  );

  return (
    <div className="p-4 pt-8 pb-24 space-y-6 text-white">
      <div className="flex items-center gap-2">
        <button onClick={() => nav({ to: "/app/$tenantSlug/profile", params: { tenantSlug: t.slug } })} className="p-2 -ml-2"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Admin panel</h1>
      </div>

      <Section title="Token">
        <Row><Label>Token name</Label><Input value={form.token_name ?? ""} onChange={(e) => setForm({ ...form, token_name: e.target.value })} /></Row>
        <Row><Label>Symbol</Label><Input value={form.token_symbol ?? ""} onChange={(e) => setForm({ ...form, token_symbol: e.target.value })} /></Row>
        <Row><Label>Action verb</Label><Input value={form.action_verb ?? ""} onChange={(e) => setForm({ ...form, action_verb: e.target.value })} /></Row>
      </Section>

      <Section title="Mining economics">
        <Row><Label>Tokens per mine</Label><Input type="number" value={form.tokens_per_mine ?? 0} onChange={(e) => setForm({ ...form, tokens_per_mine: e.target.value })} /></Row>
        <Row><Label>Mine duration (seconds)</Label><Input type="number" value={form.mine_duration_seconds ?? 3600} onChange={(e) => setForm({ ...form, mine_duration_seconds: e.target.value })} /></Row>
        <Row><Label>Tokens per 1 USDT</Label><Input type="number" value={form.token_per_usdt ?? 10000} onChange={(e) => setForm({ ...form, token_per_usdt: e.target.value })} /></Row>
        <Row><Label>Min withdraw (USDT)</Label><Input type="number" step="0.01" value={form.min_withdraw_usdt ?? 0.1} onChange={(e) => setForm({ ...form, min_withdraw_usdt: e.target.value })} /></Row>
      </Section>

      <Section title="Referrals">
        <Row><Label>Signup reward</Label><Input type="number" value={form.signup_reward ?? 0} onChange={(e) => setForm({ ...form, signup_reward: e.target.value })} /></Row>
        <Row><Label>Inviter reward</Label><Input type="number" value={form.inviter_reward ?? 0} onChange={(e) => setForm({ ...form, inviter_reward: e.target.value })} /></Row>
        <Row><Label>Lifetime cut (%)</Label><Input type="number" value={form.lifetime_pct ?? 0} onChange={(e) => setForm({ ...form, lifetime_pct: e.target.value })} /></Row>
      </Section>

      <Section title="Ads">
        <Row><Label>Daily ad limit</Label><Input type="number" value={form.daily_watch_limit ?? 20} onChange={(e) => setForm({ ...form, daily_watch_limit: e.target.value })} /></Row>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.startup_ad_enabled} onChange={(e) => setForm({ ...form, startup_ad_enabled: e.target.checked })} />
          Show ad on app open
        </label>
      </Section>

      <Section title="Welcome message">
        <Row><Label>Welcome text</Label><Textarea rows={3} value={form.welcome_text ?? ""} onChange={(e) => setForm({ ...form, welcome_text: e.target.value })} /></Row>
        <Row><Label>CTA button text</Label><Input value={form.welcome_cta_text ?? ""} onChange={(e) => setForm({ ...form, welcome_cta_text: e.target.value })} /></Row>
      </Section>

      <Section title="Admin Telegram IDs (comma-separated)">
        <Input value={form.admin_telegram_ids ?? ""} onChange={(e) => setForm({ ...form, admin_telegram_ids: e.target.value })} placeholder="123456789, 987654321" />
      </Section>

      <Button className="w-full" size="lg" onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-white/50">{title}</h3>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>;
}
