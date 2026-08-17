import { createFileRoute, Outlet, useParams, useLocation, useNavigate, useMatchRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { bootMiniApp, getTenantBySlug, getUser, markOnboarded } from "@/lib/miniapp.functions";
import { EMPTY_MINI_TENANT, EMPTY_MINI_USER, MiniCtx } from "@/lib/miniapp-context";
import { skinOf, familyOf } from "@/lib/theme-family";
import { Button } from "@/components/ui/button";
import { Home, ListChecks, Pickaxe, Users, User, Wallet } from "lucide-react";
import { installClientErrorReporter, setTenantContext, reportClientError } from "@/lib/client-error-reporter";

type MiniBootState = { tenant: any | null; user: any | null; loading: boolean; error: string | null; blocked?: { reason: string | null; originalUsername: string | null } | null };
const BOOT_TIMEOUT_MS = 12_000;

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
  // Only wait for the Telegram bridge when we are actually inside Telegram —
  // in a normal browser this would add a pointless delay before boot.
  const insideTelegram =
    Boolean((window as any).TelegramWebviewProxy) ||
    Boolean((window as any).Telegram?.WebApp?.platform && (window as any).Telegram.WebApp.platform !== "unknown") ||
    window.location.hash.includes("tgWebApp");
  if (!insideTelegram) return null;
  const deadline = Date.now() + 800;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, 40));
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

  // Paint an opaque page background (html/body + Telegram chrome) so the
  // Telegram-rendered bot avatar placeholder never shows through the app.
  const bgColor = (bootState.tenant?.theme as any)?.background || "#0a0a0a";
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    html.style.background = bgColor;
    body.style.background = bgColor;
    try {
      const wa = (window as any).Telegram?.WebApp;
      wa?.setBackgroundColor?.(bgColor);
      wa?.setHeaderColor?.(bgColor);
    } catch { /* ignore */ }
    return () => { html.style.background = prevHtml; body.style.background = prevBody; };
  }, [bgColor]);


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
      if ((result as any).blocked) {
        localStorage.removeItem(`mini_boot_${tenantSlug}`);
        localStorage.removeItem(`uid_${tenantSlug}`);
        setBootState({ tenant: result.tenant, user: null, loading: false, error: null, blocked: (result as any).blocked });
        return;
      }
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

  const { tenant, user, loading, error, blocked } = bootState;
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
      <Splash msg="Starting…" seo={seo} />
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
  if (blocked) return (
    <MiniCtx.Provider value={{ tenant: safeState.tenant, user: safeState.user, refetchUser: refetch }}>
      <Centered>
        <h1 className="text-xl font-bold mb-2">Account blocked</h1>
        <p className="text-sm text-white/70 mb-2">{blocked.reason ?? "Multiple accounts are not allowed."}</p>
        {blocked.originalUsername && (
          <p className="text-sm text-white/50">Please continue with your original account {blocked.originalUsername}.</p>
        )}
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
        {!user.onboarded && <Onboarding tenant={tenant} userId={user.id} refetch={refetch} />}
        <div className="relative z-10"><Outlet /></div>
        <BottomNav slug={tenantSlug} verb={tenant.action_verb} primary={theme.primary} tenant={tenant} />
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
    <main className="min-h-screen flex flex-col items-center justify-center text-white" style={{ background: bg }}>
      {/* Visible: a quiet branded loader only — no wall of text flashing on open. */}
      <div
        className="h-12 w-12 rounded-full border-2 border-white/15 animate-spin"
        style={{ borderTopColor: primary }}
        aria-hidden
      />
      <p className="mt-4 text-sm font-semibold" style={{ color: primary }}>{seo ? seo.name : ""}</p>

      {/* Kept in the HTML for crawlers/moderation review, hidden from members.
          Inline style (not a class) so it stays hidden before CSS loads. */}
      <div style={{ display: "none" }} aria-hidden>
        <h1>{seo ? seo.name : "Telegram earning mini app"}</h1>
        <p>
          {seo
            ? `${verb} to earn ${seo.token_name} (${seo.token_symbol}). ${modeCopy[seo.game_mode] ?? modeCopy.mine}`
            : "Play, complete quests and withdraw your rewards."}
        </p>
        <h2>How it works</h2>
        <ul>
          <li>{verb} in the app to collect {seo?.token_symbol ?? "tokens"} — always free, never behind an ad.</li>
          <li>Complete quests and optional "Watch ad &amp; earn" offers for bonus tokens.</li>
          <li>Invite friends and receive a share of what they earn.</li>
          <li>Convert tokens to USDT and withdraw to your wallet. Payouts are published publicly.</li>
        </ul>
        <p>{msg}</p>
      </div>
    </main>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6 text-center">{children}</div>;
}

