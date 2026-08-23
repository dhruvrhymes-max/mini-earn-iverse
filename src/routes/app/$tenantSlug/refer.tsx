import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { Button } from "@/components/ui/button";
import { Copy, Share2, TrendingUp, Users, UserCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getWithdrawEligibility } from "@/lib/miniapp.functions";
import { toast } from "sonner";
import { sanitizeShortName } from "@/lib/mini-admin";

export const Route = createFileRoute("/app/$tenantSlug/refer")({
  component: Refer,
});

function Refer() {
  const { tenant, user } = useMini();
  const t: any = tenant;
  const cfg = t.referral_config ?? {};
  const botUsername = t.bot_username || "";
  const shortName = sanitizeShortName(t.mini_app_short_name);
  const startParam = `ref_${user.telegram_id}`;
  const eligFn = useServerFn(getWithdrawEligibility);
  const { data: stats } = useQuery({
    queryKey: ["withdraw-eligibility", user.id],
    queryFn: () => eligFn({ data: { tenantId: t.id, userId: user.id } }),
  });

  // Telegram deep link — opens the mini app directly inside Telegram (t.me/<bot>/<shortname>?startapp=…)
  // `startapp` opens the Mini App and starts the bot chat at the same time.
  // With a short name it targets that app directly; without one Telegram opens
  // the bot's main Mini App.
  const tgLink = botUsername
    ? shortName
      ? `https://t.me/${botUsername}/${shortName}?startapp=${startParam}`
      : `https://t.me/${botUsername}?startapp=${startParam}`
    : "";

  // Web fallback (browser preview without Telegram)
  const webLink = typeof window !== "undefined"
    ? `${window.location.origin}/app/${t.slug}?ref=${user.telegram_id}`
    : "";

  const link = tgLink || webLink;
  const shareText = `Join me on ${t.name} and earn ${t.token_symbol}! ${link}`;

  const handleShare = () => {
    if (typeof window === "undefined") return;
    const wa = (window as any).Telegram?.WebApp;
    if (wa?.openTelegramLink && tgLink) {
      const url = `https://t.me/share/url?url=${encodeURIComponent(tgLink)}&text=${encodeURIComponent(`Join me on ${t.name} and earn ${t.token_symbol}!`)}`;
      wa.openTelegramLink(url);
      return;
    }
    if ((navigator as any).share) {
      (navigator as any).share({ title: t.name, text: shareText, url: link }).catch(() => {});
    } else {
      navigator.clipboard.writeText(link); toast.success("Link copied");
    }
  };

  return (
    <div className="p-6 pt-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Invite friends</h1>
        <p className="text-white/70 text-sm">Earn rewards every time a friend joins and stays active.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Users className="h-4 w-4" />} value={stats?.totalRefs ?? user.referral_count} label="Friends" />
        <Stat icon={<UserCheck className="h-4 w-4" />} value={stats?.activeRefs ?? 0} label="active" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} value={`${Number(cfg.lifetime_pct ?? 0)}%`} label="lifetime" />
      </div>

      <div className="bg-white/5 rounded-xl p-4 space-y-3">
        <div className="text-xs uppercase text-white/50 tracking-wider">Your invite link</div>
        <div className="font-mono text-xs break-all text-white/90">{link}</div>
        {botUsername && !shortName && (
          <p className="text-[10px] text-white/50">
            Tip for the owner: set the bot's Main Mini App in BotFather (or add the short name in Manage → Bot) so this link opens the app instantly.
          </p>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />Share
          </Button>
          <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-white/50 -mt-3">
        Active invites are friends who mined, completed a task or watched an ad at least once.
      </p>

      <div className="space-y-2 text-sm text-white/70">
        <div className="flex justify-between">
          <span>You earn per friend</span>
          <b className="text-white">{Number(cfg.inviter_reward ?? 0)} {t.token_symbol}</b>
        </div>
        <div className="flex justify-between">
          <span>Friend signup bonus</span>
          <b className="text-white">{Number(cfg.signup_reward ?? 0)} {t.token_symbol}</b>
        </div>
        <div className="flex justify-between">
          <span>Lifetime cut of friend earnings</span>
          <b className="text-white">{Number(cfg.lifetime_pct ?? 0)}%</b>
        </div>
        {cfg.require_activity && (
          <p className="text-xs text-white/50 pt-2">
            Friends must complete one activity (mine, task, or watch an ad) before your reward unlocks.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 flex flex-col items-center text-center">
      <div className="text-white/60 mb-1">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-white/50">{label}</div>
    </div>
  );
}
