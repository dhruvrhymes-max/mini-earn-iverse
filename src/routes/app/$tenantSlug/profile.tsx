import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { isMiniAdmin } from "@/lib/mini-admin";
import { ChevronRight, Wallet, ArrowDownToLine, ArrowLeftRight, History, MessageCircle, Globe, ShieldCheck, Pickaxe } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/profile")({
  component: Profile,
});

function Profile() {
  const { tenant, user } = useMini();
  const nav = useNavigate();
  const isAdmin = isMiniAdmin(user?.telegram_id, tenant);
  const items = [
    { to: "/app/$tenantSlug/miners", label: "Miners", icon: Pickaxe },
    { to: "/app/$tenantSlug/withdraw", label: "Withdraw USDT", icon: ArrowDownToLine },
    { to: "/app/$tenantSlug/convert", label: "Convert to USDT", icon: ArrowLeftRight },
    { to: "/app/$tenantSlug/wallets", label: "Wallet addresses", icon: Wallet },
    { to: "/app/$tenantSlug/history", label: "Transaction history", icon: History },
    { to: "/app/$tenantSlug/payouts", label: "Payout proof", icon: ShieldCheck },
  ] as const;
  const c = tenant.community as any;
  const go = (to: any) => nav({ to, params: { tenantSlug: tenant.slug } as any });
  return (
    <div className="p-4 pt-8" onContextMenu={(e) => e.preventDefault()}>
      <div className="bg-white/5 rounded-lg p-4 mb-6 text-center">
        <p className="font-semibold">{user.first_name || user.username || `User ${user.telegram_id}`}</p>
        <p className="text-sm text-white/60">{Number(user.balance).toFixed(2)} {tenant.token_symbol} · ${Number(user.usd_balance).toFixed(4)} USDT</p>
      </div>
      {isAdmin && (
        <Section title="Admin">
          <button onClick={() => go("/app/$tenantSlug/admin")} className="w-full flex items-center gap-3 p-3 rounded-lg mb-2 text-left" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <ShieldCheck className="h-5 w-5" style={{ color: (tenant.theme as any).primary }} />
            <span className="flex-1">Open admin panel</span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </button>
        </Section>
      )}
      <Section title="Finance">
        {items.map((it) => (
          <button key={it.to} onClick={() => go(it.to)} className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-lg mb-2 text-left">
            <it.icon className="h-5 w-5 text-white/60" />
            <span className="flex-1">{it.label}</span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </button>
        ))}
      </Section>
      <Section title="Community">
        {c.channel_url && <button onClick={() => (window as any).Telegram?.WebApp?.openTelegramLink?.(c.channel_url) ?? window.open(c.channel_url, "_blank")} className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-lg mb-2 text-left"><MessageCircle className="h-5 w-5" /><span className="flex-1">Official channel</span></button>}
        {c.support_url && <button onClick={() => (window as any).Telegram?.WebApp?.openTelegramLink?.(c.support_url) ?? window.open(c.support_url, "_blank")} className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-lg mb-2 text-left"><MessageCircle className="h-5 w-5" /><span className="flex-1">Support</span></button>}
        {!c.channel_url && !c.support_url && <p className="text-xs text-white/40">Not configured</p>}
      </Section>
      <Section title="Settings">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
          <Globe className="h-5 w-5" /><span className="flex-1">Language</span><span className="text-white/60">{user.language?.toUpperCase() || "EN"}</span>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: any) {
  return <div className="mb-6"><h3 className="text-xs uppercase text-white/40 mb-2 px-1">{title}</h3>{children}</div>;
}
