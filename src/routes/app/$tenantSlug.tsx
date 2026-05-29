import { createFileRoute, Link, Outlet, useParams, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getTenantBySlug, initMiniAppUser, getUser, markOnboarded } from "@/lib/miniapp.functions";
import { MiniCtx } from "@/lib/miniapp-context";
import { Button } from "@/components/ui/button";
import { Home, ListChecks, Pickaxe, Users, User } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug")({
  component: MiniLayout,
});

function MiniLayout() {
  const { tenantSlug } = useParams({ from: "/app/$tenantSlug" });
  const loc = useLocation();
  const getT = useServerFn(getTenantBySlug);
  const initU = useServerFn(initMiniAppUser);
  const getU = useServerFn(getUser);

  const { data: tenant, isLoading: tenantLoading, isError: tenantErr, error: tErr } = useQuery({
    queryKey: ["mini-tenant", tenantSlug],
    queryFn: () => getT({ data: { slug: tenantSlug } }),
    retry: 1,
  });
  const [userId, setUserId] = useState<string | null>(() => typeof window !== "undefined" ? localStorage.getItem(`uid_${tenantSlug}`) : null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant || userId) return;
    let tgId: number | null = null;
    let initData: string | null = null;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData) initData = tg.initData;
    else {
      const stored = localStorage.getItem(`tgid_${tenantSlug}`);
      tgId = stored ? Number(stored) : Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem(`tgid_${tenantSlug}`, String(tgId));
    }
    const refTg = new URLSearchParams(loc.search as any).get?.("ref") ?? null;
    setInitError(null);
    initU({ data: { tenantSlug, initData, previewTgId: tgId, referrerTgId: refTg ? Number(refTg) : null } })
      .then((u: any) => { setUserId(u.id); localStorage.setItem(`uid_${tenantSlug}`, u.id); })
      .catch((e: any) => setInitError(e?.message ?? "Failed to start"));
  }, [tenant, userId, tenantSlug, initU, loc.search]);

  const { data: user, refetch } = useQuery({
    queryKey: ["mini-user", userId],
    queryFn: () => getU({ data: { userId: userId! } }),
    enabled: !!userId,
  });

  if (tenantLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">Loading bot…</div>;
  if (tenantErr || !tenant) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6 text-center">
      <h1 className="text-xl font-bold mb-2">Bot not available</h1>
      <p className="text-sm text-white/60">{tenantErr ? (tErr as any)?.message : "This mini app isn't active. Ask the bot owner to check setup."}</p>
    </div>
  );
  if (initError) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-6 text-center">
      <h1 className="text-xl font-bold mb-2">Couldn't start</h1>
      <p className="text-sm text-white/60 mb-4">{initError}</p>
      <Button onClick={() => { setInitError(null); localStorage.removeItem(`uid_${tenantSlug}`); setUserId(null); }}>Try again</Button>
    </div>
  );
  if (!user) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">Loading user…</div>;

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
