import { useNavigate } from "@tanstack/react-router";
import { ThemeScene } from "./ThemeScene";
import type { SceneKind } from "@/lib/theme-presets";
import { Pickaxe, Users, ListChecks, Wallet, Sparkles, Flame, Snowflake, Leaf, Rocket, Gem } from "lucide-react";

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
  const kind = (props.tenant.theme_preset || props.tenant.theme?.scene || "gold") as SceneKind;
  const theme = props.tenant.theme as any;
  const requestedFamily = theme.layout_family as "cosmic" | "crystal" | "forge" | "playful" | "nature" | undefined;

  const layouts = { cosmic: CosmicLayout, crystal: CrystalLayout, forge: ForgeLayout, playful: PlayfulLayout, nature: NatureLayout } as const;
  const family: keyof typeof layouts = requestedFamily && requestedFamily in layouts ? requestedFamily : (FAMILY[kind] || "playful");
  const Layout = layouts[family];

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: theme.background }}>
      <ThemeScene kind={kind} primary={theme.primary} accent={theme.accent} />
      <div className="relative z-10">
        <Layout {...props} />
      </div>
      <ThemeHomeStyles />
    </div>
  );
}

// ─────────────── shared bits (used only when family layout wants them) ───────────────
function QuickTiles({ tenantSlug, primary, accent, variant = "chips" }: { tenantSlug: string; primary: string; accent: string; variant?: "chips" | "orbs" | "shards" | "bubbles" | "leaves" }) {
  const nav = useNavigate();
  const go = (to: any) => nav({ to, params: { tenantSlug } as any });
  const tiles = [
    { to: "/app/$tenantSlug/miners", label: "Boost", Icon: Pickaxe },
    { to: "/app/$tenantSlug/tasks", label: "Tasks", Icon: ListChecks },
    { to: "/app/$tenantSlug/refer", label: "Invite", Icon: Users },
    { to: "/app/$tenantSlug/withdraw", label: "Cash", Icon: Wallet },
  ];
  if (variant === "orbs") {
    return (
      <div className="flex justify-around px-6 mt-8">
        {tiles.map((t) => (
          <button key={t.to} onClick={() => go(t.to)} onContextMenu={(e) => e.preventDefault()}
            className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
            <div className="h-12 w-12 rounded-full flex items-center justify-center border-2"
              style={{ background: `radial-gradient(circle at 30% 30%, ${accent}, ${primary})`, borderColor: `${accent}66`, boxShadow: `0 0 16px ${primary}88` }}>
              <t.Icon className="h-5 w-5 text-black" />
            </div>
            <span className="text-[10px] text-white/70">{t.label}</span>
          </button>
        ))}
      </div>
    );
  }
  if (variant === "shards") {
    return (
      <div className="grid grid-cols-4 gap-2 px-4 mt-6">
        {tiles.map((t) => (
          <button key={t.to} onClick={() => go(t.to)} onContextMenu={(e) => e.preventDefault()}
            className="flex flex-col items-center gap-1 py-3 active:scale-95 transition-transform"
            style={{ clipPath: "polygon(50% 0, 100% 30%, 82% 100%, 18% 100%, 0 30%)", background: `linear-gradient(180deg, ${primary}44, ${accent}22)`, border: "none" }}>
            <t.Icon className="h-4 w-4" style={{ color: accent }} />
            <span className="text-[10px] text-white/80">{t.label}</span>
          </button>
        ))}
      </div>
    );
  }
  if (variant === "bubbles") {
    return (
      <div className="grid grid-cols-4 gap-3 px-6 mt-6">
        {tiles.map((t, i) => (
          <button key={t.to} onClick={() => go(t.to)} onContextMenu={(e) => e.preventDefault()}
            className="flex flex-col items-center gap-1 py-3 rounded-full active:scale-95 transition-transform th-bounce"
            style={{ background: `radial-gradient(circle at 30% 30%, #ffffff44, ${primary}66)`, animationDelay: `${i * 0.15}s` }}>
            <t.Icon className="h-4 w-4 text-white" />
            <span className="text-[10px] text-white">{t.label}</span>
          </button>
        ))}
      </div>
    );
  }
  if (variant === "leaves") {
    return (
      <div className="grid grid-cols-4 gap-2 px-4 mt-6">
        {tiles.map((t, i) => (
          <button key={t.to} onClick={() => go(t.to)} onContextMenu={(e) => e.preventDefault()}
            className="flex flex-col items-center gap-1 py-3 active:scale-95 transition-transform th-sway"
            style={{ borderRadius: "50% 10% 50% 10%", background: `linear-gradient(135deg, ${primary}55, ${accent}44)`, animationDelay: `${i * 0.2}s` }}>
            <t.Icon className="h-4 w-4" style={{ color: accent }} />
            <span className="text-[10px] text-white/80">{t.label}</span>
          </button>
        ))}
      </div>
    );
  }
  // chips
  return (
    <div className="grid grid-cols-4 gap-2 px-4 mt-6">
      {tiles.map((t) => (
        <button key={t.to} onClick={() => go(t.to)} onContextMenu={(e) => e.preventDefault()}
          className="flex flex-col items-center gap-1 rounded-2xl py-3 backdrop-blur-md border transition-transform active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" }}>
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
      <Stat label="Rate" value={`${econ.mining_rate_per_hour ?? econ.tokens_per_mine ?? 100}/hr`} />
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

function BalanceCard({ tenant, user, usd, tag, variant = "card" }: { tenant: any; user: any; usd: string; tag?: string; variant?: "card" | "hex" | "shard" | "cloud" | "trunk" }) {
  const theme = tenant.theme as any;
  const shapes: Record<string, React.CSSProperties> = {
    card: { borderRadius: 24, background: `linear-gradient(135deg, ${theme.primary}22, rgba(0,0,0,0.4))` },
    hex: { clipPath: "polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%)", background: `linear-gradient(135deg, ${theme.primary}55, #000)` },
    shard: { clipPath: "polygon(0 10%, 100% 0, 95% 100%, 5% 90%)", background: `linear-gradient(135deg, ${theme.accent}44, ${theme.primary}44)` },
    cloud: { borderRadius: 40, background: `radial-gradient(ellipse at 30% 40%, #ffffff33, ${theme.primary}44)` },
    trunk: { borderRadius: 12, background: `repeating-linear-gradient(90deg, ${theme.primary}55, ${theme.primary}66 6px, ${theme.accent}44 6px, ${theme.accent}55 12px)` },
  };
  return (
    <div className="mx-4 mt-4 p-4 backdrop-blur-md border" style={{ ...shapes[variant], borderColor: "rgba(255,255,255,0.1)" }}>
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

function Header({ user, subtitle, Icon }: { tenant?: any; user?: any; subtitle: string; Icon?: any }) {
  // Show the player, never the bot/tenant handle.
  const name = user?.first_name || user?.username || "Player";
  return (
    <div className="pt-8 px-4 text-center flex flex-col items-center">
      {Icon && <Icon className="h-4 w-4 text-white/40 mb-1" />}
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">{subtitle}</p>
      <h1 className="text-xl font-bold text-white mt-1 drop-shadow">Hi, {name}</h1>
    </div>
  );
}

// ──────────────────────────── mining buttons per family ────────────────────────────
type BtnProps = HomeLayoutProps;

function CosmicButton({ tenant, mining, idle, ready, remaining, onMine, formatTime }: BtnProps) {
  const t = tenant.theme;
  const label = idle ? tenant.action_verb : ready ? "CLAIM" : formatTime(remaining!);
  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      <div className="absolute inset-0 rounded-full th-orbit" style={{ border: `1px dashed ${t.accent}55` }} />
      <div className="absolute inset-4 rounded-full th-orbit-rev" style={{ border: `1px dashed ${t.primary}66` }} />
      <div className="absolute w-3 h-3 rounded-full th-orbit-dot" style={{ background: t.accent, boxShadow: `0 0 12px ${t.accent}` }} />
      <button onClick={onMine} disabled={mining} onContextMenu={(e) => e.preventDefault()}
        className="relative w-40 h-40 rounded-full text-white font-bold active:scale-95 transition-transform th-pulse"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${t.accent}, ${t.primary} 55%, #000 120%)`,
          boxShadow: `0 0 60px ${t.primary}aa, inset 0 -12px 30px #000a, inset 0 8px 30px #fff4`,
        }}>
        <span className="block text-2xl">{label}</span>
        <span className="block text-[10px] mt-1 opacity-80">{idle ? "LAUNCH" : ready ? "collect" : "orbiting"}</span>
      </button>
    </div>
  );
}

function CrystalButton({ tenant, mining, idle, ready, remaining, onMine, formatTime }: BtnProps) {
  const t = tenant.theme;
  const label = idle ? tenant.action_verb : ready ? "CLAIM" : formatTime(remaining!);
  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        {[0, 1, 2].map((i) => (
          <div key={i} className="absolute th-facet" style={{
            width: 180 - i * 30, height: 180 - i * 30,
            clipPath: "polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)",
            background: `linear-gradient(${45 + i * 60}deg, ${t.accent}55, ${t.primary}22, ${t.accent}44)`,
            animationDelay: `${i * 0.5}s`,
          }} />
        ))}
      </div>
      <button onClick={onMine} disabled={mining} onContextMenu={(e) => e.preventDefault()}
        className="relative w-32 h-36 text-black font-bold active:scale-95 transition-transform th-shimmer"
        style={{
          clipPath: "polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)",
          background: `linear-gradient(135deg, ${t.accent}, ${t.primary})`,
          boxShadow: `0 0 40px ${t.accent}aa`,
        }}>
        <span className="block text-lg mt-6">{label}</span>
        <span className="block text-[9px] opacity-80">{idle ? "cleave" : ready ? "ready" : "growing"}</span>
      </button>
    </div>
  );
}

function ForgeButton({ tenant, mining, idle, ready, remaining, onMine, formatTime }: BtnProps) {
  const t = tenant.theme;
  const label = idle ? tenant.action_verb : ready ? "CLAIM" : formatTime(remaining!);
  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      <div className="absolute inset-0 rounded-full th-ember" style={{
        background: `radial-gradient(circle, ${t.accent}66, ${t.primary}33, transparent 70%)`,
      }} />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="absolute th-spark" style={{
          left: `${20 + i * 12}%`, bottom: "20%",
          width: 6, height: 6, borderRadius: "50%",
          background: t.accent, boxShadow: `0 0 10px ${t.accent}`,
          animationDelay: `${i * 0.3}s`,
        }} />
      ))}
      <button onClick={onMine} disabled={mining} onContextMenu={(e) => e.preventDefault()}
        className="relative w-44 h-44 text-black font-black active:scale-95 transition-transform th-hammer"
        style={{
          clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)",
          background: `linear-gradient(180deg, ${t.accent}, ${t.primary} 60%, #3f0d0d)`,
          boxShadow: `0 20px 60px ${t.primary}aa, inset 0 -10px 30px #0008`,
        }}>
        <span className="block text-2xl mt-1">{label}</span>
        <span className="block text-[10px] opacity-90">{idle ? "STRIKE" : ready ? "temper" : "forging"}</span>
      </button>
    </div>
  );
}

