import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ThemeScene } from "./ThemeScene";
import type { SceneKind } from "@/lib/theme-presets";
import { collectIdle, getGameState, spinWheel, tapEarn } from "@/lib/game.functions";
import { formatCompact, formatClock, formatTokens, formatUsd } from "@/lib/format";
import { ListChecks, Pickaxe, Users, Wallet } from "lucide-react";

type Props = { tenant: any; user: any; refetchUser: () => void };

/** Shell shared by every non-mining mode: themed backdrop, balance, quick tiles. */
function Shell({ tenant, children }: { tenant: any; children: React.ReactNode }) {
  const kind = (tenant.theme_preset || tenant.theme?.scene || "gold") as SceneKind;
  const theme = tenant.theme || {};
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: theme.background }}>
      <ThemeScene kind={kind} primary={theme.primary} accent={theme.accent} />
      <div className="relative z-10 px-5 pt-6 pb-28">{children}</div>
    </div>
  );
}

function BalanceCard({ tenant, user }: { tenant: any; user: any }) {
  const theme = tenant.theme || {};
  const rate = Number(tenant.economics?.token_per_usdt) || 10000;
  const usd = formatUsd(Number(user.balance) / rate);
  return (
    <div
      className="rounded-3xl p-5 border backdrop-blur-md"
      style={{ borderColor: `${theme.primary}44`, background: `${theme.primary}12` }}
    >
      <p className="text-xs uppercase tracking-widest text-white/60">Balance</p>
      <p className="text-4xl font-black mt-1" style={{ color: theme.primary }}>
        {formatCompact(user.balance)} <span className="text-lg">{tenant.token_symbol}</span>
      </p>
      <p className="text-xs text-white/50 mt-1">≈ ${usd} USDT</p>
    </div>
  );
}

