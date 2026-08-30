import { useEffect, useRef } from "react";
import { runAd, type AdProvider } from "./AdRunner";

/**
 * Optional interstitial shown once per app open when the owner enables
 * `ad_config.startup_ad` and provides an Adsgram block id.
 * Failures are silent — an ad must never block the app.
 */
export function StartupAd({ tenant }: { tenant: any }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const cfg = (tenant?.ad_config as any)?.startup_ad;
    const blockId = String(cfg?.block_id ?? "").trim();
    if (!cfg?.enabled || !blockId) return;

    const key = `startup_ad_${tenant?.id ?? "t"}`;
    try {
      // once per app session
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch { /* storage may be unavailable */ }

    fired.current = true;
    const provider: AdProvider = {
      id: `startup-${tenant?.id ?? "t"}`,
      kind: String(cfg.kind ?? "adsgram"),
      label: "Startup ad",
      config: { block_id: blockId, script_url: cfg.script_url, zone_id: cfg.zone_id },
      reward_tokens: 0,
      daily_cap: 0,
    };
    // small delay so the first paint lands before the SDK takes over the screen
    const t = window.setTimeout(() => { runAd(provider).catch(() => { /* ignore */ }); }, 1200);
    return () => window.clearTimeout(t);
  }, [tenant?.id, tenant?.ad_config]);

  return null;
}