function PlayfulButton({ tenant, mining, idle, ready, remaining, onMine, formatTime }: BtnProps) {
  const t = tenant.theme;
  const label = idle ? tenant.action_verb : ready ? "CLAIM" : formatTime(remaining!);
  return (
    <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
      <div className="absolute inset-6 th-jelly" style={{
        borderRadius: "60% 40% 55% 45% / 55% 45% 55% 45%",
        background: `radial-gradient(circle at 35% 30%, #ffffff77, ${t.primary}88)`,
        filter: "blur(2px)",
      }} />
      <button onClick={onMine} disabled={mining} onContextMenu={(e) => e.preventDefault()}
        className="relative w-44 h-44 text-white font-black active:scale-90 transition-transform th-squish"
        style={{
          borderRadius: "60% 40% 55% 45% / 55% 45% 55% 45%",
          background: `radial-gradient(circle at 30% 25%, ${t.accent}, ${t.primary})`,
          boxShadow: `0 20px 40px ${t.primary}aa, inset 0 -12px 24px #0004, inset 0 12px 24px #fff5`,
        }}>
        <span className="block text-2xl">{label}</span>
        <span className="block text-[10px] opacity-90">{idle ? "SQUISH!" : ready ? "yum" : "growing"}</span>
      </button>
    </div>
  );
}

