import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { useServerFn } from "@tanstack/react-start";
import { claimMining } from "@/lib/miniapp.functions";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$tenantSlug/")({
  component: Home,
});

function Home() {
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
  const rate = econ.token_per_usdt;
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
    <div className="p-6 pt-12 text-center">
      <h1 className="text-sm uppercase text-white/60 tracking-wider">{tenant.name}</h1>
      <div className="mt-8 flex flex-col items-center">
        {tenant.token_icon_url && <img src={tenant.token_icon_url} alt={tenant.token_symbol} className="h-12 w-12 mb-2 rounded-full object-cover" />}
        <p className="text-5xl font-bold">{Number(user.balance).toFixed(2)}</p>
        <p className="text-white/60 mt-1">{tenant.token_symbol} · ${usd}</p>
      </div>
      <p className="mt-4 text-sm text-white/60">{econ.mining_rate_per_hour} {tenant.token_symbol}/hour</p>
      <button onClick={() => m.mutate()} disabled={m.isPending}
        className="mt-12 w-48 h-48 rounded-full mx-auto flex flex-col items-center justify-center text-black font-bold shadow-2xl active:scale-95 transition-transform"
        style={{ background: (tenant.theme as any).primary }}>
        {idle ? <><span className="text-2xl">{tenant.action_verb}</span><span className="text-sm font-normal">tap to start</span></>
         : ready ? <span className="text-2xl">CLAIM</span>
         : <><span className="text-3xl">{formatTime(remaining!)}</span><span className="text-sm font-normal">mining…</span></>}
      </button>
    </div>
  );
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