function Onboarding({ tenant, userId, refetch }: { tenant: any; userId: string; refetch: () => void }) {
  const mark = useServerFn(markOnboarded);
  const [i, setI] = useState(0);
  const ob: any = tenant?.onboarding || {};
  const channels: any[] = Array.isArray(ob.channels) ? ob.channels.filter((c: any) => c?.url) : [];
  const [joined, setJoined] = useState<Record<number, boolean>>({});
  const allJoined = !ob.require_join || channels.every((_, n) => joined[n]);

  if (ob.enabled) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center text-white">
        {ob.image_url && <img src={ob.image_url} alt="" className="h-28 w-28 object-contain mb-4 rounded-2xl" />}
        <h2 className="text-2xl font-bold mb-2">{ob.title || "Welcome!"}</h2>
        <p className="text-sm text-white/80 max-w-xs whitespace-pre-line">{ob.text || ""}</p>
        <div className="w-full max-w-xs mt-6 space-y-2">
          {channels.map((c, n) => (
            <a
              key={n}
              href={c.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => setJoined((prev) => ({ ...prev, [n]: true }))}
              className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 text-sm"
            >
              <span>{c.title || "Join channel"}</span>
              <span className="text-xs text-white/60">{joined[n] ? "Joined" : "Join"}</span>
            </a>
          ))}
        </div>
        <Button
          className="mt-8"
          disabled={!allJoined}
          onClick={async () => { await mark({ data: { userId } }); refetch(); }}
        >
          {allJoined ? (tenant?.welcome_cta_text || "Start") : "Join to continue"}
        </Button>
      </div>
    );
  }

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

function BottomNav({ slug, verb, primary, tenant }: { slug: string; verb: string; primary: string; tenant: any }) {
  const nav = useNavigate();
  const matchRoute = useMatchRoute();
  const skin = skinOf(tenant);
  const DEST: Record<string, { to: string; label: string; Icon: any; exact?: boolean }> = {
    home: { to: "/app/$tenantSlug", label: "Home", Icon: Home, exact: true },
    tasks: { to: "/app/$tenantSlug/tasks", label: "Tasks", Icon: ListChecks },
    miners: { to: "/app/$tenantSlug/miners", label: verb, Icon: Pickaxe },
    refer: { to: "/app/$tenantSlug/refer", label: "Refer", Icon: Users },
    profile: { to: "/app/$tenantSlug/profile", label: "Profile", Icon: User },
    wallet: { to: "/app/$tenantSlug/withdraw", label: "Cash", Icon: Wallet },
  };
  const keys = skin.navKeys;
  const centerIndex = skin.centerAction ? Math.floor(keys.length / 2) : -1;

  return (
    <nav className={skin.nav} style={skin.navStyle(primary)}>
      {keys.map((key, idx) => {
        const it = DEST[key];
        const isCenter = idx === centerIndex;
        const active = !!matchRoute({ to: it.to, params: { tenantSlug: slug } as any, ...(it.exact ? { fuzzy: false } : { fuzzy: true }) } as any);
        return (
          <button
            key={key}
            type="button"
            onClick={() => nav({ to: it.to as any, params: { tenantSlug: slug } as any })}
            onContextMenu={(e) => e.preventDefault()}
            className={`${skin.navItem} bg-transparent border-0 outline-none select-none ${isCenter ? "-mt-7" : ""}`}
            style={active ? { color: primary } : { color: "rgba(255,255,255,0.65)" }}
          >
            {isCenter ? (
              <div
                className="w-14 h-14 flex items-center justify-center shadow-lg"
                style={{
                  background: primary,
                  clipPath: skin.centerAction && tenantFamilyIsForge(tenant)
                    ? "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)"
                    : undefined,
                  borderRadius: tenantFamilyIsForge(tenant) ? 0 : 9999,
                }}
              >
                <it.Icon className="h-7 w-7 text-black" />
              </div>
            ) : (
              <div className={skin.navIconWrap(active)}>
                <it.Icon className="h-5 w-5" />
              </div>
            )}
            <span className={`mt-1 ${skin.labelClass}`}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function tenantFamilyIsForge(tenant: any) {
  return familyOf(tenant) === "forge";
}
