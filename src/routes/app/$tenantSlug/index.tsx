import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { useServerFn } from "@tanstack/react-start";
import { claimMining } from "@/lib/miniapp.functions";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeHome } from "@/components/mini/ThemeHome";
import { IdleHome, SpinHome, TapHome } from "@/components/mini/GameModes";

export const Route = createFileRoute("/app/$tenantSlug/")({
  component: Home,
});

function Home() {
  const { tenant, user, refetchUser } = useMini();
  const mode = tenant?.game_mode ?? "mine";
  if (mode === "tap") return <TapHome tenant={tenant} user={user} refetchUser={refetchUser} />;
  if (mode === "spin") return <SpinHome tenant={tenant} user={user} refetchUser={refetchUser} />;
  if (mode === "idle") return <IdleHome tenant={tenant} user={user} refetchUser={refetchUser} />;
  return <MineHome />;
}

function MineHome() {
  const { tenant, user, refetchUser } = useMini();
  const claim = useServerFn(claimMining);
  const m = useMutation({
    mutationFn: () => claim({ data: { userId: user.id } }),
    onSuccess: (r: any) => {
      if (r.claimed > 0) toast.success(`+${r.claimed.toFixed(2)} ${tenant.token_symbol}`);
      else if (r.started) toast.info("Mining started");
      refetchUser();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const econ = tenant.economics as any;
  const rate = econ.token_per_usdt || 10000;
  const usd = (Number(user.balance) / rate).toFixed(4);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!user.mining_started_at) { setRemaining(null); return; }
    const total = econ.mining_cycle_hours * 3600;
    const tick = () => {
      const elapsed = (Date.now() - new Date(user.mining_started_at).getTime()) / 1000;
      setRemaining(Math.max(0, total - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [user.mining_started_at, econ.mining_cycle_hours]);

  const ready = remaining !== null && remaining <= 0;
  const idle = !user.mining_started_at;

  return (
    <ThemeHome
      tenant={tenant}
      user={user}
      onMine={() => m.mutate()}
      mining={m.isPending}
      remaining={remaining}
      idle={idle}
      ready={ready}
      usd={usd}
      formatTime={formatTime}
    />
  );
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
