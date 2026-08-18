import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminGetSettings, adminSaveSettings } from "@/lib/bot-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Props = {
  tenantId: string;
  initData: string | null;
  previewTgId: number | null;
  section: "payouts" | "deposits" | "welcome" | "security" | "proof" | "referral";
};

export function BotSettingsAdmin({ tenantId, initData, previewTgId, section }: Props) {
  const auth = { tenantId, initData, previewTgId: initData ? null : previewTgId };
  const get = useServerFn(adminGetSettings);
  const save = useServerFn(adminSaveSettings);
  const { data } = useQuery({ queryKey: ["admin-settings", tenantId], queryFn: () => get({ data: auth }) });
  const [s, setS] = useState<any | null>(null);
  useEffect(() => { if (data) setS(JSON.parse(JSON.stringify(data))); }, [data]);

  const m = useMutation({
    mutationFn: (payload: any) => save({ data: { ...auth, ...payload } }),
    onSuccess: () => toast.success("Saved"),
    onError: (e: any) => toast.error(e.message),
  });

  if (!s) return <p className="text-sm text-white/40">Loading…</p>;
  const set = (path: string, key: string, value: any) => setS({ ...s, [path]: { ...s[path], [key]: value } });

  if (section === "payouts") {
    const bep20 = s.payout.bep20, polygon = s.payout.polygon, ton = s.payout.ton;
    const evmPayload = (v: any) => ({ chain_label: v.chain_label, chain_id: Number(v.chain_id), rpc_url: v.rpc_url, contract: v.contract, explorer: v.explorer, decimals: Number(v.decimals) || 18, private_key: v.private_key || null });
    const setNetwork = (key: "bep20" | "polygon", field: string, value: any) => setS({ ...s, payout: { ...s.payout, [key]: { ...s.payout[key], [field]: value } } });
    return (
      <Box onSave={() => m.mutate({ payout: {
        bep20: evmPayload(bep20), polygon: evmPayload(polygon),
        ton: { api_key: ton.api_key, explorer: ton.explorer, endpoint: ton.endpoint || null, phrase: ton.phrase || null },
        auto_pay: !!s.payout.auto_pay,
      } })} pending={m.isPending}>
        {(["bep20", "polygon"] as const).map((key) => {
          const evm = s.payout[key];
          return <div key={key} className="space-y-3 border-b border-white/10 pb-4">
            <Section title={key === "bep20" ? "USDT BEP20" : "USDT Polygon"} />
            <div className="grid grid-cols-2 gap-2"><F label="Chain ID"><Input type="number" value={evm.chain_id} onChange={(e) => setNetwork(key, "chain_id", e.target.value)} /></F><F label="Decimals"><Input type="number" value={evm.decimals} onChange={(e) => setNetwork(key, "decimals", e.target.value)} /></F></div>
            <F label="RPC URL"><Input value={evm.rpc_url} onChange={(e) => setNetwork(key, "rpc_url", e.target.value)} /></F>
            <F label="USDT contract"><Input value={evm.contract} onChange={(e) => setNetwork(key, "contract", e.target.value)} /></F>
            <F label="Explorer tx base"><Input value={evm.explorer} onChange={(e) => setNetwork(key, "explorer", e.target.value)} /></F>
            <F label={`Private key ${evm.key_preview ? `(saved ${evm.key_preview})` : "(not set)"}`}><Input type="password" placeholder="Enter to replace" value={evm.private_key ?? ""} onChange={(e) => setNetwork(key, "private_key", e.target.value)} /></F>
          </div>;
        })}
        <Section title="TON (Tonkeeper)" />
        <F label={`24-word phrase ${ton.phrase_preview ? `(saved ${ton.phrase_preview})` : "(not set)"}`}>
          <Textarea rows={2} placeholder="Enter to replace" value={ton.phrase ?? ""} onChange={(e) => setS({ ...s, payout: { ...s.payout, ton: { ...ton, phrase: e.target.value } } })} />
        </F>
        <F label="TON API key"><Input value={ton.api_key} onChange={(e) => setS({ ...s, payout: { ...s.payout, ton: { ...ton, api_key: e.target.value } } })} /></F>
        <F label="TON RPC endpoint"><Input value={ton.endpoint ?? ""} placeholder="https://toncenter.com/api/v2/jsonRPC" onChange={(e) => setS({ ...s, payout: { ...s.payout, ton: { ...ton, endpoint: e.target.value } } })} /></F>
        <F label="TON explorer base"><Input value={ton.explorer} onChange={(e) => setS({ ...s, payout: { ...s.payout, ton: { ...ton, explorer: e.target.value } } })} /></F>
        <p className="text-[11px] text-white/40">Keys are encrypted before storage and never sent back to the app. “Approve & send” signs, broadcasts, confirms, and records the real transaction.</p>

      </Box>
    );
  }

  if (section === "deposits") {
    return (
      <Box onSave={() => m.mutate({ deposit: { ...s.deposit, tokens_per_ton: Number(s.deposit.tokens_per_ton) || 0 } })} pending={m.isPending}>
        <Toggle label="Enable TON deposits" checked={s.deposit.enabled} onChange={(v) => set("deposit", "enabled", v)} />
        <F label="TON wallet address"><Input value={s.deposit.ton_wallet} onChange={(e) => set("deposit", "ton_wallet", e.target.value)} /></F>
        <F label="Memo prefix"><Input value={s.deposit.memo_prefix} onChange={(e) => set("deposit", "memo_prefix", e.target.value)} /></F>
        <F label="Tokens per 1 TON"><Input type="number" value={s.deposit.tokens_per_ton} onChange={(e) => set("deposit", "tokens_per_ton", e.target.value)} /></F>
      </Box>
    );
  }

  if (section === "welcome") {
    const ch = s.onboarding.channels ?? [];
    const setCh = (next: any[]) => set("onboarding", "channels", next);
    return (
      <Box onSave={() => m.mutate({ onboarding: s.onboarding })} pending={m.isPending}>
        <Toggle label="Show welcome screen on first open" checked={s.onboarding.enabled} onChange={(v) => set("onboarding", "enabled", v)} />
        <F label="Title"><Input value={s.onboarding.title} onChange={(e) => set("onboarding", "title", e.target.value)} /></F>
        <F label="Message"><Textarea rows={3} value={s.onboarding.text} onChange={(e) => set("onboarding", "text", e.target.value)} /></F>
        <F label="Image URL"><Input value={s.onboarding.image_url} onChange={(e) => set("onboarding", "image_url", e.target.value)} /></F>
        <Toggle label="Require joining before playing" checked={s.onboarding.require_join} onChange={(v) => set("onboarding", "require_join", v)} />
        <Section title="Channels & groups" />
        {ch.map((c: any, i: number) => (
          <div key={i} className="flex gap-2 items-end">
            <F label="Title"><Input value={c.title ?? ""} onChange={(e) => setCh(ch.map((x: any, j: number) => j === i ? { ...x, title: e.target.value } : x))} /></F>
            <F label="Link"><Input value={c.url ?? ""} onChange={(e) => setCh(ch.map((x: any, j: number) => j === i ? { ...x, url: e.target.value } : x))} /></F>
            <F label="Chat ID"><Input placeholder="@chat or -100…" value={c.chat_id ?? ""} onChange={(e) => setCh(ch.map((x: any, j: number) => j === i ? { ...x, chat_id: e.target.value } : x))} /></F>
            <button className="p-2 text-white/40" onClick={() => setCh(ch.filter((_: any, j: number) => j !== i))}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {ch.length < 6 && (
          <Button variant="outline" size="sm" onClick={() => setCh([...ch, { title: "", url: "", chat_id: "" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add channel
          </Button>
        )}
      </Box>
    );
  }

  if (section === "security") {
    return (
      <Box onSave={() => m.mutate({ security: s.security })} pending={m.isPending}>
        <Toggle label="Track join address (block multi-accounts)" checked={s.security.ip_tracking} onChange={(v) => set("security", "ip_tracking", v)} />
        <F label="Block message"><Textarea rows={3} value={s.security.block_message} onChange={(e) => set("security", "block_message", e.target.value)} /></F>
        <p className="text-[11px] text-white/40">Blocked accounts stay listed under Members and can be unblocked in one tap.</p>
      </Box>
    );
  }

  if (section === "proof") {
    return (
      <Box onSave={() => m.mutate({ proof: s.proof })} pending={m.isPending}>
        <Toggle label="Post payment proofs" checked={s.proof.enabled} onChange={(v) => set("proof", "enabled", v)} />
        <F label="Channel ID or @username"><Input value={s.proof.channel_id} onChange={(e) => set("proof", "channel_id", e.target.value)} /></F>
        <F label="Template"><Textarea rows={9} value={s.proof.template} onChange={(e) => set("proof", "template", e.target.value)} /></F>
        <F label="Footer"><Input value={s.proof.footer} onChange={(e) => set("proof", "footer", e.target.value)} /></F>
        <p className="text-[11px] text-white/40">
          Placeholders: {"{user}"} {"{user_id}"} {"{amount}"} {"{token}"} {"{network}"} {"{wallet}"} {"{tx}"} {"{status}"} {"{date}"}
        </p>
      </Box>
    );
  }

  return (
    <Box onSave={() => m.mutate({ referral: {
      instant_reward: Number(s.referral.instant_reward) || 0,
      bonus_reward: Number(s.referral.bonus_reward) || 0,
      bonus_trigger: s.referral.bonus_trigger || "tasks",
      bonus_after_ads: Number(s.referral.bonus_after_ads) || 0,
      bonus_after_tasks: Number(s.referral.bonus_after_tasks) || 0,
      lifetime_pct: Number(s.referral.lifetime_pct) || 0,
      daily_cap: Math.max(0, Math.round(Number(s.referral.daily_cap) || 0)),
      weekly_cap: Math.max(0, Math.round(Number(s.referral.weekly_cap) || 0)),
    } })} pending={m.isPending}>
      <F label="Instant reward per invite"><Input type="number" value={s.referral.instant_reward} onChange={(e) => set("referral", "instant_reward", e.target.value)} /></F>
      <F label="Extra bonus reward"><Input type="number" value={s.referral.bonus_reward} onChange={(e) => set("referral", "bonus_reward", e.target.value)} /></F>
      <F label="Unlock bonus when invitee…">
        <select
          value={s.referral.bonus_trigger ?? "tasks"}
          onChange={(e) => set("referral", "bonus_trigger", e.target.value)}
          className="w-full rounded-md bg-white/10 px-3 py-2 text-sm"
        >
          <option value="tasks">completes N tasks</option>
          <option value="ads">watches N ads</option>
          <option value="either">completes tasks OR watches ads</option>
          <option value="both">completes tasks AND watches ads</option>
        </select>
      </F>
      <div className="grid grid-cols-2 gap-2">
        <F label="Tasks required"><Input type="number" value={s.referral.bonus_after_tasks ?? 5} onChange={(e) => set("referral", "bonus_after_tasks", e.target.value)} /></F>
        <F label="Ads required"><Input type="number" value={s.referral.bonus_after_ads} onChange={(e) => set("referral", "bonus_after_ads", e.target.value)} /></F>
      </div>
      <F label="Lifetime earning cut (%)"><Input type="number" value={s.referral.lifetime_pct} onChange={(e) => set("referral", "lifetime_pct", e.target.value)} /></F>

      <Section title="Abuse caps" />
      <div className="grid grid-cols-2 gap-2">
        <F label="Max credited invites / day"><Input type="number" value={s.referral.daily_cap} onChange={(e) => set("referral", "daily_cap", e.target.value)} /></F>
        <F label="Max credited invites / week"><Input type="number" value={s.referral.weekly_cap} onChange={(e) => set("referral", "weekly_cap", e.target.value)} /></F>
      </div>
      <p className="text-[11px] text-white/40">Set 0 to disable a cap. Invites beyond the cap still count but pay no reward.</p>
    </Box>
  );
}

function Box({ children, onSave, pending }: { children: React.ReactNode; onSave: () => void; pending: boolean }) {
  return (
    <div className="space-y-3">
      {children}
      <Button className="w-full" onClick={onSave} disabled={pending}>Save</Button>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1 flex-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Section({ title }: { title: string }) {
  return <div className="text-xs uppercase tracking-wider text-white/40 pt-2">{title}</div>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm py-1">
      <span>{label}</span>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}
