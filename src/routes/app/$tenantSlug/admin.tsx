import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { miniAdminUpdateTenant } from "@/lib/miniapp.functions";
import { useMini } from "@/lib/miniapp-context";
import { isMiniAdmin } from "@/lib/mini-admin";
import { AdProvidersAdmin } from "@/components/mini/AdProvidersAdmin";
import { BakesAdmin } from "@/components/mini/BakesAdmin";
import { PromosAdmin } from "@/components/mini/PromosAdmin";
import { MembersAdmin } from "@/components/mini/MembersAdmin";
import { TasksAdmin } from "@/components/mini/TasksAdmin";
import { WithdrawalsAdmin } from "@/components/mini/WithdrawalsAdmin";
import { BotSettingsAdmin } from "@/components/mini/BotSettingsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft } from "lucide-react";

const TABS = [
  { id: "bot", label: "Bot" },
  { id: "bakes", label: "Bakes" },
  { id: "tasks", label: "Tasks" },
  { id: "members", label: "Members" },
  { id: "promos", label: "Promos" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "invites", label: "Invites" },
  { id: "welcome", label: "Welcome" },
  { id: "security", label: "Security" },
  { id: "payouts", label: "Payouts" },
  { id: "deposits", label: "Deposits" },
  { id: "proof", label: "Proof" },
] as const;

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
  const [tab, setTab] = useState<string>("bot");

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
      welcome_image_url: t.welcome_image_url || "",
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
      idle_rate_per_hour: econ.idle_rate_per_hour ?? 60,
      idle_cap_hours: econ.idle_cap_hours ?? 8,
      idle_min_collect_pct: econ.idle_min_collect_pct ?? 60,
      idle_daily_collects: econ.idle_daily_collects ?? 0,
      idle_ad_extend_hours: econ.idle_ad_extend_hours ?? 1,
      idle_ad_extend_max: econ.idle_ad_extend_max ?? 3,
      idle_ad_block_id: econ.idle_ad_block_id ?? "",
      tab_social: ad.task_tabs?.social !== false,
      tab_partner: ad.task_tabs?.partner !== false,
      tab_watch: ad.task_tabs?.watch !== false,
      tab_refer: ad.task_tabs?.refer !== false,
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
        welcome_image_url: form.welcome_image_url?.trim() ? form.welcome_image_url.trim() : null,
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
          idle_rate_per_hour: Math.max(0, Number(form.idle_rate_per_hour) || 0),
          idle_cap_hours: Math.min(240, Math.max(0.1, Number(form.idle_cap_hours) || 8)),
          idle_min_collect_pct: Math.min(100, Math.max(0, Number(form.idle_min_collect_pct) || 0)),
          idle_daily_collects: Math.min(100, Math.max(0, Math.floor(Number(form.idle_daily_collects) || 0))),
          idle_ad_extend_hours: Math.min(24, Math.max(0, Number(form.idle_ad_extend_hours) || 0)),
          idle_ad_extend_max: Math.min(50, Math.max(0, Math.floor(Number(form.idle_ad_extend_max) || 0))),
          idle_ad_block_id: String(form.idle_ad_block_id || "").trim().slice(0, 60),
        },
        referral_config: {
          signup_reward: Number(form.signup_reward) || 0,
          inviter_reward: Number(form.inviter_reward) || 0,
          lifetime_pct: Number(form.lifetime_pct) || 0,
        },
        ad_config: {
          daily_watch_limit: Number(form.daily_watch_limit) || 0,
          task_tabs: {
            social: !!form.tab_social,
            partner: !!form.tab_partner,
            watch: !!form.tab_watch,
            refer: !!form.tab_refer,
          },
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

  const tabProps = { tenantId: t.id, initData, previewTgId: user?.telegram_id ?? null };

  return (
    <div className="p-4 pt-8 pb-24 space-y-6 text-white">
      <div className="flex items-center gap-2">
        <button onClick={() => nav({ to: "/app/$tenantSlug/profile", params: { tenantSlug: t.slug } })} className="p-2 -ml-2"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold">Admin panel</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {TABS.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${tab === x.id ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === "bakes" && <Section title="Bakes / miners"><BakesAdmin {...tabProps} tokenSymbol={t.token_symbol || "TKN"} /></Section>}
      {tab === "tasks" && <Section title="Task hub"><TasksAdmin {...tabProps} tokenSymbol={t.token_symbol || "TKN"} /></Section>}
      {tab === "members" && <Section title="Members"><MembersAdmin {...tabProps} tokenSymbol={t.token_symbol || "TKN"} /></Section>}
      {tab === "withdrawals" && <Section title="Withdrawal requests"><WithdrawalsAdmin {...tabProps} /></Section>}
      {tab === "payouts" && <Section title="Payout wallets"><BotSettingsAdmin {...tabProps} section="payouts" /></Section>}
      {tab === "promos" && <Section title="Promo codes"><PromosAdmin {...tabProps} /></Section>}
      {tab === "deposits" && <Section title="TON deposits"><BotSettingsAdmin {...tabProps} section="deposits" /></Section>}
      {tab === "welcome" && <Section title="Welcome & required joins"><BotSettingsAdmin {...tabProps} section="welcome" /></Section>}
      {tab === "security" && <Section title="Security"><BotSettingsAdmin {...tabProps} section="security" /></Section>}
      {tab === "proof" && <Section title="Payment proof channel"><BotSettingsAdmin {...tabProps} section="proof" /></Section>}
      {tab === "invites" && <Section title="Invite rewards"><BotSettingsAdmin {...tabProps} section="referral" /></Section>}

      {tab !== "bot" ? null : (
      <>


      <Section title="Brand">
        <Row><Label>Bot / app name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Row>
        <Row><Label>Token name</Label><Input value={form.token_name ?? ""} onChange={(e) => setForm({ ...form, token_name: e.target.value })} /></Row>
        <Row><Label>Symbol</Label><Input value={form.token_symbol ?? ""} onChange={(e) => setForm({ ...form, token_symbol: e.target.value })} /></Row>
        <Row><Label>Action verb</Label><Input value={form.action_verb ?? ""} onChange={(e) => setForm({ ...form, action_verb: e.target.value })} /></Row>
        <Row><Label>Token icon URL</Label><Input value={form.token_icon_url ?? ""} placeholder="https://…/coin.png" onChange={(e) => setForm({ ...form, token_icon_url: e.target.value })} /></Row>
      </Section>

      <Section title="Theme & look">
        <div className="grid grid-cols-3 gap-2">
          <ColorRow label="Primary" value={form.theme_primary} onChange={(v) => setForm({ ...form, theme_primary: v })} />
          <ColorRow label="Background" value={form.theme_background} onChange={(v) => setForm({ ...form, theme_background: v })} />
          <ColorRow label="Accent" value={form.theme_accent} onChange={(v) => setForm({ ...form, theme_accent: v })} />
        </div>
        <Row>
          <Label>Animated scene</Label>
          <select
            className="w-full bg-white/10 rounded-md px-3 py-2 text-sm"
            value={form.theme_scene ?? "gold"}
            onChange={(e) => setForm({ ...form, theme_scene: e.target.value })}
          >
            {["gold","wood","diamond","crypto","galaxy","forest","fish","lava","ocean","candy","neon","ice","dragon","ghost","milk"].map((s) => (
              <option key={s} value={s} className="bg-neutral-900">{s}</option>
            ))}
          </select>
        </Row>
        <Row><Label>Mascot image URL</Label><Input value={form.theme_mascot_url ?? ""} placeholder="https://…/mascot.png" onChange={(e) => setForm({ ...form, theme_mascot_url: e.target.value })} /></Row>
        <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: form.theme_background, border: `1px solid ${form.theme_primary}55` }}>
          {form.theme_mascot_url ? (
            <img src={form.theme_mascot_url} alt="" className="h-12 w-12 rounded object-contain" />
          ) : (
            <div className="h-12 w-12 rounded-full" style={{ background: form.theme_primary }} />
          )}
          <div>
            <div className="text-sm font-bold" style={{ color: form.theme_primary }}>{form.name || "Preview"}</div>
            <div className="text-xs" style={{ color: form.theme_accent }}>{form.token_symbol || "TKN"} · {form.action_verb || "Mine"}</div>
          </div>
        </div>
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

      <Section title="Storage (idle / farm mode)">
        <p className="text-xs text-white/50">Production stops once storage is full. Users can enlarge storage by watching a rewarded ad.</p>
        <Row><Label>Production rate (tokens/hour)</Label><Input type="number" value={form.idle_rate_per_hour ?? 60} onChange={(e) => setForm({ ...form, idle_rate_per_hour: e.target.value })} /></Row>
        <Row><Label>Storage size (hours)</Label><Input type="number" step="0.5" value={form.idle_cap_hours ?? 8} onChange={(e) => setForm({ ...form, idle_cap_hours: e.target.value })} /></Row>
        <Row><Label>Collect unlocks at (% full)</Label><Input type="number" min={0} max={100} value={form.idle_min_collect_pct ?? 60} onChange={(e) => setForm({ ...form, idle_min_collect_pct: e.target.value })} /></Row>
        <Row><Label>Collects per day (0 = unlimited)</Label><Input type="number" min={0} value={form.idle_daily_collects ?? 0} onChange={(e) => setForm({ ...form, idle_daily_collects: e.target.value })} /></Row>
        <Row><Label>Extra storage per watched ad (hours)</Label><Input type="number" step="0.5" min={0} value={form.idle_ad_extend_hours ?? 1} onChange={(e) => setForm({ ...form, idle_ad_extend_hours: e.target.value })} /></Row>
        <Row><Label>Storage-boost ads per day</Label><Input type="number" min={0} value={form.idle_ad_extend_max ?? 3} onChange={(e) => setForm({ ...form, idle_ad_extend_max: e.target.value })} /></Row>
        <Row><Label>Adsgram block ID for storage boost</Label><Input value={form.idle_ad_block_id ?? ""} placeholder="int-1234" onChange={(e) => setForm({ ...form, idle_ad_block_id: e.target.value })} /></Row>
        <p className="text-xs text-white/50">Leave the block ID empty to hide the boost button. Limits are enforced server-side.</p>
      </Section>

      <Section title="Ads">
        <Row><Label>Daily ad limit</Label><Input type="number" value={form.daily_watch_limit ?? 20} onChange={(e) => setForm({ ...form, daily_watch_limit: e.target.value })} /></Row>
        <p className="text-xs text-white/50">Daily counters reset at 2:00 AM.</p>
      </Section>

      <Section title="Task Hub tabs">
        {([["tab_watch", "Watch & earn"], ["tab_social", "Social"], ["tab_partner", "Partners"], ["tab_refer", "Refer"]] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
            Show {label}
          </label>
        ))}
      </Section>

      <Section title="Ad providers">
        <AdProvidersAdmin tenantId={t.id} initData={initData} previewTgId={user?.telegram_id ?? null} />
      </Section>


      <Section title="Welcome message">
        <Row><Label>Welcome text</Label><Textarea rows={3} value={form.welcome_text ?? ""} onChange={(e) => setForm({ ...form, welcome_text: e.target.value })} /></Row>
        <Row><Label>CTA button text</Label><Input value={form.welcome_cta_text ?? ""} onChange={(e) => setForm({ ...form, welcome_cta_text: e.target.value })} /></Row>
        <Row>
          <Label>Welcome image URL</Label>
          <Input value={form.welcome_image_url ?? ""} placeholder="https://…/banner.jpg" onChange={(e) => setForm({ ...form, welcome_image_url: e.target.value })} />
          <p className="text-xs text-white/50">Shown above the /start message. You can also send a photo from the bot: /panel → Start Message.</p>
        </Row>
        {form.welcome_image_url ? <img src={form.welcome_image_url} alt="" className="w-full rounded-lg object-cover max-h-40" /> : null}
      </Section>

      <Section title="Admin Telegram IDs (comma-separated)">
        <Input value={form.admin_telegram_ids ?? ""} onChange={(e) => setForm({ ...form, admin_telegram_ids: e.target.value })} placeholder="123456789, 987654321" />
      </Section>

      <Button className="w-full" size="lg" onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? "Saving…" : "Save changes"}
      </Button>
      </>
      )}
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
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 rounded border border-white/20 bg-transparent cursor-pointer" />
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} className="text-xs font-mono" />
      </div>
    </div>
  );
}

