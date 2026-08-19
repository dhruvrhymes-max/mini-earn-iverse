import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Shared loader: user + tenant economics + active miner boost. */
async function loadPlayer(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: user } = await supabaseAdmin.from("app_users")
    .select("*, tenants(economics,game_mode)").eq("id", userId).single();
  if (!user) throw new Error("User not found");
  const nowIso = new Date().toISOString();
  const { data: activeMiners } = await supabaseAdmin.from("user_miners")
    .select("miners(rate_boost_per_hour)").eq("user_id", userId)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  const boost = (activeMiners ?? []).reduce(
    (sum: number, um: any) => sum + Number(um?.miners?.rate_boost_per_hour ?? 0), 0);
  return { supabaseAdmin, user: user as any, boost };
}

export const getGameState = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { user, boost } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const cfg = g.gameConfig(user.tenants?.economics);
    return {
      mode: user.tenants?.game_mode ?? "mine",
      energy: g.computeEnergy(user, cfg),
      energy_max: Number(cfg.energy_max),
      tap_reward: Number(cfg.tap_reward),
      spin_credits: Number(user.spin_credits ?? 0),
      spin_ready_at: g.spinReadyAt(user, cfg),
      spin_rewards: cfg.spin_rewards,
      ...idleState(g, user, cfg, boost),
      balance: Number(user.balance),
    };
  });

/** Everything the idle/storage UI needs: fill, limits and ad-boost allowance. */
function idleState(g: typeof import("./game.server"), user: any, cfg: any, boost: number) {
  const counters = g.idleDayCounters(user);
  const capHours = g.idleCapHours(user, cfg);
  const rate = Number(cfg.idle_rate_per_hour) + boost;
  const pending = g.computeIdlePending(user, cfg, boost);
  const capacity = g.round4(rate * capHours);
  const minPct = Math.min(100, Math.max(0, Number(cfg.idle_min_collect_pct) || 0));
  const dailyLimit = Math.max(0, Math.round(Number(cfg.idle_daily_collects) || 0));
  const adMax = Math.max(0, Math.round(Number(cfg.idle_ad_extend_max) || 0));
  const blockId = String(cfg.idle_ad_block_id ?? "").trim();
  return {
    idle_pending: pending,
    idle_rate_per_hour: rate,
    idle_cap_hours: capHours,
    idle_base_cap_hours: Number(cfg.idle_cap_hours),
    idle_bonus_hours: counters.bonusHours,
    idle_capacity: capacity,
    idle_fill_pct: capacity > 0 ? Math.min(100, (pending / capacity) * 100) : 0,
    idle_min_collect_pct: minPct,
    idle_daily_collects: dailyLimit,
    idle_collects_used: counters.collects,
    idle_collects_left: dailyLimit === 0 ? null : Math.max(0, dailyLimit - counters.collects),
    idle_ad_extend_hours: Number(cfg.idle_ad_extend_hours) || 0,
    idle_ad_extends_left: blockId ? Math.max(0, adMax - counters.adExtends) : 0,
    idle_ad_block_id: blockId || null,
  };
}

/** Tap to earn. Each tap spends 1 energy; energy regenerates over time. */
export const tapEarn = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    userId: z.string().uuid(),
    taps: z.number().int().min(1).max(50),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin, user, boost } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const ref = await import("./referral.server");
    const cfg = g.gameConfig(user.tenants?.economics);
    const energy = g.computeEnergy(user, cfg);
    const taps = Math.min(data.taps, energy);
    if (taps <= 0) return { earned: 0, energy, energy_max: Number(cfg.energy_max), balance: Number(user.balance) };
    const perTap = Number(cfg.tap_reward) + boost / 100;
    const earned = g.round4(taps * perTap);
    const balance = g.round4(Number(user.balance) + earned);
    const nextEnergy = energy - taps;
    await supabaseAdmin.from("app_users").update({
      balance, energy: nextEnergy, energy_updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      tenant_id: user.tenant_id, user_id: user.id, type: "mine", amount: earned, status: "approved",
    });
    await ref.releasePendingInviterReward(supabaseAdmin, user, "mine");
    await ref.payLifetimeCut(supabaseAdmin, user, earned);
    return { earned, energy: nextEnergy, energy_max: Number(cfg.energy_max), balance };
  });

