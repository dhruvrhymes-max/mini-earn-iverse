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
