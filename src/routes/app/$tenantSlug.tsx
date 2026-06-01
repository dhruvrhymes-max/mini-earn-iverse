import { createFileRoute, Link, Outlet, useParams, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { bootMiniApp, getUser, markOnboarded } from "@/lib/miniapp.functions";
import { EMPTY_MINI_TENANT, EMPTY_MINI_USER, MiniCtx } from "@/lib/miniapp-context";
import { Button } from "@/components/ui/button";
import { Home, ListChecks, Pickaxe, Users, User } from "lucide-react";
import { installClientErrorReporter, setTenantContext, reportClientError } from "@/lib/client-error-reporter";

type MiniBootState = { tenant: any | null; user: any | null; loading: boolean; error: string | null };
const BOOT_TIMEOUT_MS = 6_000;

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
  component: MiniLayout,
});

function MiniLayout() {
  const { tenantSlug } = useParams({ from: "/app/$tenantSlug" });
  const loc = useLocation();
  const searchKey = getSearchKey(loc.search);
  const boot = useServerFn(bootMiniApp);
  const getU = useServerFn(getUser);
  const bootRunKey = useRef("");
  const [bootState, setBootState] = useState<MiniBootState>(() => readBootCache(tenantSlug));

  useEffect(() => { installClientErrorReporter(); setTenantContext(tenantSlug); }, [tenantSlug]);

  const doBoot = useCallback(async () => {
    let tgId: number | null = null;
    let initData: string | null = null;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData) initData = tg.initData;
    else {
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
    <MiniCtx.Provider value={{ tenant: tenant ?? EMPTY_MINI_TENANT, user: user ?? EMPTY_MINI_USER, refetchUser: refetch }}>
      <Splash msg="Starting…" />
    </MiniCtx.Provider>
  );
  if (error && (!tenant || !user)) return (
    <MiniCtx.Provider value={{ tenant: tenant ?? EMPTY_MINI_TENANT, user: user ?? EMPTY_MINI_USER, refetchUser: refetch }}>
      <Centered>
      <h1 className="text-xl font-bold mb-2">Couldn't start</h1>
      <p className="text-sm text-white/60 mb-4">{error}</p>
      <Button onClick={doBoot}>Try again</Button>
      </Centered>
    </MiniCtx.Provider>
  );
  if (!tenant) return (
    <Centered>
      <h1 className="text-xl font-bold mb-2">Bot not available</h1>
      <p className="text-sm text-white/60">This mini app isn't active. Ask the bot owner to check setup.</p>
    </Centered>
  );
  if (!user) return (
    <Centered>
      <p className="text-sm text-white/70 mb-4">Setting things up…</p>
      <Button variant="secondary" onClick={doBoot}>Retry</Button>
    </Centered>
  );

  const theme = tenant.theme as any;
  const themeStyle: React.CSSProperties = { "--primary": theme.primary, "--background": theme.background, "--accent": theme.accent } as any;

  return (
    <MiniCtx.Provider value={{ tenant, user, refetchUser: refetch }}>
      <div style={{ background: theme.background, color: "white", ...themeStyle }} className="min-h-screen pb-20 max-w-md mx-auto">
        {!user.onboarded && <Onboarding tenantSlug={tenantSlug} userId={user.id} refetch={refetch} />}
        <Outlet />
        <BottomNav slug={tenantSlug} verb={tenant.action_verb} primary={theme.primary} />
      </div>
    </MiniCtx.Provider>
  );
}

function Splash({ msg }: { msg: string }) {
  return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">{msg}</div>;
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
  const items = [
    { to: "/app/$tenantSlug", label: "Home", Icon: Home, exact: true },
    { to: "/app/$tenantSlug/tasks", label: "Tasks", Icon: ListChecks },
    { to: "/app/$tenantSlug/mine", label: verb, Icon: Pickaxe, center: true },
    { to: "/app/$tenantSlug/refer", label: "Refer", Icon: Users },
    { to: "/app/$tenantSlug/profile", label: "Profile", Icon: User },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-black/80 backdrop-blur border-t border-white/10 flex justify-around items-center py-2 z-40">
      {items.map((it) => (
        <Link key={it.to} to={it.to} params={{ tenantSlug: slug }} activeOptions={{ exact: it.exact }}
          className={`flex flex-col items-center text-xs ${it.center ? "-mt-6" : ""}`}
          activeProps={{ style: { color: primary } }}>
          <div className={it.center ? "w-14 h-14 rounded-full flex items-center justify-center shadow-lg" : "p-1"} style={it.center ? { background: primary } : {}}>
            <it.Icon className={it.center ? "h-7 w-7 text-black" : "h-5 w-5"} />
          </div>
          <span className="mt-1 text-white/70">{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
