import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, ExternalLink } from "lucide-react";

export type AdProvider = {
  id: string;
  kind: string;
  label: string;
  config: Record<string, any>;
  reward_tokens: number;
  daily_cap: number;
};

const loaded = new Set<string>();

function loadScript(src: string, attrs: Record<string, string> = {}) {
  const key = src + JSON.stringify(attrs);
  if (loaded.has(key)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src.startsWith("//") || src.startsWith("http") ? src : `https://${src}`;
    s.async = true;
    Object.entries(attrs).forEach(([k, v]) => v && s.setAttribute(k, v));
    s.onload = () => { loaded.add(key); resolve(); };
    s.onerror = () => reject(new Error("Ad script failed to load"));
    document.head.appendChild(s);
  });
}

function injectCss(id: string, css?: string) {
  if (!css) return;
  const elId = `ad-css-${id}`;
  if (document.getElementById(elId)) return;
  const st = document.createElement("style");
  st.id = elId;
  st.textContent = css;
  document.head.appendChild(st);
}

function openLink(url: string) {
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.openLink) tg.openLink(url, { try_instant_view: false });
  else window.open(url, "_blank", "noopener");
}

/** Runs one ad provider. Resolves when the ad has been watched/opened. */
export async function runAd(p: AdProvider, mount?: HTMLElement | null): Promise<void> {
  const c = p.config ?? {};
  injectCss(p.id, c.css);

  switch (p.kind) {
    case "monetag": {
      const zone = String(c.zone_id ?? "").trim();
      if (!zone) throw new Error("Monetag zone id missing");
      await loadScript(c.script_url || `//libtl.com/sdk.js`, { "data-zone": zone, "data-sdk": `show_${zone}` });
      const fn = (window as any)[`show_${zone}`];
      if (typeof fn !== "function") throw new Error("Monetag not ready, try again");
      await fn();
      return;
    }
    case "adsgram": {
      const blockId = String(c.block_id ?? "").trim();
      if (!blockId) throw new Error("Adsgram block id missing");
      await loadScript(c.script_url || "//sad.adsgram.ai/js/sad.min.js");
      const AdController = (window as any).Adsgram?.init({ blockId });
      if (!AdController) throw new Error("Adsgram not ready, try again");
      const res = await AdController.show();
      if (res && res.done === false) throw new Error("Ad not completed");
      return;
    }
    case "onclicka": {
      const id = String(c.zone_id ?? c.spot_id ?? "").trim();
      if (!id) throw new Error("Onclicka zone id missing");
      await loadScript(c.script_url || "//js.onclckmn.com/static/onclicka.js", { "data-admpid": id });
      const init = (window as any).initCdTma;
      if (typeof init !== "function") throw new Error("Onclicka not ready, try again");
      const show = await init({ id });
      await show();
      return;
    }
    case "direct_link": {
      const url = String(c.url ?? c.direct_url ?? "").trim();
      if (!url) throw new Error("Direct link URL missing");
      openLink(url);
      // give the user a moment on the landing page before crediting
      await new Promise((r) => setTimeout(r, Number(c.wait_seconds ?? 5) * 1000));
      return;
    }
    case "ao_code":
    case "custom": {
      const code = String(c.code ?? "").trim();
      const scriptUrl = String(c.script_url ?? "").trim();
      if (scriptUrl) await loadScript(scriptUrl, c.zone_id ? { "data-zone": String(c.zone_id) } : {});
      if (code) {
        const host = (c.selector && document.querySelector(c.selector)) || mount || document.body;
        const wrap = document.createElement("div");
        wrap.innerHTML = code;
        // innerHTML does not execute scripts — re-create them
        wrap.querySelectorAll("script").forEach((old) => {
          const s = document.createElement("script");
          [...old.attributes].forEach((a) => s.setAttribute(a.name, a.value));
          s.text = old.textContent ?? "";
          old.replaceWith(s);
        });
        (host as HTMLElement).appendChild(wrap);
      }
      const fnName = String(c.show_function ?? "").trim();
      if (fnName) {
        const fn = (window as any)[fnName];
        if (typeof fn !== "function") throw new Error(`${fnName}() not available`);
        await fn();
      } else {
        await new Promise((r) => setTimeout(r, Number(c.wait_seconds ?? 3) * 1000));
      }
      return;
    }
    default:
      throw new Error("Unknown ad type");
  }
}

export function AdSlot({
  provider,
  disabled,
  onWatched,
  symbol,
}: {
  provider: AdProvider;
  disabled?: boolean;
  onWatched: (p: AdProvider) => Promise<void> | void;
  symbol: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mount = useRef<HTMLDivElement>(null);

  useEffect(() => { injectCss(provider.id, provider.config?.css); }, [provider.id, provider.config?.css]);

  const isLink = provider.kind === "direct_link";

  return (
    <div className="bg-white/5 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{provider.label}</p>
          <p className="text-xs text-white/60">
            +{provider.reward_tokens || 0} {symbol}
            {provider.daily_cap ? ` · up to ${provider.daily_cap}/day` : ""}
          </p>
          {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
        </div>
        <Button
          size="sm"
          disabled={disabled || busy}
          onClick={async () => {
            setErr(null); setBusy(true);
            try {
              await runAd(provider, mount.current);
              await onWatched(provider);
            } catch (e: any) {
              setErr(e?.message ?? "Ad failed");
            } finally { setBusy(false); }
          }}
        >
          {isLink ? <ExternalLink className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {busy ? "…" : isLink ? "Open" : "Watch"}
        </Button>
      </div>
      <div ref={mount} className="ad-slot-mount" data-ad-kind={provider.kind} />
    </div>
  );
}
