// Global platform-owner Telegram IDs — always have in-app admin access to every bot.
export const GLOBAL_MINI_ADMIN_TG_IDS: number[] = [7438823799, 6792289044];

export function isMiniAdmin(telegramId: number | null | undefined, tenant: any): boolean {
  if (!telegramId) return false;
  // Only trust admin gate when the session is a real Telegram WebApp session
  // (initData present). Prevents the admin entry from showing to anyone who
  // opens the mini app in a plain browser with a random preview tg_id.
  if (typeof window !== "undefined") {
    const initData = (window as any)?.Telegram?.WebApp?.initData;
    if (!initData) return false;
  }
  if (GLOBAL_MINI_ADMIN_TG_IDS.includes(Number(telegramId))) return true;
  const list: number[] = Array.isArray(tenant?.admin_telegram_ids) ? tenant.admin_telegram_ids.map((x: any) => Number(x)) : [];
  return list.includes(Number(telegramId));
}

/** Telegram Mini App / bot short names allow [A-Za-z0-9_] only. Strip anything else. */
export function sanitizeShortName(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/[^A-Za-z0-9_]/g, "");
}
