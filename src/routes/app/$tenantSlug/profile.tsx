import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { useMini } from "@/lib/miniapp-context";
import { isMiniAdmin } from "@/lib/mini-admin";
import { setLanguage } from "@/lib/miniapp.functions";
import { LANGUAGES } from "@/lib/languages";
import { familyOf, skinOf, hexA } from "@/lib/theme-family";
import { ChevronRight, Wallet, ArrowDownToLine, ArrowLeftRight, History, MessageCircle, Globe, ShieldCheck, Pickaxe, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/profile")({
  component: Profile,
});

function Profile() {
  const { tenant, user } = useMini();
  const nav = useNavigate();
  const isAdmin = isMiniAdmin(user?.telegram_id, tenant);
  const skin = skinOf(tenant);
  const family = familyOf(tenant);
  const theme = tenant.theme as any;
  const items = [
    { to: "/app/$tenantSlug/shop", label: "Bake shop", icon: ShoppingBag },
    { to: "/app/$tenantSlug/miners", label: "Miners", icon: Pickaxe },
    { to: "/app/$tenantSlug/withdraw", label: "Withdraw USDT", icon: ArrowDownToLine },
    { to: "/app/$tenantSlug/convert", label: "Convert to USDT", icon: ArrowLeftRight },
    { to: "/app/$tenantSlug/wallets", label: "Wallet addresses", icon: Wallet },
    { to: "/app/$tenantSlug/history", label: "Transaction history", icon: History },
    { to: "/app/$tenantSlug/payouts", label: "Payouts & proof", icon: ShieldCheck },
  ] as const;
  const c = tenant.community as any;
  const go = (to: any) => nav({ to, params: { tenantSlug: tenant.slug } as any });

  /** Finance destinations render as a grid for playful/cosmic, as rows elsewhere. */
  const asGrid = family === "playful" || family === "cosmic";

  return (
    <div className={`${skin.page} pb-28`} onContextMenu={(e) => e.preventDefault()}>
      <ProfileHeader family={family} tenant={tenant} user={user} />

      {isAdmin && (
        <Section skin={skin} primary={theme.primary} title="Admin">
          <button onClick={() => go("/app/$tenantSlug/admin")} className={`${skin.card} w-full flex items-center gap-3 text-left mb-2`} style={skin.cardStyle(theme.primary, theme.accent)}>
            <ShieldCheck className="h-5 w-5" style={{ color: theme.primary }} />
            <span className="flex-1 font-semibold">Open admin panel</span>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </button>
        </Section>
      )}

      <Section skin={skin} primary={theme.primary} title="Finance">
        <div className={asGrid ? "grid grid-cols-2 gap-2.5" : "space-y-2"}>
          {items.map((it) => (
            <button
              key={it.to}
              onClick={() => go(it.to)}
              className={`${skin.card} w-full text-left ${asGrid ? "flex flex-col items-start gap-2" : "flex items-center gap-3"}`}
              style={skin.cardStyle(theme.primary, theme.accent)}
            >
              <it.icon className="h-5 w-5" style={{ color: theme.primary }} />
              <span className={`flex-1 ${asGrid ? "text-sm font-bold leading-tight" : ""}`}>{it.label}</span>
              {!asGrid && <ChevronRight className="h-4 w-4 text-white/40" />}
            </button>
          ))}
        </div>
      </Section>

      <Section skin={skin} primary={theme.primary} title="Community">
        {c.channel_url && <CommunityRow skin={skin} theme={theme} url={c.channel_url} label="Official channel" />}
        {c.support_url && <CommunityRow skin={skin} theme={theme} url={c.support_url} label="Support" />}
        {!c.channel_url && !c.support_url && <p className="text-xs text-white/40">Not configured</p>}
      </Section>

      <Section skin={skin} primary={theme.primary} title="Settings">
        <div className={`${skin.card} flex items-center gap-3`} style={skin.cardStyle(theme.primary, theme.accent)}>
          <Globe className="h-5 w-5" /><span className="flex-1">Language</span>
          <span className="text-white/60">{user.language?.toUpperCase() || "EN"}</span>
        </div>
      </Section>
    </div>
  );
}

