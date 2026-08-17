import { useEffect, useState } from "react";

/** Telegram profile photo of the current mini app user, when Telegram exposes it. */
export function useTelegramPhoto(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const read = () => {
      const u = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;
      if (typeof u === "string" && u) setUrl(u);
      return !!u;
    };
    if (read()) return;
    const t = setInterval(() => { if (read()) clearInterval(t); }, 300);
    const stop = setTimeout(() => clearInterval(t), 5000);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, []);
  return url;
}
