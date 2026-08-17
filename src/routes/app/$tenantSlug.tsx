import { createFileRoute, Outlet, useParams, useLocation, useNavigate, useMatchRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { bootMiniApp, getTenantBySlug, getUser, markOnboarded } from "@/lib/miniapp.functions";
import { EMPTY_MINI_TENANT, EMPTY_MINI_USER, MiniCtx } from "@/lib/miniapp-context";
import { Button } from "@/components/ui/button";
import { Home, ListChecks, Pickaxe, Users, User } from "lucide-react";
import { installClientErrorReporter, setTenantContext, reportClientError } from "@/lib/client-error-reporter";
import { lazy, Suspense as ReactSuspense } from "react";
const Theme3D = lazy(() => import("@/components/mini/Theme3D"));

type MiniBootState = { tenant: any | null; user: any | null; loading: boolean; error: string | null };
const BOOT_TIMEOUT_MS = 15_000;

async function readTelegramInitData(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const read = () => {
    const webApp = (window as any).Telegram?.WebApp;
    const initData = typeof webApp?.initData === "string" ? webApp.initData : "";
    if (!initData) return null;
    try { webApp.ready?.(); webApp.expand?.(); } catch { /* Telegram API may be unavailable in preview */ }
    return initData;
  };
  const immediate = read();
  if (immediate) return immediate;
  const deadline = Date.now() + 1_200;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    const value = read();
    if (value) return value;
  }
  return null;
}

function normalizeBootState(state: MiniBootState): MiniBootState {
  return {
    ...state,
    tenant: state.tenant ?? EMPTY_MINI_TENANT,
    user: state.user ?? EMPTY_MINI_USER,
  };
}

function readBootCache(slug: string): MiniBootState {
  if (typeof window === "undefined") return { tenant: null, user: null, loading: true, error: null };
  try {
    const cached = JSON.parse(localStorage.getItem(`mini_boot_${slug}`) || "null");
    if (cached?.tenant?.id && cached?.user?.id) return { tenant: cached.tenant, user: cached.user, loading: true, error: null };
  } catch {
    localStorage.removeItem(`mini_boot_${slug}`);
  }
  return { tenant: null, user: null, loading: true, error: null };
}

function writeBootCache(slug: string, tenant: any, user: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`mini_boot_${slug}`, JSON.stringify({ tenant, user, cachedAt: Date.now() }));
  localStorage.setItem(`uid_${slug}`, user.id);
}

function getSearchValue(search: unknown, key: string): string | null {
  if (typeof search === "string") return new URLSearchParams(search).get(key);
  if (search && typeof search === "object") {
    const value = (search as Record<string, unknown>)[key];
    return typeof value === "string" ? value : value == null ? null : String(value);
  }
  return null;
}

function getSearchKey(search: unknown): string {
  if (typeof search === "string") return search;
  try { return JSON.stringify(search ?? {}); } catch { return "{}"; }
}

