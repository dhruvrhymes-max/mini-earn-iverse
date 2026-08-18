/**
 * 2026 earn loops — four brand new mini app formats that sit alongside
 * mine / tap / spin / idle:
 *
 *   scratch  — reveal a hidden prize by scratching foil off a card
 *   quiz     — answer one trivia question per window, streaks pay more
 *   streak   — daily check-in calendar with a rising day multiplier
 *   forecast — call the next round up or down, hot streaks multiply
 *
 * Each has its own interaction, layout and motion so they never read as a
 * recoloured copy of the mining screen.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BalanceCard, QuickTiles, Shell } from "./GameModes";
import { answerQuiz, dailyCheckIn, getModeState, placeForecast, scratchCard } from "@/lib/game.functions";
import { formatTokens } from "@/lib/format";
import { Check, Flame, Sparkles, TrendingDown, TrendingUp, X } from "lucide-react";

type Props = { tenant: any; user: any; refetchUser: () => void };

function useModeState(userId: string) {
  const load = useServerFn(getModeState);
  const [state, setState] = useState<any>(null);
  const refresh = useCallback(() => {
    load({ data: { userId } }).then(setState).catch(() => {});
  }, [load, userId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { state, setState, refresh };
}

function useCountdown(readyAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, readyAt - now);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return { ready: left <= 0, label: h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, "0")}` };
}

/* ───────────────────────────── SCRATCH TO EARN ───────────────────────────── */
export function ScratchHome({ tenant, user, refetchUser }: Props) {
  const theme = tenant.theme || {};
  const { state, refresh } = useModeState(user.id);
  const scratch = useServerFn(scratchCard);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const readyAt = state?.scratch?.ready_at ?? 0;
  const cd = useCountdown(readyAt);

  // paint the foil layer
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, "#8b8b93"); grad.addColorStop(0.45, "#d8d8e0");
    grad.addColorStop(0.55, "#a0a0aa"); grad.addColorStop(1, "#6e6e78");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.font = "bold 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("SCRATCH HERE", c.width / 2, c.height / 2 + 5);
  }, [revealed, cd.ready]);

  const erase = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!cd.ready || revealed || busy) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(e.clientX - r.left, e.clientY - r.top, 22, 0, Math.PI * 2);
    ctx.fill();
    // count cleared pixels occasionally
    if (Math.random() < 0.25) {
      const img = ctx.getImageData(0, 0, c.width, c.height).data;
      let clear = 0;
      for (let i = 3; i < img.length; i += 40) if (img[i] === 0) clear++;
      if (clear / (img.length / 40) > 0.45) void reveal();
    }
  };

  async function reveal() {
    if (busy || revealed) return;
    setBusy(true);
    try {
      const r: any = await scratch({ data: { userId: user.id } });
      if (!r.ok) { toast.info("Next card isn't ready yet"); refresh(); return; }
      setPrize(r.amount); setRevealed(true);
      const c = canvasRef.current;
      if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      toast.success(`+${formatTokens(r.amount)} ${tenant.token_symbol}`);
      refetchUser(); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Scratch failed"); }
    finally { setBusy(false); }
  }

  return (
    <Shell tenant={tenant}>
      <BalanceCard tenant={tenant} user={user} />
      <div className="mt-7">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45 mb-3">Today&apos;s card</p>
        <div
          className="relative rounded-3xl overflow-hidden border p-1"
          style={{ borderColor: `${theme.primary}55`, background: `${theme.primary}14` }}
        >
          <div className="relative h-44 rounded-[20px] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: `radial-gradient(120% 100% at 50% 0%, ${theme.accent}33, ${theme.background})` }}>
            <Sparkles className="w-7 h-7 mb-2" style={{ color: theme.accent }} />
            <p className="text-4xl font-black" style={{ color: theme.primary }}>
              {revealed && prize !== null ? `+${formatTokens(prize)}` : "???"}
            </p>
            <p className="text-xs text-white/55 mt-1">{tenant.token_symbol}</p>
            {cd.ready && !revealed && (
              <canvas
                ref={canvasRef}
                onPointerMove={(e) => e.buttons === 1 && erase(e)}
                onPointerDown={erase}
                onContextMenu={(e) => e.preventDefault()}
                className="absolute inset-0 w-full h-full touch-none cursor-pointer"
              />
            )}
          </div>
        </div>
        <button
          disabled={!cd.ready || busy}
          onClick={() => (revealed ? refresh() : reveal())}
          onContextMenu={(e) => e.preventDefault()}
          className="mt-4 w-full rounded-2xl py-3.5 font-black uppercase tracking-widest text-black disabled:opacity-40 active:scale-[0.98] transition"
          style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary})` }}
        >
          {cd.ready ? (revealed ? "Card claimed" : "Reveal instantly") : `Next card in ${cd.label}`}
        </button>
        <p className="text-[11px] text-white/40 mt-2 text-center">
          Prizes: {(state?.scratch?.prizes ?? []).map((p: number) => formatTokens(p)).join(" · ")}
        </p>
      </div>
      <QuickTiles tenantSlug={tenant.slug} primary={theme.primary} />
    </Shell>
  );
}

/* ────────────────────────────── QUIZ TO EARN ────────────────────────────── */
export function QuizHome({ tenant, user, refetchUser }: Props) {
  const theme = tenant.theme || {};
  const { state, refresh } = useModeState(user.id);
  const send = useServerFn(answerQuiz);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const cd = useCountdown(state?.quiz?.ready_at ?? 0);
  const quiz = state?.quiz;

  async function submit() {
    if (choice === null || result) return;
    try {
      const r: any = await send({ data: { userId: user.id, choice } });
      if (!r.ok) { toast.info("Next question isn't ready"); refresh(); return; }
      setResult(r);
      if (r.correct) toast.success(`Correct! +${formatTokens(r.amount)} ${tenant.token_symbol}`);
      else toast.error("Wrong answer — streak reset");
      refetchUser(); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  return (
    <Shell tenant={tenant}>
      <BalanceCard tenant={tenant} user={user} />
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Knowledge round</p>
        <span className="text-xs font-bold flex items-center gap-1" style={{ color: theme.accent }}>
          <Flame className="w-3.5 h-3.5" /> {quiz?.streak ?? 0} streak
        </span>
      </div>

      {cd.ready ? (
        <>
          <div className="mt-3 rounded-3xl p-5 border" style={{ borderColor: `${theme.primary}44`, background: "rgba(255,255,255,0.04)" }}>
            <p className="text-lg font-bold leading-snug">{quiz?.question?.q ?? "Loading…"}</p>
          </div>
          <div className="mt-3 space-y-2.5">
            {(quiz?.question?.options ?? []).map((opt: string, i: number) => {
              const picked = choice === i;
              const isAnswer = result && result.answer === i;
              const isWrong = result && picked && !result.correct;
              return (
                <button
                  key={i}
                  disabled={!!result}
                  onClick={() => setChoice(i)}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full text-left rounded-2xl px-4 py-3.5 border flex items-center justify-between transition active:scale-[0.99]"
                  style={{
                    borderColor: isAnswer ? "#22c55e" : isWrong ? "#ef4444" : picked ? theme.primary : "rgba(255,255,255,0.12)",
                    background: isAnswer ? "rgba(34,197,94,0.14)" : isWrong ? "rgba(239,68,68,0.14)" : picked ? `${theme.primary}1f` : "rgba(255,255,255,0.03)",
                  }}
                >
                  <span className="text-sm">{opt}</span>
                  {isAnswer && <Check className="w-4 h-4 text-green-400" />}
                  {isWrong && <X className="w-4 h-4 text-red-400" />}
                </button>
              );
            })}
          </div>
          <button
            disabled={choice === null || !!result}
            onClick={submit}
            className="mt-4 w-full rounded-2xl py-3.5 font-black uppercase tracking-widest text-black disabled:opacity-40 active:scale-[0.98] transition"
            style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary})` }}
          >
            {result ? "Answered" : `Lock answer · +${formatTokens(quiz?.reward ?? 0)}`}
          </button>
        </>
      ) : (
        <div className="mt-4 rounded-3xl p-8 border text-center" style={{ borderColor: `${theme.primary}33`, background: "rgba(255,255,255,0.03)" }}>
          <p className="text-sm text-white/60">Next question unlocks in</p>
          <p className="text-3xl font-black mt-1" style={{ color: theme.primary }}>{cd.label}</p>
        </div>
      )}
      <QuickTiles tenantSlug={tenant.slug} primary={theme.primary} />
    </Shell>
  );
}

