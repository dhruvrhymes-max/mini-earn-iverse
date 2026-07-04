import { useNavigate } from "@tanstack/react-router";
import { ThemeScene } from "./ThemeScene";
import type { SceneKind } from "@/lib/theme-presets";
import { Pickaxe, Users, ListChecks, Wallet, Sparkles } from "lucide-react";

/**
 * Per-theme home layouts. Every scene maps to one of a handful of layout
 * "families" so each bot feels visually distinct — cosmic, crystal, forge,
 * playful. The mining button, header treatment, and quick tiles all change
 * per family while sharing the same underlying data props.
 */
export type HomeLayoutProps = {
  tenant: any;
  user: any;
  onMine: () => void;
  mining: boolean;
  remaining: number | null;
  idle: boolean;
  ready: boolean;
  usd: string;
  formatTime: (s: number) => string;
};

const FAMILY: Record<string, "cosmic" | "crystal" | "forge" | "playful" | "nature"> = {
  galaxy: "cosmic", neon: "cosmic", crypto: "cosmic",
  diamond: "crystal", ice: "crystal", ocean: "crystal", fish: "crystal",
  lava: "forge", dragon: "forge", gold: "forge", wood: "forge",
  candy: "playful", milk: "playful", ghost: "playful",
  forest: "nature",
};

export function ThemeHome(props: HomeLayoutProps) {
  const kind = (props.tenant.theme_preset || "gold") as SceneKind;
  const family = FAMILY[kind] || "playful";
  const theme = props.tenant.theme as any;

  const layouts = { cosmic: CosmicLayout, crystal: CrystalLayout, forge: ForgeLayout, playful: PlayfulLayout, nature: NatureLayout } as const;
  const Layout = layouts[family];

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: theme.background }}>
      <ThemeScene kind={kind} primary={theme.primary} accent={theme.accent} />
      <div className="relative z-10">
        <Layout {...props} />
      </div>
    </div>
  );
}