/** Spin the wheel. Uses a free cooldown spin, otherwise a spin credit. */
export const spinWheel = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const ref = await import("./referral.server");
    const cfg = g.gameConfig(user.tenants?.economics);
    const readyAt = g.spinReadyAt(user, cfg);
    const freeReady = Date.now() >= readyAt;
    const credits = Number(user.spin_credits ?? 0);
    if (!freeReady && credits <= 0) {
      return { ok: false, reason: "cooldown", spin_ready_at: readyAt, spin_credits: credits };
    }
    const prize = g.pickSpinPrize(cfg.spin_rewards);
    const balance = g.round4(Number(user.balance) + prize.amount);
    const patch: any = { balance };
    if (freeReady) patch.last_spin_at = new Date().toISOString();
    else patch.spin_credits = credits - 1;
    await supabaseAdmin.from("app_users").update(patch).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      tenant_id: user.tenant_id, user_id: user.id, type: "mine", amount: prize.amount, status: "approved",
    });
    await ref.releasePendingInviterReward(supabaseAdmin, user, "mine");
    await ref.payLifetimeCut(supabaseAdmin, user, prize.amount);
    return {
      ok: true,
      amount: prize.amount,
      index: prize.index,
      balance,
      spin_credits: freeReady ? credits : credits - 1,
      spin_ready_at: freeReady ? Date.now() + (Number(cfg.spin_cooldown_hours) || 4) * 3_600_000 : readyAt,
    };
  });

/** Collect offline idle production (capped) and restart the accrual clock. */
export const collectIdle = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin, user, boost } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const ref = await import("./referral.server");
    const cfg = g.gameConfig(user.tenants?.economics);
    if (!user.idle_collected_at) {
      await supabaseAdmin.from("app_users").update({ idle_collected_at: new Date().toISOString() }).eq("id", user.id);
      return { started: true, collected: 0, balance: Number(user.balance) };
    }
    const counters = g.idleDayCounters(user);
    const dailyLimit = Math.max(0, Math.round(Number(cfg.idle_daily_collects) || 0));
    if (dailyLimit > 0 && counters.collects >= dailyLimit) {
      throw new Error(`Daily collect limit reached (${dailyLimit}/day). Come back tomorrow.`);
    }
    const pending = g.computeIdlePending(user, cfg, boost);
    const capHours = g.idleCapHours(user, cfg);
    const capacity = g.round4((Number(cfg.idle_rate_per_hour) + boost) * capHours);
    const minPct = Math.min(100, Math.max(0, Number(cfg.idle_min_collect_pct) || 0));
    const fill = capacity > 0 ? (pending / capacity) * 100 : 0;
    if (pending <= 0) return { started: false, collected: 0, balance: Number(user.balance) };
    if (fill + 0.001 < minPct) {
      throw new Error(`Storage must be at least ${minPct}% full to collect (now ${fill.toFixed(0)}%).`);
    }
    const balance = g.round4(Number(user.balance) + pending);
    await supabaseAdmin.from("app_users").update({
      balance,
      idle_collected_at: new Date().toISOString(),
      idle_day: counters.day,
      idle_collects: counters.collects + 1,
      idle_ad_extends: counters.adExtends,
      // Ad-bought storage is consumed by the collect.
      idle_bonus_hours: 0,
    }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      tenant_id: user.tenant_id, user_id: user.id, type: "mine", amount: pending, status: "approved",
    });
    await ref.releasePendingInviterReward(supabaseAdmin, user, "mine");
    await ref.payLifetimeCut(supabaseAdmin, user, pending);
    return { started: false, collected: pending, balance };
  });

/**
 * Watch a rewarded ad to enlarge storage for the rest of the current cycle.
 * Server-side guards: the bot must have an Adsgram block configured, the per-day
 * allowance is enforced against the shared day window, and the granted hours
 * come from tenant config only — never from the client.
 */
