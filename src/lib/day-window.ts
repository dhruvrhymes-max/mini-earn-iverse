// Daily counters (ads, task limits) reset at 02:00 IST (UTC+5:30) every day.
const OFFSET_MIN = 330; // IST
const RESET_HOUR = 2;

export function dayStart(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + OFFSET_MIN * 60_000);
  const start = new Date(local);
  start.setUTCHours(RESET_HOUR, 0, 0, 0);
  if (local < start) start.setUTCDate(start.getUTCDate() - 1);
  return new Date(start.getTime() - OFFSET_MIN * 60_000);
}

export const dayStartISO = (now?: Date) => dayStart(now).toISOString();