export const Route = createFileRoute("/app/$tenantSlug")({
  // Server-rendered so the very first HTML response contains real, readable
  // content (name, token, how it works) for moderation crawlers and previews.
  loader: async ({ params }) => {
    try {
      const tenant: any = await getTenantBySlug({ data: { slug: params.tenantSlug } });
      if (!tenant) return { seo: null };
      return {
        seo: {
          name: tenant.name as string,
          token_name: tenant.token_name as string,
          token_symbol: tenant.token_symbol as string,
          action_verb: tenant.action_verb as string,
          game_mode: (tenant.game_mode ?? "mine") as string,
          background: (tenant.theme?.background ?? "#0a0a0a") as string,
          primary: (tenant.theme?.primary ?? "#f59e0b") as string,
        },
      };
    } catch {
      return { seo: null };
    }
  },
  head: ({ loaderData }) => {
    const seo = (loaderData as any)?.seo;
    const title = seo ? `${seo.name} — earn ${seo.token_symbol} on Telegram` : "Telegram earning mini app";
    const description = seo
      ? `${seo.action_verb} to earn ${seo.token_name} (${seo.token_symbol}), complete quests, watch optional rewarded ads, invite friends and withdraw USDT.`
      : "Play, complete quests and withdraw rewards from this Telegram mini app.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: MiniLayout,
});

function MiniLayout() {
  const { tenantSlug } = useParams({ from: "/app/$tenantSlug" });
  const seo = (Route.useLoaderData() as any)?.seo ?? null;
  const loc = useLocation();
  const searchKey = getSearchKey(loc.search);
  const boot = useServerFn(bootMiniApp);
  const getU = useServerFn(getUser);
  const bootRunKey = useRef("");
  const [bootState, setBootState] = useState<MiniBootState>(() => readBootCache(tenantSlug));

  useEffect(() => { installClientErrorReporter(); setTenantContext(tenantSlug); }, [tenantSlug]);

  // Hard-block long-press URL previews at the document level for all routes
  useEffect(() => {
    const stop = (e: Event) => { e.preventDefault(); };
    const stopContext = (e: MouseEvent) => { e.preventDefault(); return false; };
    let pressTimer: number | null = null;
    const onTouchStart = () => {
      if (pressTimer) window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => { /* consume long-press window */ }, 300);
    };
    const onTouchEnd = () => { if (pressTimer) { window.clearTimeout(pressTimer); pressTimer = null; } };
    document.addEventListener("contextmenu", stopContext, { capture: true });
    document.addEventListener("dragstart", stop, { capture: true });
    document.addEventListener("selectstart", stop, { capture: true });
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    try {
      const wa = (window as any).Telegram?.WebApp;
      wa?.disableVerticalSwipes?.();
      wa?.expand?.();
    } catch { /* Telegram API may be unavailable */ }
    return () => {
      document.removeEventListener("contextmenu", stopContext, { capture: true } as any);
      document.removeEventListener("dragstart", stop, { capture: true } as any);
      document.removeEventListener("selectstart", stop, { capture: true } as any);
      document.removeEventListener("touchstart", onTouchStart as any);
      document.removeEventListener("touchend", onTouchEnd as any);
    };
  }, []);

  const doBoot = useCallback(async () => {
    let tgId: number | null = null;
    const initData = await readTelegramInitData();
    if (!initData) {
      const stored = localStorage.getItem(`tgid_${tenantSlug}`);
      tgId = stored ? Number(stored) : Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem(`tgid_${tenantSlug}`, String(tgId));
    }
    const refTg = getSearchValue(loc.search, "ref");
    setBootState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await boot({ data: { tenantSlug, initData, previewTgId: tgId, referrerTgId: refTg ? Number(refTg) : null } });
      if (!result.tenant || !result.user) {
        localStorage.removeItem(`mini_boot_${tenantSlug}`);
        localStorage.removeItem(`uid_${tenantSlug}`);
        setBootState({ tenant: result.tenant, user: null, loading: false, error: null });
        return;
      }
      writeBootCache(tenantSlug, result.tenant, result.user);
      setTenantContext(tenantSlug, result.tenant.id);
      setBootState({ tenant: result.tenant, user: result.user, loading: false, error: null });
    } catch (e: any) {
      reportClientError(e, { stage: "bootMiniApp" });
      setBootState((prev) => ({ ...prev, loading: false, error: e?.message ?? "Failed to start" }));
    }
  }, [boot, searchKey, tenantSlug]);

  useEffect(() => {
    const key = `${tenantSlug}:${searchKey}`;
    if (bootRunKey.current === key) return;
    bootRunKey.current = key;
    setBootState((prev) => (prev.tenant?.slug === tenantSlug && prev.user?.id ? prev : readBootCache(tenantSlug)));
    doBoot();
    const timeout = window.setTimeout(() => {
      setBootState((prev) => prev.loading && (!prev.tenant || !prev.user)
        ? { ...prev, loading: false, error: "Startup took too long. Tap Try again." }
        : prev);
    }, BOOT_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, tenantSlug]);

  const { tenant, user, loading, error } = bootState;
  const safeState = normalizeBootState(bootState);
  const refetch = useCallback(async () => {
    if (!user?.id) return;
    const fresh = await getU({ data: { userId: user.id } });
    if (!fresh) {
      localStorage.removeItem(`mini_boot_${tenantSlug}`);
      localStorage.removeItem(`uid_${tenantSlug}`);
      await doBoot();
      return;
    }
    setBootState((prev) => {
      if (prev.tenant) writeBootCache(tenantSlug, prev.tenant, fresh);
      return { ...prev, user: fresh, loading: false, error: null };
    });
  }, [doBoot, getU, tenantSlug, user?.id]);

  if (loading && (!tenant || !user)) return (
    <MiniCtx.Provider value={{ tenant: safeState.tenant, user: safeState.user, refetchUser: refetch }}>
      <Splash msg="Starting…" />
    </MiniCtx.Provider>
  );
  if (error && (!tenant || !user)) return (
    <MiniCtx.Provider value={{ tenant: safeState.tenant, user: safeState.user, refetchUser: refetch }}>
      <Centered>
      <h1 className="text-xl font-bold mb-2">Couldn't start</h1>
      <p className="text-sm text-white/60 mb-4">{error}</p>
      <Button onClick={doBoot}>Try again</Button>
      </Centered>
    </MiniCtx.Provider>
  );
  if (!tenant) return (
    <MiniCtx.Provider value={{ tenant: safeState.tenant, user: safeState.user, refetchUser: refetch }}>
      <Centered>
        <h1 className="text-xl font-bold mb-2">Bot not available</h1>
        <p className="text-sm text-white/60">This mini app isn't active. Ask the bot owner to check setup.</p>
      </Centered>
    </MiniCtx.Provider>
  );
  if (!user) return (
    <MiniCtx.Provider value={{ tenant: safeState.tenant, user: safeState.user, refetchUser: refetch }}>
      <Centered>
        <p className="text-sm text-white/70 mb-4">Setting things up…</p>
        <Button variant="secondary" onClick={doBoot}>Retry</Button>
      </Centered>
    </MiniCtx.Provider>
  );

  const theme = tenant.theme as any;
  const themeStyle: React.CSSProperties = { "--primary": theme.primary, "--background": theme.background, "--accent": theme.accent } as any;

  return (
    <MiniCtx.Provider value={{ tenant, user, refetchUser: refetch }}>
      <div
        style={{ background: theme.background, color: "white", ...themeStyle }}
        className="tg-mini min-h-screen pb-20 max-w-md mx-auto relative"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <ReactSuspense fallback={null}>
          <Theme3D scene={theme.scene ?? "gold"} primary={theme.primary} accent={theme.accent} background={theme.background} />
        </ReactSuspense>
        {!user.onboarded && <Onboarding tenantSlug={tenantSlug} userId={user.id} refetch={refetch} />}
        <div className="relative z-10"><Outlet /></div>
        <BottomNav slug={tenantSlug} verb={tenant.action_verb} primary={theme.primary} />
      </div>
    </MiniCtx.Provider>
  );
}