export const extendIdleStorage = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin, user, boost } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const cfg = g.gameConfig(user.tenants?.economics);
    const blockId = String(cfg.idle_ad_block_id ?? "").trim();
    if (!blockId) throw new Error("Storage boost is not available right now");
    const perAd = Number(cfg.idle_ad_extend_hours) || 0;
    if (perAd <= 0) throw new Error("Storage boost is disabled");
    const max = Math.max(0, Math.round(Number(cfg.idle_ad_extend_max) || 0));
    const counters = g.idleDayCounters(user);
    if (counters.adExtends >= max) throw new Error("No storage boosts left today");
    const bonusHours = g.round4(counters.bonusHours + perAd);
    await supabaseAdmin.from("app_users").update({
      idle_day: counters.day,
      idle_collects: counters.collects,
      idle_ad_extends: counters.adExtends + 1,
      idle_bonus_hours: bonusHours,
    }).eq("id", user.id);
    const next = { ...user, idle_day: counters.day, idle_bonus_hours: bonusHours, idle_ad_extends: counters.adExtends + 1, idle_collects: counters.collects };
    return {
      added_hours: perAd,
      cap_hours: g.idleCapHours(next, cfg),
      extends_left: Math.max(0, max - (counters.adExtends + 1)),
      pending: g.computeIdlePending(next, cfg, boost),
    };
  });


/** Public payout proof — recent paid withdrawals for a tenant (no PII). */
export const getPayoutProof = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ tenantSlug: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenant } = await supabaseAdmin.from("tenants")
      .select("id,payout_channel_url").eq("slug", data.tenantSlug).maybeSingle();
    if (!tenant) return { payouts: [], channel_url: null, total_usdt: 0 };
    const { data: rows } = await supabaseAdmin.from("transactions")
      .select("id,amount,currency,network,tx_hash,created_at,app_users(first_name,username)")
      .eq("tenant_id", tenant.id).eq("type", "withdraw").eq("status", "paid")
      .order("created_at", { ascending: false }).limit(50);
    const payouts = (rows ?? []).map((r: any) => ({
      id: r.id,
      amount: Number(r.amount),
      currency: r.currency,
      network: r.network,
      tx_hash: r.tx_hash,
      created_at: r.created_at,
      // Masked handle only — never expose full identity in a public list.
      user: maskHandle(r.app_users?.username || r.app_users?.first_name || "user"),
    }));
    const total = payouts.reduce((s, p) => s + p.amount, 0);
    return {
      payouts,
      channel_url: tenant.payout_channel_url ?? null,
      total_usdt: Math.round((total + Number.EPSILON) * 10_000) / 10_000,
    };
  });

function maskHandle(name: string): string {
  const clean = String(name).replace(/[^a-zA-Z0-9_]/g, "");
  if (clean.length <= 3) return `${clean}***`;
  return `${clean.slice(0, 3)}***${clean.slice(-1)}`;
}

/* ── New earn loops: scratch / quiz / check-in streak / forecast ─────────── */

/** Combined state for the new modes (one round-trip on load). */
export const getModeState = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { user } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const cfg = g.modeConfig(user.tenants?.economics);
    const win = g.quizWindow(Number(cfg.quiz_cooldown_hours));
    const { question } = g.pickQuestion(g.quizBank(cfg), user.id, win);
    const streak = g.streakStatus(user.last_checkin_at, 24);
    return {
      balance: Number(user.balance),
      scratch: {
        ready_at: g.readyAt(user.last_scratch_at, Number(cfg.scratch_cooldown_hours)),
        prizes: cfg.scratch_prizes,
      },
      quiz: {
        ready_at: g.readyAt(user.last_quiz_at, Number(cfg.quiz_cooldown_hours)),
        streak: Number(user.quiz_streak ?? 0),
        reward: Number(cfg.quiz_reward),
        question: { q: question.q, options: question.options },
      },
      checkin: {
        ready_at: streak.nextAt,
        streak: streak.continues ? Number(user.checkin_streak ?? 0) : 0,
        max_days: Number(cfg.checkin_max_days),
        base: Number(cfg.checkin_base),
        step: Number(cfg.checkin_step),
      },
      forecast: {
        ready_at: g.readyAt(user.last_forecast_at, Number(cfg.forecast_cooldown_minutes) / 60),
        reward: Number(cfg.forecast_reward),
        consolation: Number(cfg.forecast_consolation),
        streak: Number((user.forecast_state as any)?.streak ?? 0),
      },
    };
  });