function QuickTiles({ tenantSlug, primary }: { tenantSlug: string; primary: string }) {
  const nav = useNavigate();
  const tiles = [
    { to: "/app/$tenantSlug/miners", label: "Boost", Icon: Pickaxe },
    { to: "/app/$tenantSlug/tasks", label: "Tasks", Icon: ListChecks },
    { to: "/app/$tenantSlug/refer", label: "Invite", Icon: Users },
    { to: "/app/$tenantSlug/withdraw", label: "Cash", Icon: Wallet },
  ];
  return (
    <div className="grid grid-cols-4 gap-3 mt-6">
      {tiles.map((t) => (
        <button
          key={t.to}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => nav({ to: t.to as any, params: { tenantSlug } as any })}
          className="rounded-2xl py-3 flex flex-col items-center gap-1 border text-white/80 active:scale-95 transition"
          style={{ borderColor: `${primary}33`, background: `${primary}0f` }}
        >
          <t.Icon className="w-5 h-5" style={{ color: primary }} />
          <span className="text-[10px]">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────── TAP TO EARN ─────────────────────────── */
export function TapHome({ tenant, user, refetchUser }: Props) {
  const theme = tenant.theme || {};
  const state = useServerFn(getGameState);
  const tap = useServerFn(tapEarn);
  const [energy, setEnergy] = useState(0);
  const [energyMax, setEnergyMax] = useState(500);
  const [perTap, setPerTap] = useState(1);
  const [local, setLocal] = useState(0);
  const [pops, setPops] = useState<Array<{ id: number; x: number; y: number; v: number }>>([]);
  const queued = useRef(0);
  const flushTimer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    state({ data: { userId: user.id } }).then((s: any) => {
      if (!alive) return;
      setEnergy(s.energy); setEnergyMax(s.energy_max); setPerTap(s.tap_reward);
    }).catch(() => {});
    return () => { alive = false; };
  }, [state, user.id]);

  const flush = () => {
    const taps = queued.current;
    queued.current = 0;
    if (taps <= 0) return;
    tap({ data: { userId: user.id, taps } })
      .then((r: any) => { setEnergy(r.energy); setLocal(0); refetchUser(); })
      .catch((e: any) => toast.error(e?.message ?? "Tap failed"));
  };

  const onTap = (e: React.PointerEvent) => {
    if (energy <= 0) { toast.info("Out of energy — it refills over time"); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const id = Date.now() + Math.random();
    setPops((p) => [...p.slice(-12), { id, x: e.clientX - rect.left, y: e.clientY - rect.top, v: perTap }]);
    window.setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 700);
    setEnergy((v) => Math.max(0, v - 1));
    setLocal((v) => v + perTap);
    queued.current = Math.min(50, queued.current + 1);
    try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch { /* not in Telegram */ }
    if (flushTimer.current) window.clearTimeout(flushTimer.current);
    flushTimer.current = window.setTimeout(flush, 500);
  };

  const pct = energyMax ? (energy / energyMax) * 100 : 0;

  return (
    <Shell tenant={tenant}>
      <BalanceCard tenant={tenant} user={user} />
      <div className="mt-8 flex flex-col items-center">
        <div
          onPointerDown={onTap}
          onContextMenu={(e) => e.preventDefault()}
          className="relative w-60 h-60 rounded-full flex items-center justify-center select-none active:scale-95 transition-transform"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${theme.accent}, ${theme.primary} 60%, #000 130%)`,
            boxShadow: `0 0 60px ${theme.primary}66, inset 0 -18px 40px rgba(0,0,0,.45)`,
          }}
        >
          <span className="text-5xl drop-shadow-lg">{tenant.token_icon_url ? "" : "⚡"}</span>
          <span className="absolute bottom-7 text-xs font-bold text-black/70">{tenant.action_verb || "Tap"}</span>
          {pops.map((p) => (
            <span key={p.id} className="pointer-events-none absolute text-white font-bold text-lg tap-pop"
              style={{ left: p.x, top: p.y }}>+{formatTokens(p.v)}</span>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/70">
          +{formatTokens(local)} {tenant.token_symbol} this session
        </p>
        <div className="w-full mt-5">
          <div className="flex justify-between text-xs text-white/60 mb-1">
            <span>Energy</span><span>{energy} / {energyMax}</span>
          </div>
          <div className="h-3 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: theme.primary }} />
          </div>
          <p className="text-[11px] text-white/40 mt-1">Energy refills automatically — no ads required.</p>
        </div>
      </div>
      <QuickTiles tenantSlug={tenant.slug} primary={theme.primary} />
      <style>{`.tap-pop{animation:tapPop .7s ease-out forwards}@keyframes tapPop{0%{opacity:1;transform:translate(-50%,0) scale(.8)}100%{opacity:0;transform:translate(-50%,-70px) scale(1.3)}}`}</style>
    </Shell>
  );
}

/* ─────────────────────────── SPIN TO EARN ─────────────────────────── */
export function SpinHome({ tenant, user, refetchUser }: Props) {
  const theme = tenant.theme || {};
  const state = useServerFn(getGameState);
  const spinFn = useServerFn(spinWheel);
  const [rewards, setRewards] = useState<number[]>([5, 10, 25, 50, 100, 250]);
  const [readyAt, setReadyAt] = useState(0);
  const [credits, setCredits] = useState(0);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    state({ data: { userId: user.id } }).then((s: any) => {
      if (!alive) return;
      setRewards(s.spin_rewards); setReadyAt(s.spin_ready_at); setCredits(s.spin_credits);
    }).catch(() => {});
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { alive = false; window.clearInterval(id); };
  }, [state, user.id]);

  const slice = 360 / rewards.length;
  const cooling = now < readyAt && credits <= 0;

  const doSpin = async () => {
    if (spinning || cooling) return;
    setSpinning(true);
    try {
      const r: any = await spinFn({ data: { userId: user.id } });
      if (!r.ok) { setReadyAt(r.spin_ready_at); toast.info("Spin not ready yet"); return; }
      const target = 360 * 6 + (360 - (r.index * slice + slice / 2));
      setAngle((a) => a + target);
      setReadyAt(r.spin_ready_at); setCredits(r.spin_credits);
      window.setTimeout(() => {
        toast.success(`+${formatTokens(r.amount)} ${tenant.token_symbol}`);
        refetchUser();
      }, 3200);
    } catch (e: any) {
      toast.error(e?.message ?? "Spin failed");
    } finally {
      window.setTimeout(() => setSpinning(false), 3200);
    }
  };

  const gradient = useMemo(
    () => `conic-gradient(${rewards.map((_, i) =>
      `${i % 2 ? theme.primary : theme.accent} ${i * slice}deg ${(i + 1) * slice}deg`).join(",")})`,
    [rewards, slice, theme.primary, theme.accent],
  );

  return (
    <Shell tenant={tenant}>
      <BalanceCard tenant={tenant} user={user} />
      <div className="mt-8 flex flex-col items-center">
        <div className="relative w-64 h-64">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 text-2xl">▼</div>
          <div
            className="w-64 h-64 rounded-full border-4"
            style={{
              background: gradient,
              borderColor: theme.accent,
              boxShadow: `0 0 50px ${theme.primary}55`,
              transform: `rotate(${angle}deg)`,
              transition: "transform 3s cubic-bezier(.15,.9,.2,1)",
            }}
          >
            {rewards.map((v, i) => (
              <span key={i}
                className="absolute left-1/2 top-1/2 text-[11px] font-black text-black/80"
                style={{ transform: `rotate(${i * slice + slice / 2}deg) translateY(-96px)` }}>
                {formatCompact(v, 0)}
              </span>
            ))}
          </div>
          <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/70 border-2 flex items-center justify-center text-xl"
            style={{ borderColor: theme.accent }}>🎰</div>
        </div>
        <button
          onClick={doSpin}
          disabled={spinning || cooling}
          onContextMenu={(e) => e.preventDefault()}
          className="mt-7 w-full rounded-2xl py-4 font-bold text-black disabled:opacity-50 active:scale-95 transition"
          style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary})` }}
        >
          {spinning ? "Spinning…" : cooling ? `Next free spin in ${formatClock((readyAt - now) / 1000)}` : credits > 0 ? `Spin (${credits} credits)` : "Free spin"}
        </button>
        <p className="text-[11px] text-white/40 mt-2">Spins are free — earn extra spins from tasks.</p>
      </div>
      <QuickTiles tenantSlug={tenant.slug} primary={theme.primary} />
    </Shell>
  );
}

/* ─────────────────────────── IDLE / FARM TO EARN ─────────────────────────── */
export function IdleHome({ tenant, user, refetchUser }: Props) {
  const theme = tenant.theme || {};
  const state = useServerFn(getGameState);
  const collect = useServerFn(collectIdle);
  const [pending, setPending] = useState(0);
  const [rate, setRate] = useState(0);
  const [capHours, setCapHours] = useState(8);
  const [started, setStarted] = useState(Boolean(user.idle_collected_at));

  const load = () => state({ data: { userId: user.id } }).then((s: any) => {
    setPending(s.idle_pending); setRate(s.idle_rate_per_hour); setCapHours(s.idle_cap_hours);
  }).catch(() => {});

  useEffect(() => {
    load();
    const id = window.setInterval(() => setPending((p) => p + rate / 3600), 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, rate]);

  const m = useMutation({
    mutationFn: () => collect({ data: { userId: user.id } }),
    onSuccess: (r: any) => {
      if (r.started) { setStarted(true); toast.success("Production started"); }
      else if (r.collected > 0) toast.success(`+${formatTokens(r.collected)} ${tenant.token_symbol}`);
      else toast.info("Nothing to collect yet");
      setPending(0); refetchUser(); load();
    },
    onError: (e: any) => toast.error(e?.message ?? "Collect failed"),
  });

  const capped = rate * capHours;
  const fill = capped ? Math.min(100, (pending / capped) * 100) : 0;

  return (
    <Shell tenant={tenant}>
      <BalanceCard tenant={tenant} user={user} />
      <div className="mt-8 flex flex-col items-center">
        <div className="relative w-56 h-56 rounded-[2rem] overflow-hidden border-2 flex items-end justify-center"
          style={{ borderColor: `${theme.primary}66`, background: `${theme.primary}10` }}>
          <div className="absolute bottom-0 left-0 right-0 transition-all duration-700 idle-wave"
            style={{ height: `${fill}%`, background: `linear-gradient(180deg, ${theme.accent}cc, ${theme.primary})` }} />
          <div className="relative z-10 mb-8 text-center">
            <p className="text-3xl font-black text-white drop-shadow">{formatTokens(pending)}</p>
            <p className="text-xs text-white/70">{tenant.token_symbol} ready</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/70">
          {formatTokens(rate)} {tenant.token_symbol}/hour · storage {capHours}h
        </p>
        <button
          onClick={() => m.mutate()}
          disabled={m.isPending}
          onContextMenu={(e) => e.preventDefault()}
          className="mt-6 w-full rounded-2xl py-4 font-bold text-black disabled:opacity-50 active:scale-95 transition"
          style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary})` }}
        >
          {!started ? `Start ${tenant.action_verb || "Farming"}` : m.isPending ? "Collecting…" : "Collect"}
        </button>
        <p className="text-[11px] text-white/40 mt-2">Collecting is always free — ads are optional bonuses.</p>
      </div>
      <QuickTiles tenantSlug={tenant.slug} primary={theme.primary} />
      <style>{`.idle-wave{animation:idleWave 4s ease-in-out infinite}@keyframes idleWave{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}`}</style>
    </Shell>
  );
}
