/**
 * Shared number formatting for every balance / reward shown in the UI.
 * Raw JS math produces strings like "0.8999999999999999"; always render
 * through these helpers so moderation reviewers never see float noise.
 */
export function formatTokens(value: unknown, decimals = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
}

export function formatUsd(value: unknown, decimals = 4): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return (0).toFixed(decimals);
  return n.toFixed(decimals);
}

/** Compact display for large token balances (1.2K, 3.4M) while staying rounded. */
export function formatCompact(value: unknown, decimals = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return (0).toFixed(decimals);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(decimals);
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
