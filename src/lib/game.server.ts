/**
 * Server-only game logic for the non-mining earn modes:
 *   tap  — instant reward per tap, limited by regenerating energy
 *   spin — cooldown-gated wheel with weighted prizes (+ spins earned from tasks)
 *   idle — production accrues offline up to a cap, collected on return
 *
 * All rewards are rounded to 4 decimals before persisting so balances never
 * show floating point noise in the UI. No mode is gated behind watching an ad.
 */

export const GAME_DEFAULTS = {
  tap_reward: 1,
  energy_max: 500,
  energy_regen_per_hour: 250,
  spin_cooldown_hours: 4,
  spin_rewards: [5, 10, 25, 50, 100, 250] as number[],
  idle_rate_per_hour: 60,
  idle_cap_hours: 8,
  /** Storage must be this % full before collecting is allowed. */
  idle_min_collect_pct: 60,
  /** Max collects per day. 0 = unlimited. */
  idle_daily_collects: 0,
  /** Extra storage hours granted per rewarded ad. */
  idle_ad_extend_hours: 1,
  /** How many storage-extend ads a user may watch per day. 0 = disabled. */
  idle_ad_extend_max: 3,
  /** Adsgram block id used for the storage-extend ad. */
  idle_ad_block_id: "",
};

export function round4(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 10_000) / 10_000;
}

export function gameConfig(economics: any) {
  return { ...GAME_DEFAULTS, ...((economics as any) || {}) };
}

/** Energy regenerates linearly since `energy_updated_at`, capped at energy_max. */
export function computeEnergy(user: any, cfg: ReturnType<typeof gameConfig>): number {
  const max = Number(cfg.energy_max) || 0;
  const current = Number(user.energy ?? 0);
  const since = user.energy_updated_at ? new Date(user.energy_updated_at).getTime() : Date.now();
  const hours = Math.max(0, (Date.now() - since) / 3_600_000);
  const regen = hours * (Number(cfg.energy_regen_per_hour) || 0);
  return Math.max(0, Math.min(max, Math.floor(current + regen)));
}

/** Tokens waiting to be collected in idle mode (capped). */
export function computeIdlePending(user: any, cfg: ReturnType<typeof gameConfig>, boostPerHour = 0): number {
  const since = user.idle_collected_at ? new Date(user.idle_collected_at).getTime() : null;
  if (!since) return 0;
  const capHours = Number(cfg.idle_cap_hours) || 8;
  const hours = Math.min(capHours, Math.max(0, (Date.now() - since) / 3_600_000));
  const rate = (Number(cfg.idle_rate_per_hour) || 0) + boostPerHour;
  return round4(hours * rate);
}

export function pickSpinPrize(rewards: number[]): { amount: number; index: number } {
  const list = rewards.filter((n) => Number.isFinite(Number(n)) && Number(n) > 0).map(Number);
  const pool = list.length ? list : GAME_DEFAULTS.spin_rewards;
  // Lower prizes are more likely: weight is inversely proportional to value.
  const weights = pool.map((v) => 1 / v);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return { amount: round4(pool[i]), index: i };
  }
  return { amount: round4(pool[pool.length - 1]), index: pool.length - 1 };
}

export function spinReadyAt(user: any, cfg: ReturnType<typeof gameConfig>): number {
  if (!user.last_spin_at) return 0;
  return new Date(user.last_spin_at).getTime() + (Number(cfg.spin_cooldown_hours) || 4) * 3_600_000;
}

/* ──────────────────────────────────────────────────────────────────────────
 * New earn loops (2026): scratch, quiz, streak check-in and price forecast.
 * They all live off the same `economics` blob so a bot owner can retune them.
 * ────────────────────────────────────────────────────────────────────────── */

export const NEW_MODE_DEFAULTS = {
  // scratch to earn
  scratch_cooldown_hours: 6,
  scratch_prizes: [10, 25, 50, 100, 250, 500] as number[],
  // quiz to earn
  quiz_cooldown_hours: 24,
  quiz_reward: 150,
  quiz_streak_bonus: 25,
  // check-in / streak to earn
  checkin_base: 100,
  checkin_step: 60,
  checkin_max_days: 7,
  // forecast (predict) to earn
  forecast_cooldown_minutes: 15,
  forecast_reward: 120,
  forecast_consolation: 15,
};

