import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { useServerFn } from "@tanstack/react-start";
import { getMyTasks, completeTask, logAdReward } from "@/lib/miniapp.functions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Lock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/app/$tenantSlug/tasks")({
  component: TaskHub,
});

function TaskHub() {
  const { tenant, user, refetchUser } = useMini();
  const qc = useQueryClient();
  const getT = useServerFn(getMyTasks);
  const comp = useServerFn(completeTask);
  const adFn = useServerFn(logAdReward);
  const { data, refetch } = useQuery({
    queryKey: ["mtasks", user.id],
    queryFn: () => getT({ data: { userId: user.id, tenantId: tenant.id } }),
  });
  const m = useMutation({
    mutationFn: (t: { taskId: string; isGlobal: boolean }) => comp({ data: { userId: user.id, taskId: t.taskId, isGlobal: t.isGlobal } }),
    onSuccess: (r: any) => { toast.success(`+${r.reward}`); refetch(); refetchUser(); qc.invalidateQueries({ queryKey: ["mini-user"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const am = useMutation({
    mutationFn: (network: "adsgram" | "monetag" | "adexium") => adFn({ data: { userId: user.id, network } }),
    onSuccess: (r: any) => { toast.success(`+${r.reward.toFixed(2)} • ${Math.max(0, r.limit - r.used)}/${r.limit} left today`); refetch(); refetchUser(); },
    onError: (e: any) => toast.error(e.message),
  });

  const tasks = data?.tasks ?? [];
  const completed = new Set((data?.completed ?? []).map((c: any) => c.task_id));
  const social = tasks.filter((t: any) => t.kind === "social");
  const partner = tasks.filter((t: any) => t.kind === "partner");
  const watch = tasks.filter((t: any) => t.kind === "watch");
  const adsToday = data?.adsToday ?? 0;
  const adLimit = (tenant.ad_config as any).daily_watch_limit ?? 20;

  return (
    <div className="p-4 pt-8">
      <h1 className="text-2xl font-bold mb-4">Task Hub</h1>
      <Tabs defaultValue="social">
        <TabsList className="grid grid-cols-4 w-full bg-white/10">
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="partner">Partners</TabsTrigger>
          <TabsTrigger value="watch">Watch</TabsTrigger>
          <TabsTrigger value="refer">Refer</TabsTrigger>
        </TabsList>
        <TabsContent value="social" className="space-y-2 mt-4">
          {social.map((t: any) => <TaskRow key={t.id} t={t} done={completed.has(t.id)} onClaim={() => m.mutate({ taskId: t.id, isGlobal: !!t.is_global })} symbol={tenant.token_symbol} />)}
          {social.length === 0 && <Empty />}
        </TabsContent>
        <TabsContent value="partner" className="space-y-2 mt-4">
          {partner.map((t: any) => <TaskRow key={t.id} t={t} done={completed.has(t.id)} onClaim={() => m.mutate({ taskId: t.id, isGlobal: !!t.is_global })} symbol={tenant.token_symbol} />)}
          {partner.length === 0 && <Empty />}
        </TabsContent>
        <TabsContent value="watch" className="space-y-3 mt-4">
          <p className="text-sm text-white/60 text-center">{Math.max(0, adLimit - adsToday)}/{adLimit} ads left today</p>
          {(["adsgram", "monetag", "adexium"] as const).map((n) => (
            <Button key={n} onClick={() => am.mutate(n)} disabled={am.isPending || adsToday >= adLimit} className="w-full" variant="secondary">
              Watch {n.toUpperCase()} ad
            </Button>
          ))}
          {watch.map((t: any) => <TaskRow key={t.id} t={t} done={completed.has(t.id)} onClaim={() => m.mutate({ taskId: t.id, isGlobal: !!t.is_global })} symbol={tenant.token_symbol} />)}
        </TabsContent>
        <TabsContent value="refer" className="space-y-2 mt-4">
          <ReferMilestones milestones={data?.milestones ?? []} count={user.referral_count} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaskRow({ t, done, onClaim, symbol }: any) {
  return (
    <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
      <div className="flex-1">
        <p className="font-medium">{t.title}</p>
        <p className="text-xs text-white/60">+{t.reward} {symbol}</p>
      </div>
      {t.url && <a href={t.url} target="_blank" rel="noreferrer" className="text-white/60"><ExternalLink className="h-4 w-4" /></a>}
      {done ? <CheckCircle2 className="h-6 w-6 text-green-400" /> : <Button size="sm" onClick={onClaim}>Claim</Button>}
    </div>
  );
}

function Empty() { return <p className="text-center text-white/50 py-8">No tasks here yet.</p>; }

function ReferMilestones({ milestones, count }: { milestones: any[]; count: number }) {
  if (milestones.length === 0) return <Empty />;
  return (
    <div className="space-y-2">
      <p className="text-center text-white/80">You have <b>{count}</b> referrals</p>
      {milestones.map((m) => {
        const unlocked = count >= m.threshold;
        return (
          <div key={m.id} className={`rounded-lg p-3 flex items-center gap-3 ${unlocked ? "bg-primary/20" : "bg-white/5"}`}>
            {unlocked ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : <Lock className="h-5 w-5 text-white/40" />}
            <div className="flex-1">
              <p className="font-medium">{m.threshold} referrals → +{m.reward}</p>
              {m.label && <p className="text-xs text-white/60">{m.label}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
