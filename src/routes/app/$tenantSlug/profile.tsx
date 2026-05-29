import { createFileRoute, Link } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { ChevronRight, Wallet, ArrowDownToLine, ArrowLeftRight, History, MessageCircle, Globe } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/profile")({
  component: Profile,
});

function Profile() {
  const { tenant, user } = useMini();
  const items = [
    { to: "/app/$tenantSlug/withdraw", label: "Withdraw USDT", icon: ArrowDownToLine },
    { to: "/app/$tenantSlug/convert", label: "Convert to USDT", icon: ArrowLeftRight },
    { to: "/app/$tenantSlug/wallets", label: "Wallet addresses", icon: Wallet },
    { to: "/app/$tenantSlug/history", label: "Transaction history", icon: History },
  ];
  const c = tenant.community as any;
  return (
    <div className="p-4 pt-8">
      <div className="bg-white/5 rounded-lg p-4 mb-6 text-center">
        <p className="font-semibold">{user.first_name || user.username || `User ${user.telegram_id}`}</p>
        <p className="text-sm text-white/60">{Number(user.balance).toFixed(2)} {tenant.token_symbol} · ${Number(user.usd_balance).toFixed(4)} USDT</p>
      </div>
      <Section title="Finance">
        {items.map((it) => (
          <Link key={it.to} to={it.to} params={{ tenantSlug: tenant.slug }} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg mb-2">
            <it.icon className="h-5 w-5 text-white/60" />
            <span className="flex-1">{it.label}</span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </Link>
        ))}
      </Section>
      <Section title="Community">
        {c.channel_url && <a href={c.channel_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white/5 rounded-lg mb-2"><MessageCircle className="h-5 w-5" /><span className="flex-1">Official channel</span></a>}
        {c.support_url && <a href={c.support_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white/5 rounded-lg mb-2"><MessageCircle className="h-5 w-5" /><span className="flex-1">Support</span></a>}
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