// ──────────────────────────── quick tiles ────────────────────────────
function QuickTiles({ tenantSlug, primary }: { tenantSlug: string; primary: string }) {
  const nav = useNavigate();
  const go = (to: any) => nav({ to, params: { tenantSlug } as any });
  const tiles = [
    { to: "/app/$tenantSlug/miners", label: "Boost", Icon: Pickaxe },
    { to: "/app/$tenantSlug/tasks", label: "Tasks", Icon: ListChecks },
    { to: "/app/$tenantSlug/refer", label: "Invite", Icon: Users },
    { to: "/app/$tenantSlug/withdraw", label: "Cash out", Icon: Wallet },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 px-4 mt-6">
      {tiles.map((t) => (
        <button
          key={t.to}
          type="button"
          onClick={() => go(t.to)}
          onContextMenu={(e) => e.preventDefault()}
          className="flex flex-col items-center gap-1 rounded-2xl py-3 backdrop-blur-md border transition-transform active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}
        >
          <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: `${primary}33` }}>
            <t.Icon className="h-4 w-4" style={{ color: primary }} />
          </div>
          <span className="text-[10px] text-white/80 font-medium">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function StatRow({ tenant, user }: { tenant: any; user: any }) {
  const econ = tenant.economics as any;
  return (
    <div className="mx-4 mt-4 grid grid-cols-3 rounded-2xl overflow-hidden border" style={{ background: "rgba(0,0,0,0.35)", borderColor: "rgba(255,255,255,0.08)" }}>
      <Stat label="Rate" value={`${econ.mining_rate_per_hour}/hr`} />
      <Stat label="Refs" value={String(user.referral_count ?? 0)} border />
      <Stat label="USDT" value={`$${Number(user.usd_balance ?? 0).toFixed(3)}`} border />
    </div>
  );
}
function Stat({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={`px-2 py-3 text-center ${border ? "border-l" : ""}`} style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      <p className="text-[10px] uppercase tracking-wide text-white/50">{label}</p>
      <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}

// ──────────────────────────── mine button variants ────────────────────────────
function MineButton({ theme, tenant, mining, idle, ready, remaining, onMine, formatTime, shape = "orb" }: any) {
  const label = idle ? tenant.action_verb : ready ? "CLAIM" : formatTime(remaining);
  const sub = idle ? "tap to start" : ready ? "reward ready" : "mining…";

  const shapes: Record<string, React.CSSProperties> = {
    orb: {
      borderRadius: "50%",
      background: `radial-gradient(circle at 30% 25%, ${theme.accent}, ${theme.primary} 60%, ${theme.primary})`,
      boxShadow: `0 20px 60px ${theme.primary}aa, inset 0 -8px 24px rgba(0,0,0,0.35), inset 0 8px 24px rgba(255,255,255,0.35)`,
    },
    hex: {
      clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)",
      background: `linear-gradient(180deg, ${theme.accent}, ${theme.primary})`,
      boxShadow: `0 20px 60px ${theme.primary}aa`,
    },
    diamond: {
      transform: "rotate(45deg)",
      borderRadius: 24,
      background: `linear-gradient(135deg, ${theme.accent}, ${theme.primary})`,
      boxShadow: `0 20px 60px ${theme.primary}aa, inset 0 0 40px rgba(255,255,255,0.35)`,
    },
    squircle: {
      borderRadius: 48,
      background: `radial-gradient(circle at 30% 25%, ${theme.accent}, ${theme.primary} 70%)`,
      boxShadow: `0 20px 60px ${theme.primary}aa`,
    },
  };

  return (
    <button
      onClick={onMine}
      disabled={mining}
      onContextMenu={(e) => e.preventDefault()}
      className="w-56 h-56 mx-auto flex items-center justify-center text-black font-bold shadow-2xl active:scale-95 transition-transform relative"
      style={shapes[shape] || shapes.orb}
    >
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: shape === "orb" || shape === "squircle" ? shapes[shape].borderRadius as any : 0,
          clipPath: shape === "hex" ? shapes.hex.clipPath as any : undefined,
          background: `conic-gradient(from 0deg, transparent, ${theme.accent}55, transparent 60%)`,
          animation: "scene-spin 6s linear infinite",
          opacity: idle ? 0.6 : ready ? 1 : 0.35,
        }}
      />
      <span className="relative text-center px-2" style={{ transform: shape === "diamond" ? "rotate(-45deg)" : undefined }}>
        <span className="block text-2xl">{label}</span>
        <span className="block text-xs font-medium opacity-80">{sub}</span>
      </span>
    </button>
  );
}

// ──────────────────────────── layouts ────────────────────────────
function BalanceCard({ tenant, user, usd, tag }: { tenant: any; user: any; usd: string; tag?: string }) {
  const theme = tenant.theme as any;
  return (
    <div className="mx-4 mt-4 p-4 rounded-3xl backdrop-blur-md border" style={{ background: `linear-gradient(135deg, ${theme.primary}22, rgba(0,0,0,0.4))`, borderColor: "rgba(255,255,255,0.1)" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase text-white/50 tracking-widest">{tag || "Balance"}</p>
          <p className="text-4xl font-black text-white drop-shadow mt-1">{Number(user.balance).toFixed(2)}</p>
          <p className="text-xs text-white/70 mt-0.5">{tenant.token_symbol} · ${usd}</p>
        </div>
        {tenant.token_icon_url ? (
          <img src={tenant.token_icon_url} alt={tenant.token_symbol} className="h-14 w-14 rounded-full object-cover shadow-lg" />
        ) : (
          <div className="h-14 w-14 rounded-full flex items-center justify-center shadow-lg" style={{ background: `radial-gradient(circle at 30% 30%, ${theme.accent}, ${theme.primary})` }}>
            <Sparkles className="h-6 w-6 text-black" />
          </div>
        )}
      </div>
    </div>
  );
}

function Header({ tenant, subtitle }: { tenant: any; subtitle: string }) {
  return (
    <div className="pt-8 px-4 text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{subtitle}</p>
      <h1 className="text-xl font-bold text-white mt-1 drop-shadow">{tenant.name}</h1>
    </div>
  );
}

function CosmicLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} subtitle="Cosmic Rig · Level 1" />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Space Balance" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-8 flex justify-center">
        <MineButton {...p} theme={p.tenant.theme} shape="orb" />
      </div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} />
    </>
  );
}

function CrystalLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} subtitle="Crystal Depths" />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Vault" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-10 flex justify-center">
        <MineButton {...p} theme={p.tenant.theme} shape="diamond" />
      </div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} />
    </>
  );
}

function ForgeLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} subtitle="The Forge · Molten Core" />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Hoard" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-8 flex justify-center">
        <MineButton {...p} theme={p.tenant.theme} shape="hex" />
      </div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} />
    </>
  );
}

function PlayfulLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} subtitle="Tap Zone" />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Sweet Stash" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-10 flex justify-center">
        <MineButton {...p} theme={p.tenant.theme} shape="squircle" />
      </div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} />
    </>
  );
}

function NatureLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} subtitle="Wildwoods" />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Basket" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-10 flex justify-center">
        <MineButton {...p} theme={p.tenant.theme} shape="orb" />
      </div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} />
    </>
  );
}