/**
 * Rendered on the server for the very first paint, so the initial HTML always
 * contains real, readable content instead of an empty JS-only shell.
 */
function Splash({ msg, seo }: { msg: string; seo: any }) {
  const bg = seo?.background ?? "#0a0a0a";
  const primary = seo?.primary ?? "#f59e0b";
  const verb = seo?.action_verb ?? "Earn";
  const modeCopy: Record<string, string> = {
    mine: "Start a cycle, come back and claim your tokens.",
    tap: "Tap to earn instantly — energy refills over time.",
    spin: "Spin the free wheel and win token prizes.",
    idle: "Production runs while you're away — collect on return.",
  };
  return (
    <main className="min-h-screen px-6 py-10 text-white" style={{ background: bg }}>
      <h1 className="text-3xl font-black" style={{ color: primary }}>
        {seo ? seo.name : "Telegram earning mini app"}
      </h1>
      <p className="mt-3 text-white/75 max-w-md">
        {seo
          ? `${verb} to earn ${seo.token_name} (${seo.token_symbol}). ${modeCopy[seo.game_mode] ?? modeCopy.mine}`
          : "Play, complete quests and withdraw your rewards."}
      </p>
      <section className="mt-8 space-y-3 max-w-md">
        <h2 className="text-lg font-bold">How it works</h2>
        <ul className="space-y-2 text-sm text-white/70 list-disc pl-5">
          <li>{verb} in the app to collect {seo?.token_symbol ?? "tokens"} — always free, never behind an ad.</li>
          <li>Complete quests and optional "Watch ad &amp; earn" offers for bonus tokens.</li>
          <li>Invite friends and receive a share of what they earn.</li>
          <li>Convert tokens to USDT and withdraw to your wallet. Payouts are published publicly.</li>
        </ul>
      </section>
      <p className="mt-8 text-xs text-white/40">{msg}</p>
    </main>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6 text-center">{children}</div>;
}

function Onboarding({ userId, refetch }: { tenantSlug: string; userId: string; refetch: () => void }) {
  const mark = useServerFn(markOnboarded);
  const [i, setI] = useState(0);
  const slides = [
    { title: "Welcome!", body: "Earn tokens by mining, completing tasks, and inviting friends." },
    { title: "Tap to mine", body: "Start your mining cycle and claim rewards every few hours." },
    { title: "Cash out", body: "Convert tokens to USDT and withdraw to your crypto wallet." },
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center text-white">
      <h2 className="text-3xl font-bold mb-4">{slides[i].title}</h2>
      <p className="text-lg text-white/80 max-w-xs">{slides[i].body}</p>
      <div className="flex gap-1 mt-6">{slides.map((_, n) => <div key={n} className={`w-2 h-2 rounded-full ${n === i ? "bg-white" : "bg-white/30"}`} />)}</div>
      <Button className="mt-8" onClick={async () => {
        if (i < slides.length - 1) setI(i + 1);
        else { await mark({ data: { userId } }); refetch(); }
      }}>{i < slides.length - 1 ? "Next" : "Start"}</Button>
    </div>
  );
}

function BottomNav({ slug, verb, primary }: { slug: string; verb: string; primary: string }) {
  const nav = useNavigate();
  const matchRoute = useMatchRoute();
  const items: Array<{ to: string; label: string; Icon: any; exact?: boolean; center?: boolean }> = [
    { to: "/app/$tenantSlug", label: "Home", Icon: Home, exact: true },
    { to: "/app/$tenantSlug/tasks", label: "Tasks", Icon: ListChecks },
    { to: "/app/$tenantSlug/miners", label: verb, Icon: Pickaxe, center: true },
    { to: "/app/$tenantSlug/refer", label: "Refer", Icon: Users },
    { to: "/app/$tenantSlug/profile", label: "Profile", Icon: User },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-black/80 backdrop-blur border-t border-white/10 flex justify-around items-center py-2 z-40">
      {items.map((it) => {
        const active = !!matchRoute({ to: it.to, params: { tenantSlug: slug } as any, ...(it.exact ? { fuzzy: false } : { fuzzy: true }) } as any);
        return (
          <button
            key={it.to}
            type="button"
            onClick={() => nav({ to: it.to as any, params: { tenantSlug: slug } as any })}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex flex-col items-center text-xs bg-transparent border-0 outline-none select-none ${it.center ? "-mt-6" : ""}`}
            style={active ? { color: primary } : undefined}
          >
            <div className={it.center ? "w-14 h-14 rounded-full flex items-center justify-center shadow-lg" : "p-1"} style={it.center ? { background: primary } : {}}>
              <it.Icon className={it.center ? "h-7 w-7 text-black" : "h-5 w-5"} />
            </div>
            <span className="mt-1 text-white/70">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
