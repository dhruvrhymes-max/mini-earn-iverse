import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { skinOf } from "@/lib/theme-family";
import { useServerFn } from "@tanstack/react-start";
import { getMyTasks, completeTask, logAdReward } from "@/lib/miniapp.functions";
import { listAdProviders } from "@/lib/ad-providers.functions";
import { AdSlot, type AdProvider } from "@/components/mini/AdRunner";
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
  const skin = skinOf(tenant);
  const th = tenant.theme as any;
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
    mutationFn: (v: { network: any; providerId?: string | null }) =>
      adFn({ data: { userId: user.id, network: v.network, providerId: v.providerId ?? null } }),
    onSuccess: (r: any) => { toast.success(`+${r.reward.toFixed(2)} • ${Math.max(0, r.limit - r.used)}/${r.limit} left today`); refetch(); refetchUser(); },
    onError: (e: any) => toast.error(e.message),
  });
  const listAds = useServerFn(listAdProviders);
  const { data: adProviders = [] } = useQuery({
    queryKey: ["ad-providers", tenant.id],
    queryFn: () => listAds({ data: { tenantId: tenant.id } }) as Promise<AdProvider[]>,
  });

  const tasks = data?.tasks ?? [];
  const completed = new Set((data?.completed ?? []).map((c: any) => c.task_id));
  const social = tasks.filter((t: any) => t.kind === "social");
  const partner = tasks.filter((t: any) => t.kind === "partner");
  const watch = tasks.filter((t: any) => t.kind === "watch");
  const adsToday = data?.adsToday ?? 0;
  const byProvider: Record<string, number> = (data as any)?.adsByProvider ?? {};
  const tenantLimit = (tenant.ad_config as any).daily_watch_limit ?? 20;
  const capsTotal = adProviders.reduce((s, p) => s + (Number(p.daily_cap) > 0 ? Number(p.daily_cap) : tenantLimit), 0);
  const adLimit = adProviders.length ? Math.min(tenantLimit, capsTotal) : tenantLimit;

  const tabsCfg = (tenant.ad_config as any).task_tabs ?? {};
  const show = {
    social: tabsCfg.social !== false,
    partner: tabsCfg.partner !== false,
    watch: tabsCfg.watch !== false,
    refer: tabsCfg.refer !== false,
  };
  const visible = (["watch", "social", "partner", "refer"] as const).filter((k) => show[k]);
  const defaultTab = visible[0] ?? "watch";
  if (visible.length === 0) {
    return (
      <div className={`${skin.page} pb-28`}>
        <h1 className={`${skin.title} mb-4`}>Task Hub</h1>
        <Empty />
      </div>
    );
  }

  return (
    <div className={`${skin.page} pb-28`}>
      <h1 className={`${skin.title} mb-4`}>Task Hub</h1>
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full bg-white/10" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0,1fr))` }}>
          {show.watch && <TabsTrigger value="watch">Watch</TabsTrigger>}
          {show.social && <TabsTrigger value="social">Social</TabsTrigger>}
          {show.partner && <TabsTrigger value="partner">Partners</TabsTrigger>}
          {show.refer && <TabsTrigger value="refer">Refer</TabsTrigger>}
        </TabsList>
        {show.social && (
          <TabsContent value="social" className="space-y-2 mt-4">
            {social.map((t: any) => <TaskRow skin={skin} th={th} key={t.id} t={t} done={completed.has(t.id)} onClaim={() => m.mutate({ taskId: t.id, isGlobal: !!t.is_global })} symbol={tenant.token_symbol} />)}
            {social.length === 0 && <Empty />}
          </TabsContent>
        )}
        {show.partner && (
          <TabsContent value="partner" className="space-y-2 mt-4">
            {partner.map((t: any) => <TaskRow skin={skin} th={th} key={t.id} t={t} done={completed.has(t.id)} onClaim={() => m.mutate({ taskId: t.id, isGlobal: !!t.is_global })} symbol={tenant.token_symbol} />)}
            {partner.length === 0 && <Empty />}
          </TabsContent>
        )}
        {show.watch && (
          <TabsContent value="watch" className="space-y-3 mt-4">
            <p className="text-sm text-white/60 text-center">
              {Math.max(0, adLimit - adsToday)}/{adLimit} ads left today · resets 2:00 AM
            </p>
            {adProviders.length === 0 ? (
              <p className="text-center text-white/50 py-8">No ads available right now.</p>
            ) : (
              adProviders.map((p) => {
                const cap = Number(p.daily_cap) > 0 ? Number(p.daily_cap) : adLimit;
                const used = byProvider[p.id] ?? 0;
                return (
                  <div key={p.id} className="space-y-1">
                    <AdSlot
                      provider={p}
                      symbol={tenant.token_symbol}
                      disabled={am.isPending || adsToday >= adLimit || used >= cap}
                      onWatched={async (prov) => { await am.mutateAsync({ network: prov.kind, providerId: prov.id }); }}
                    />
                    <p className="text-[11px] text-white/40 text-center">{Math.max(0, cap - used)}/{cap} left on this ad</p>
                  </div>
                );
              })
            )}
            {watch.map((t: any) => <TaskRow skin={skin} th={th} key={t.id} t={t} done={completed.has(t.id)} onClaim={() => m.mutate({ taskId: t.id, isGlobal: !!t.is_global })} symbol={tenant.token_symbol} />)}
          </TabsContent>
        )}
        {show.refer && (
          <TabsContent value="refer" className="space-y-2 mt-4">
            <ReferMilestones milestones={data?.milestones ?? []} count={user.referral_count} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}


function TaskRow({ t, done, onClaim, symbol, skin, th }: any) {
  return (
    <div className={`${skin.card} flex items-center gap-3`} style={skin.cardStyle(th.primary, th.accent)}>
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
