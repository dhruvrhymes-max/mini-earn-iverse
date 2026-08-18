import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";

/** Public origin the Telegram Mini App is served from. */
export const PUBLIC_APP_ORIGIN = "https://zerolabnetwork.xyz";

export function miniAppWebUrl(slug: string) {
  return `${PUBLIC_APP_ORIGIN}/app/${slug}`;
}

export function miniAppDirectLink(botUsername?: string | null, shortName?: string | null) {
  if (!botUsername) return null;
  return shortName ? `https://t.me/${botUsername}/${shortName}` : `https://t.me/${botUsername}`;
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 mt-1">
        <code className="flex-1 text-xs break-all font-mono">{value}</code>
        <Button type="button" size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied"); }}>
          <Copy className="h-4 w-4" />
        </Button>
        <a href={value} target="_blank" rel="noreferrer" className="p-2 text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

/**
 * Shows the two URLs creators need outside this dashboard:
 * the Mini App **web URL** (pasted into BotFather /newapp, and required by
 * ad networks such as Adsgram) and the resulting **direct link**.
 */
export function MiniAppLinks({ slug, botUsername, shortName }: { slug: string; botUsername?: string | null; shortName?: string | null }) {
  const web = miniAppWebUrl(slug);
  const direct = miniAppDirectLink(botUsername, shortName);
  return (
    <div className="rounded-xl border p-4 space-y-3 bg-muted/30">
      <div>
        <h2 className="text-lg font-semibold">Mini App URLs</h2>
        <p className="text-sm text-muted-foreground">
          Use the web URL in BotFather <span className="font-mono">/newapp</span> and in ad networks (Adsgram asks for it).
        </p>
      </div>
      <Row label="Mini App web URL" value={web} hint="BotFather /newapp → pick this bot → title, description, photo → paste this URL → choose a short name." />
      {direct ? (
        <Row label="Mini App direct link" value={direct} hint={shortName ? "Share this link, or add ?startapp=ref_CODE for referrals." : "Add the Mini App short name below to get the /appname direct link."} />
      ) : (
        <p className="text-xs text-muted-foreground">Save the bot username to see the direct link.</p>
      )}
    </div>
  );
}