/** Scratch to earn — reveal a hidden prize once the cooldown clears. */
export const scratchCard = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const cfg = g.modeConfig(user.tenants?.economics);
    const ready = g.readyAt(user.last_scratch_at, Number(cfg.scratch_cooldown_hours));
    if (Date.now() < ready) return { ok: false as const, ready_at: ready };
    const prize = g.pickSpinPrize(cfg.scratch_prizes);
    const balance = await g.creditReward(supabaseAdmin, user, prize.amount);
    const nextReady = Date.now() + Number(cfg.scratch_cooldown_hours) * 3_600_000;
    await supabaseAdmin.from("app_users")
      .update({ balance, last_scratch_at: new Date().toISOString() }).eq("id", user.id);
    return { ok: true as const, amount: prize.amount, index: prize.index, balance, ready_at: nextReady };
  });

/** Quiz to earn — answer today's question; streaks add a bonus. */
export const answerQuiz = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    userId: z.string().uuid(),
    choice: z.number().int().min(0).max(9),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const cfg = g.modeConfig(user.tenants?.economics);
    const cooldown = Number(cfg.quiz_cooldown_hours);
    const ready = g.readyAt(user.last_quiz_at, cooldown);
    if (Date.now() < ready) return { ok: false as const, ready_at: ready };
    const { question } = g.pickQuestion(g.quizBank(cfg), user.id, g.quizWindow(cooldown));
    const correct = data.choice === question.answer;
    const streak = correct ? Number(user.quiz_streak ?? 0) + 1 : 0;
    const amount = correct
      ? Number(cfg.quiz_reward) + Math.min(streak - 1, 6) * Number(cfg.quiz_streak_bonus)
      : 0;
    const balance = await g.creditReward(supabaseAdmin, user, amount);
    await supabaseAdmin.from("app_users").update({
      balance, quiz_streak: streak, last_quiz_at: new Date().toISOString(),
    }).eq("id", user.id);
    return {
      ok: true as const, correct, amount, streak, balance,
      answer: question.answer,
      ready_at: Date.now() + cooldown * 3_600_000,
    };
  });

/** Check-in / streak to earn — daily claim with a rising multiplier. */
export const dailyCheckIn = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const cfg = g.modeConfig(user.tenants?.economics);
    const st = g.streakStatus(user.last_checkin_at, 24);
    if (!st.canClaim) return { ok: false as const, ready_at: st.nextAt };
    const prev = st.continues ? Number(user.checkin_streak ?? 0) : 0;
    const day = Math.min(prev + 1, Number(cfg.checkin_max_days));
    const amount = Number(cfg.checkin_base) + (day - 1) * Number(cfg.checkin_step);
    const balance = await g.creditReward(supabaseAdmin, user, amount);
    await supabaseAdmin.from("app_users").update({
      balance, checkin_streak: day, last_checkin_at: new Date().toISOString(),
    }).eq("id", user.id);
    return { ok: true as const, amount, day, balance, ready_at: Date.now() + 86_400_000 };
  });

/** Forecast to earn — call the next round up or down. */
export const placeForecast = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    userId: z.string().uuid(),
    direction: z.enum(["up", "down"]),
  }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await loadPlayer(data.userId);
    const g = await import("./game.server");
    const cfg = g.modeConfig(user.tenants?.economics);
    const cooldownH = Number(cfg.forecast_cooldown_minutes) / 60;
    const ready = g.readyAt(user.last_forecast_at, cooldownH);
    if (Date.now() < ready) return { ok: false as const, ready_at: ready };
    const outcome = Math.random() < 0.5 ? "up" : "down";
    const won = outcome === data.direction;
    const prevStreak = Number((user.forecast_state as any)?.streak ?? 0);
    const streak = won ? prevStreak + 1 : 0;
    const amount = won
      ? Number(cfg.forecast_reward) * (1 + Math.min(streak - 1, 4) * 0.25)
      : Number(cfg.forecast_consolation);
    const balance = await g.creditReward(supabaseAdmin, user, amount);
    await supabaseAdmin.from("app_users").update({
      balance, last_forecast_at: new Date().toISOString(), forecast_state: { streak },
    }).eq("id", user.id);
    return {
      ok: true as const, won, outcome, streak, balance,
      amount: g.round4(amount),
      ready_at: Date.now() + cooldownH * 3_600_000,
    };
  });