function NatureButton({ tenant, mining, idle, ready, remaining, onMine, formatTime }: BtnProps) {
  const t = tenant.theme;
  const label = idle ? tenant.action_verb : ready ? "CLAIM" : formatTime(remaining!);
  return (
    <div className="relative w-64 h-72 mx-auto flex flex-col items-center justify-end">
      <div className="absolute top-0 th-grow-leaf" style={{ fontSize: 48 }}>🌱</div>
      <button onClick={onMine} disabled={mining} onContextMenu={(e) => e.preventDefault()}
        className="relative w-40 h-52 text-white font-bold active:scale-95 transition-transform"
        style={{
          borderRadius: "40% 40% 20% 20% / 30% 30% 10% 10%",
          background: `linear-gradient(180deg, ${t.accent} 0%, ${t.primary} 40%, #3b2312 100%)`,
          boxShadow: `0 20px 40px ${t.primary}88, inset 0 -20px 30px #0006`,
        }}>
        <span className="block text-2xl mt-6">{label}</span>
        <span className="block text-[10px] opacity-90">{idle ? "GROW" : ready ? "harvest" : "growing"}</span>
      </button>
    </div>
  );
}

// ──────────────────────────── layouts per family ────────────────────────────
function CosmicLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} user={p.user} subtitle="Cosmic Rig · Orbital" Icon={Rocket} />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Star Vault" variant="card" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-6 flex justify-center"><CosmicButton {...p} /></div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} accent={p.tenant.theme.accent} variant="orbs" />
    </>
  );
}

function CrystalLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} user={p.user} subtitle="Crystal Depths · Vein 7" Icon={Gem} />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Vault" variant="shard" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-6 flex justify-center"><CrystalButton {...p} /></div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} accent={p.tenant.theme.accent} variant="shards" />
    </>
  );
}

function ForgeLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} user={p.user} subtitle="The Forge · Molten Core" Icon={Flame} />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Hoard" variant="hex" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-6 flex justify-center"><ForgeButton {...p} /></div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} accent={p.tenant.theme.accent} variant="chips" />
    </>
  );
}

function PlayfulLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} user={p.user} subtitle="Tap Zone · Sweet" Icon={Snowflake} />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Sweet Stash" variant="cloud" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-6 flex justify-center"><PlayfulButton {...p} /></div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} accent={p.tenant.theme.accent} variant="bubbles" />
    </>
  );
}

function NatureLayout(p: HomeLayoutProps) {
  return (
    <>
      <Header tenant={p.tenant} user={p.user} subtitle="Wildwoods · Grove" Icon={Leaf} />
      <BalanceCard tenant={p.tenant} user={p.user} usd={p.usd} tag="Basket" variant="trunk" />
      <StatRow tenant={p.tenant} user={p.user} />
      <div className="mt-4 flex justify-center"><NatureButton {...p} /></div>
      <QuickTiles tenantSlug={p.tenant.slug} primary={p.tenant.theme.primary} accent={p.tenant.theme.accent} variant="leaves" />
    </>
  );
}

// ──────────────────────────── animation styles ────────────────────────────
function ThemeHomeStyles() {
  return (
    <style>{`
      @keyframes th-orbit { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      @keyframes th-orbit-rev { from { transform: rotate(360deg); } to { transform: rotate(0); } }
      @keyframes th-orbit-dot {
        0%   { transform: rotate(0deg) translateX(120px) rotate(0deg); }
        100% { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
      }
      @keyframes th-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
      @keyframes th-facet {
        0%,100% { transform: rotate(0) scale(1); opacity: .6; }
        50%     { transform: rotate(180deg) scale(1.08); opacity: 1; }
      }
      @keyframes th-shimmer {
        0%,100% { filter: brightness(1); }
        50%     { filter: brightness(1.3) saturate(1.2); }
      }
      @keyframes th-ember { 0%,100% { transform: scale(1); opacity: .6; } 50% { transform: scale(1.1); opacity: 1; } }
      @keyframes th-spark {
        0%   { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-140px) scale(.3); opacity: 0; }
      }
      @keyframes th-hammer {
        0%,100% { transform: rotate(0); }
        50%     { transform: rotate(-2deg); }
      }
      @keyframes th-jelly {
        0%,100% { border-radius: 60% 40% 55% 45% / 55% 45% 55% 45%; }
        50%     { border-radius: 45% 55% 40% 60% / 45% 55% 45% 55%; }
      }
      @keyframes th-squish {
        0%,100% { transform: scale(1,1); }
        50%     { transform: scale(1.05, .95); }
      }
      @keyframes th-grow-leaf {
        0%,100% { transform: translateY(0) rotate(-5deg); }
        50%     { transform: translateY(-8px) rotate(5deg); }
      }
      @keyframes th-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      @keyframes th-sway { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }

      .th-orbit      { animation: th-orbit 18s linear infinite; }
      .th-orbit-rev  { animation: th-orbit-rev 24s linear infinite; }
      .th-orbit-dot  { animation: th-orbit-dot 8s linear infinite; }
      .th-pulse      { animation: th-pulse 2.6s ease-in-out infinite; }
      .th-facet      { animation: th-facet 6s ease-in-out infinite; }
      .th-shimmer    { animation: th-shimmer 3s ease-in-out infinite; }
      .th-ember      { animation: th-ember 3s ease-in-out infinite; }
      .th-spark      { animation: th-spark 2.5s ease-out infinite; }
      .th-hammer     { animation: th-hammer 1.8s ease-in-out infinite; }
      .th-jelly      { animation: th-jelly 4s ease-in-out infinite; }
      .th-squish     { animation: th-squish 2.2s ease-in-out infinite; }
      .th-grow-leaf  { animation: th-grow-leaf 3s ease-in-out infinite; }
      .th-bounce     { animation: th-bounce 2.4s ease-in-out infinite; }
      .th-sway       { animation: th-sway 3s ease-in-out infinite; transform-origin: bottom center; }

      @media (prefers-reduced-motion: reduce) {
        .th-orbit,.th-orbit-rev,.th-orbit-dot,.th-pulse,.th-facet,.th-shimmer,.th-ember,.th-spark,.th-hammer,.th-jelly,.th-squish,.th-grow-leaf,.th-bounce,.th-sway { animation: none !important; }
      }
    `}</style>
  );
}