/* ───────────────────────── CHECK-IN / STREAK TO EARN ─────────────────────── */
export function StreakHome({ tenant, user, refetchUser }: Props) {
  const theme = tenant.theme || {};
  const { state, refresh } = useModeState(user.id);
  const claim = useServerFn(dailyCheckIn);
  const [busy, setBusy] = useState(false);
  const c = state?.checkin;
  const cd = useCountdown(c?.ready_at ?? 0);
  const days = Array.from({ length: c?.max_days ?? 7 }, (_, i) => i + 1);

  async function onClaim() {
    setBusy(true);
    try {
      const r: any = await claim({ data: { userId: user.id } });
      if (!r.ok) { toast.info("Come back tomorrow"); refresh(); return; }
      toast.success(`Day ${r.day} · +${formatTokens(r.amount)} ${tenant.token_symbol}`);
      refetchUser(); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <Shell tenant={tenant}>
      <BalanceCard tenant={tenant} user={user} />
      <p className="mt-6 text-[11px] uppercase tracking-[0.3em] text-white/45">Streak calendar</p>
      <div className="mt-3 grid grid-cols-4 gap-2.5">
        {days.map((d) => {
          const done = d <= (c?.streak ?? 0);
          const next = d === (c?.streak ?? 0) + 1;
          const amount = (c?.base ?? 0) + (d - 1) * (c?.step ?? 0);
          return (
            <div
              key={d}
              className="rounded-2xl py-3 flex flex-col items-center border relative overflow-hidden"
              style={{
                borderColor: done ? theme.primary : next ? theme.accent : "rgba(255,255,255,0.1)",
                background: done ? `${theme.primary}26` : next ? `${theme.accent}14` : "rgba(255,255,255,0.03)",
                boxShadow: next ? `0 0 22px -8px ${theme.accent}` : undefined,
              }}
            >
              <span className="text-[10px] uppercase tracking-wider text-white/50">Day {d}</span>
              <span className="text-sm font-black mt-0.5" style={{ color: done ? theme.primary : "#fff" }}>
                {formatTokens(amount)}
              </span>
              {done && <Check className="w-3.5 h-3.5 mt-1 text-green-400" />}
            </div>
          );
        })}
      </div>
      <button
        disabled={!cd.ready || busy}
        onClick={onClaim}
        onContextMenu={(e) => e.preventDefault()}
        className="mt-5 w-full rounded-full py-4 font-black uppercase tracking-[0.2em] text-black disabled:opacity-40 active:scale-[0.98] transition"
        style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.primary})`, boxShadow: `0 0 40px -12px ${theme.primary}` }}
      >
        {cd.ready ? `Check in · day ${(c?.streak ?? 0) + 1}` : `Next check-in in ${cd.label}`}
      </button>
      <p className="text-[11px] text-white/40 mt-2 text-center">
        Miss a day and the calendar restarts at day 1.
      </p>
      <QuickTiles tenantSlug={tenant.slug} primary={theme.primary} />
    </Shell>
  );
}

/* ──────────────────────────── FORECAST TO EARN ───────────────────────────── */
export function ForecastHome({ tenant, user, refetchUser }: Props) {
  const theme = tenant.theme || {};
  const { state, refresh } = useModeState(user.id);
  const place = useServerFn(placeForecast);
  const [last, setLast] = useState<any>(null);
  const [pending, setPending] = useState<"up" | "down" | null>(null);
  const f = state?.forecast;
  const cd = useCountdown(f?.ready_at ?? 0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 900);
    return () => window.clearInterval(id);
  }, []);
  const spark = Array.from({ length: 16 }, (_, i) => 20 + 26 * Math.abs(Math.sin((i + tick) * 0.7)));

  async function call(direction: "up" | "down") {
    if (!cd.ready || pending) return;
    setPending(direction);
    try {
      const r: any = await place({ data: { userId: user.id, direction } });
      if (!r.ok) { toast.info("Round still locked"); refresh(); return; }
      setLast(r);
      if (r.won) toast.success(`Called it! +${formatTokens(r.amount)} ${tenant.token_symbol}`);
      else toast.error(`Missed — consolation +${formatTokens(r.amount)}`);
      refetchUser(); refresh();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setPending(null); }
  }

  return (
    <Shell tenant={tenant}>
      <BalanceCard tenant={tenant} user={user} />
      <div className="mt-6 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">Next round</p>
        <span className="text-xs font-bold flex items-center gap-1" style={{ color: theme.accent }}>
          <Flame className="w-3.5 h-3.5" /> {f?.streak ?? 0} in a row
        </span>
      </div>

      <div className="mt-3 rounded-3xl border p-4 overflow-hidden"
        style={{ borderColor: `${theme.primary}44`, background: `linear-gradient(180deg, ${theme.primary}14, transparent)` }}>
        <div className="flex items-end gap-1 h-24">
          {spark.map((h, i) => (
            <div key={i} className="flex-1 rounded-t transition-all duration-700"
              style={{ height: `${h}%`, background: i % 2 ? theme.accent : theme.primary, opacity: 0.35 + (i / spark.length) * 0.65 }} />
          ))}
        </div>
        <p className="text-center text-xs text-white/50 mt-2">
          {last ? `Last round closed ${last.outcome.toUpperCase()}` : "Call the direction of the next close"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {(["up", "down"] as const).map((dir) => (
          <button
            key={dir}
            disabled={!cd.ready || !!pending}
            onClick={() => call(dir)}
            onContextMenu={(e) => e.preventDefault()}
            className="rounded-3xl py-6 flex flex-col items-center gap-2 border font-black uppercase tracking-widest disabled:opacity-40 active:scale-[0.97] transition"
            style={{
              borderColor: dir === "up" ? "#22c55e88" : "#ef444488",
              background: dir === "up" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            }}
          >
            {dir === "up" ? <TrendingUp className="w-7 h-7 text-green-400" /> : <TrendingDown className="w-7 h-7 text-red-400" />}
            <span className="text-sm">{dir}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-white/45 mt-3">
        {cd.ready
          ? `Win +${formatTokens(f?.reward ?? 0)} ${tenant.token_symbol} · streaks add up to +100%`
          : `New round in ${cd.label}`}
      </p>
      <QuickTiles tenantSlug={tenant.slug} primary={theme.primary} />
    </Shell>
  );
}