function CommunityRow({ skin, theme, url, label }: any) {
  return (
    <button
      onClick={() => (window as any).Telegram?.WebApp?.openTelegramLink?.(url) ?? window.open(url, "_blank")}
      className={`${skin.card} w-full flex items-center gap-3 text-left mb-2`}
      style={skin.cardStyle(theme.primary, theme.accent)}
    >
      <MessageCircle className="h-5 w-5" style={{ color: theme.accent }} />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-white/40" />
    </button>
  );
}

/** Each family gets a visually distinct identity header. */
function ProfileHeader({ family, tenant, user }: { family: string; tenant: any; user: any }) {
  const theme = tenant.theme as any;
  const name = user.first_name || user.username || `User ${user.telegram_id}`;
  const bal = `${Number(user.balance).toFixed(2)} ${tenant.token_symbol}`;
  const usd = `$${Number(user.usd_balance).toFixed(4)}`;
  const initial = (name[0] || "?").toUpperCase();

  if (family === "cosmic") {
    return (
      <div className="mb-7 text-center">
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black"
          style={{ background: `radial-gradient(circle at 30% 30%, ${theme.primary}, transparent 70%)`, border: `1px solid ${hexA(theme.primary, 0.6)}`, boxShadow: `0 0 40px -10px ${theme.primary}` }}>
          {initial}
        </div>
        <p className="mt-3 text-lg font-black uppercase tracking-[0.2em]">{name}</p>
        <p className="text-xs text-white/50 tracking-[0.25em] uppercase mt-1">{bal} · {usd}</p>
      </div>
    );
  }
  if (family === "crystal") {
    return (
      <div className="mb-6 p-4 [clip-path:polygon(18px_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%,0_18px)]"
        style={{ background: `linear-gradient(135deg, ${hexA(theme.primary, 0.25)}, ${hexA(theme.accent, 0.12)})`, border: "1px solid rgba(255,255,255,0.18)" }}>
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Explorer</p>
        <p className="text-xl font-extrabold mt-1">{name}</p>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="font-bold" style={{ color: theme.primary }}>{bal}</span>
          <span className="text-white/60">{usd}</span>
        </div>
      </div>
    );
  }
  if (family === "forge") {
    return (
      <div className="mb-6 rounded-md overflow-hidden" style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.1),rgba(0,0,0,0.4))", borderBottom: `4px solid ${theme.primary}` }}>
        <div className="flex items-center gap-3 p-4">
          <div className="w-14 h-14 flex items-center justify-center font-black text-black text-xl"
            style={{ background: theme.primary, clipPath: "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)" }}>{initial}</div>
          <div>
            <p className="font-black uppercase tracking-wider">{name}</p>
            <p className="text-xs text-white/60 uppercase tracking-widest mt-0.5">{bal} · {usd}</p>
          </div>
        </div>
      </div>
    );
  }
  if (family === "nature") {
    return (
      <div className="mb-6 rounded-[24px] rounded-tl-[6px] p-4 flex items-center gap-3"
        style={{ background: "rgba(255,255,255,0.06)", borderLeft: `4px solid ${theme.primary}` }}>
        <div className="w-12 h-12 rounded-[18px] rounded-tl-[4px] flex items-center justify-center font-bold text-black" style={{ background: theme.primary }}>{initial}</div>
        <div>
          <p className="font-bold">{name}</p>
          <p className="text-xs text-white/60">{bal} · {usd}</p>
        </div>
      </div>
    );
  }
  // playful
  return (
    <div className="mb-6 rounded-[30px] p-5 text-center"
      style={{ background: `linear-gradient(160deg, ${hexA(theme.primary, 0.3)}, ${hexA(theme.accent, 0.14)})`, border: "2px solid rgba(255,255,255,0.2)", boxShadow: "0 8px 0 rgba(0,0,0,0.3)" }}>
      <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-black" style={{ background: theme.primary }}>{initial}</div>
      <p className="mt-3 text-lg font-black">{name}</p>
      <p className="text-sm text-white/70 font-semibold">{bal} · {usd}</p>
    </div>
  );
}

function Section({ title, children, skin, primary }: any) {
  return (
    <div className="mb-6">
      <h3 className={skin.section} style={{ borderColor: primary }}>{title}</h3>
      {children}
    </div>
  );
}