export function modeConfig(economics: any) {
  return { ...GAME_DEFAULTS, ...NEW_MODE_DEFAULTS, ...((economics as any) || {}) };
}

export function readyAt(iso: string | null | undefined, hours: number): number {
  if (!iso) return 0;
  return new Date(iso).getTime() + Math.max(0, hours) * 3_600_000;
}

/** Was `iso` inside the current streak window (yesterday..now)? */
export function streakStatus(iso: string | null | undefined, hours = 24) {
  if (!iso) return { canClaim: true, continues: false, nextAt: 0 };
  const last = new Date(iso).getTime();
  const nextAt = last + hours * 3_600_000;
  const expiresAt = last + hours * 2 * 3_600_000;
  const now = Date.now();
  return { canClaim: now >= nextAt, continues: now < expiresAt, nextAt };
}

export type QuizQuestion = { q: string; options: string[]; answer: number };

export const DEFAULT_QUIZ_BANK: QuizQuestion[] = [
  { q: "What does a crypto 'wallet address' identify?", options: ["A bank branch", "A destination for funds", "A password", "A mining rig"], answer: 1 },
  { q: "Which network is TON built for?", options: ["Telegram", "Discord", "Slack", "WeChat"], answer: 0 },
  { q: "What is a stablecoin pegged to?", options: ["Gold only", "Nothing", "A stable asset like USD", "Mining power"], answer: 2 },
  { q: "Never share which of these?", options: ["Your username", "Your seed phrase", "Your public address", "Your profile photo"], answer: 1 },
  { q: "What does 'HODL' mean in crypto slang?", options: ["Sell fast", "Hold long term", "Hack a ledger", "Halve difficulty"], answer: 1 },
  { q: "A blockchain block mainly stores…", options: ["Videos", "Transactions", "Emails", "Passwords"], answer: 1 },
  { q: "What is a 'gas fee'?", options: ["A network transaction fee", "A withdrawal tax", "A mining reward", "An airdrop"], answer: 0 },
  { q: "Which is the smallest unit of Bitcoin?", options: ["Wei", "Gwei", "Satoshi", "Nano"], answer: 2 },
  { q: "An airdrop usually means…", options: ["Free token distribution", "A hard fork", "A price crash", "A wallet hack"], answer: 0 },
  { q: "What secures a proof-of-work chain?", options: ["Staking", "Computing power", "Votes", "Servers"], answer: 1 },
  { q: "What is a DEX?", options: ["A hardware wallet", "A decentralised exchange", "A token standard", "A mining pool"], answer: 1 },
  { q: "What does KYC stand for?", options: ["Keep Your Coins", "Know Your Customer", "Key Yield Contract", "Kilo Yotta Chain"], answer: 1 },
];

export function quizBank(cfg: any): QuizQuestion[] {
  const custom = Array.isArray(cfg?.quiz_questions) ? cfg.quiz_questions : null;
  const valid = (custom ?? []).filter(
    (q: any) => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length >= 2 && Number.isInteger(q.answer),
  );
  return valid.length ? valid : DEFAULT_QUIZ_BANK;
}

/** Deterministic per-user, per-window question so the answer never ships early. */
export function pickQuestion(bank: QuizQuestion[], userId: string, windowKey: number) {
  let h = 2166136261;
  const seed = `${userId}:${windowKey}`;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const index = Math.abs(h) % bank.length;
  return { index, question: bank[index] };
}

/** Window bucket used for quiz seeding (changes each cooldown period). */
export function quizWindow(cooldownHours: number): number {
  return Math.floor(Date.now() / (Math.max(1, cooldownHours) * 3_600_000));
}

/** Credit a reward, log the transaction and run referral payouts. */
export async function creditReward(supabaseAdmin: any, user: any, amount: number): Promise<number> {
  const ref = await import("./referral.server");
  const value = round4(amount);
  if (value <= 0) return Number(user.balance);
  const balance = round4(Number(user.balance) + value);
  await supabaseAdmin.from("transactions").insert({
    tenant_id: user.tenant_id, user_id: user.id, type: "mine", amount: value, status: "approved",
  });
  await ref.releasePendingInviterReward(supabaseAdmin, user, "mine");
  await ref.payLifetimeCut(supabaseAdmin, user, value);
  return balance;
}
