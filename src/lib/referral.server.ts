/**
 * Server-only referral crediting with abuse protection.
 *
 * Caps (per inviter, per tenant): 20 credited referrals / 24h, 200 / 7 days.
 * Inviter rewards are only released after the invited user performs a real
 * qualifying action (mine / tap / spin / collect / task / ad), never at signup
 * alone. Every credited referral is written to `referral_credits` which doubles
 * as the rate-limit ledger and the audit trail.
 */

export const REFERRAL_DAILY_CAP = 20;
export const REFERRAL_WEEKLY_CAP = 200;

export const DEFAULT_REFERRAL = {
  signup_reward: 0,
  inviter_reward: 50,
  lifetime_pct: 20,
  require_activity: true,
  activity_types: ["mine", "task", "ad"] as string[],
  daily_cap: REFERRAL_DAILY_CAP,
  weekly_cap: REFERRAL_WEEKLY_CAP,
};

async function loadReferralConfig(supabaseAdmin: any, tenantId: string) {
  const { data } = await supabaseAdmin.from("tenants").select("referral_config").eq("id", tenantId).maybeSingle();
  return { ...DEFAULT_REFERRAL, ...((data?.referral_config as any) || {}) };
}

/**
 * True when the inviter is still under both the daily and weekly referral caps.
 * Caps come from the bot's referral_config (0 = unlimited).
 */
export async function withinReferralCaps(supabaseAdmin: any, tenantId: string, inviterId: string): Promise<boolean> {
  const cfg = await loadReferralConfig(supabaseAdmin, tenantId);
  const dailyCap = Number(cfg.daily_cap ?? REFERRAL_DAILY_CAP);
  const weeklyCap = Number(cfg.weekly_cap ?? REFERRAL_WEEKLY_CAP);
  if (dailyCap <= 0 && weeklyCap <= 0) return true;
  const dayAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
  const [{ count: daily }, { count: weekly }] = await Promise.all([
    supabaseAdmin.from("referral_credits").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("inviter_id", inviterId).gte("created_at", dayAgo),
    supabaseAdmin.from("referral_credits").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("inviter_id", inviterId).gte("created_at", weekAgo),
  ]);
  if (dailyCap > 0 && (daily ?? 0) >= dailyCap) return false;
  if (weeklyCap > 0 && (weekly ?? 0) >= weeklyCap) return false;
  return true;
}

async function creditInviter(supabaseAdmin: any, tenantId: string, inviterId: string, amount: number) {
  const { data: inv } = await supabaseAdmin.from("app_users").select("balance").eq("id", inviterId).single();
  if (!inv) return false;
  await supabaseAdmin.from("app_users").update({ balance: Number(inv.balance) + amount }).eq("id", inviterId);
  await supabaseAdmin.from("transactions").insert({
    tenant_id: tenantId, user_id: inviterId, type: "referral", amount, status: "approved",
  });
  return true;
}

/**
 * Release the inviter reward queued at signup, once the invited user performs a
 * qualifying activity. Respects the per-inviter referral caps.
 */
export async function releasePendingInviterReward(
  supabaseAdmin: any,
  user: any,
  activityType: string,
): Promise<number> {
  if (user.has_activity) return 0;
  const cfg = await loadReferralConfig(supabaseAdmin, user.tenant_id);
  const counts = Array.isArray(cfg.activity_types) && cfg.activity_types.includes(activityType);
  await supabaseAdmin.from("app_users").update({ has_activity: true }).eq("id", user.id);
  if (!counts) return 0;
  const pending = Number(user.pending_inviter_reward || 0);
  if (!user.referrer_id || pending <= 0) return 0;
  if (!(await withinReferralCaps(supabaseAdmin, user.tenant_id, user.referrer_id))) {
    await supabaseAdmin.from("app_users").update({ pending_inviter_reward: 0 }).eq("id", user.id);
    return 0;
  }
  const ok = await creditInviter(supabaseAdmin, user.tenant_id, user.referrer_id, pending);
  if (!ok) return 0;
  await supabaseAdmin.from("app_users").update({ pending_inviter_reward: 0 }).eq("id", user.id);
  await supabaseAdmin.from("referral_credits").insert({
    tenant_id: user.tenant_id, inviter_id: user.referrer_id, invitee_id: user.id, amount: pending,
  });
  return pending;
}

/** Pay the inviter a lifetime % cut of an earning event by the invited user. */
export async function payLifetimeCut(supabaseAdmin: any, user: any, earnedAmount: number): Promise<void> {
  if (!user.referrer_id || !(earnedAmount > 0)) return;
  const cfg = await loadReferralConfig(supabaseAdmin, user.tenant_id);
  const pct = Number(cfg.lifetime_pct || 0);
  if (pct <= 0) return;
  const cut = Math.round((earnedAmount * (pct / 100) + Number.EPSILON) * 10_000) / 10_000;
  if (cut <= 0) return;
  const ok = await creditInviter(supabaseAdmin, user.tenant_id, user.referrer_id, cut);
  if (!ok) return;
  await supabaseAdmin.from("app_users")
    .update({ lifetime_earned_for_inviter: Number(user.lifetime_earned_for_inviter || 0) + cut })
    .eq("id", user.id);
}

/** How many tasks (tenant + global) the member has completed in total. */
async function countTasksDone(supabaseAdmin: any, userId: string): Promise<number> {
  const [a, b] = await Promise.all([
    supabaseAdmin.from("user_tasks").select("count").eq("user_id", userId),
    supabaseAdmin.from("user_global_tasks").select("count").eq("user_id", userId),
  ]);
  const sum = (rows: any[] | null) => (rows ?? []).reduce((s, r) => s + Number(r.count || 0), 0);
  return sum(a.data) + sum(b.data);
}

/**
 * Release the "extra bonus" invite reward to the inviter once the invited
 * member hits the configured milestone. Amount, milestone type (ads / tasks /
 * either / both) and thresholds are set per bot in referral_config
 * (bonus_reward, bonus_trigger, bonus_after_ads, bonus_after_tasks).
 */
export async function maybeReleaseInviteBonus(supabaseAdmin: any, user: any): Promise<number> {
  if (!user?.referrer_id) return 0;
  const cfg = await loadReferralConfig(supabaseAdmin, user.tenant_id);
  const amount = Number((cfg as any).bonus_reward ?? 0);
  if (amount <= 0) return 0;

  const trigger = String((cfg as any).bonus_trigger ?? "ads");
  const adNeed = Number((cfg as any).bonus_after_ads ?? 0);
  const taskNeed = Number((cfg as any).bonus_after_tasks ?? 0);
  const adsOk = adNeed > 0 && Number(user.ads_watched || 0) >= adNeed;
  const tasksOk = taskNeed > 0 && (await countTasksDone(supabaseAdmin, user.id)) >= taskNeed;

  let unlocked = false;
  if (trigger === "tasks") unlocked = tasksOk;
  else if (trigger === "either") unlocked = adsOk || tasksOk;
  else if (trigger === "both") unlocked = adsOk && tasksOk;
  else unlocked = adsOk;
  if (!unlocked) return 0;

  // Ledger row doubles as the "already paid" marker for this invitee.
  const { data: already } = await supabaseAdmin.from("referral_credits")
    .select("id").eq("invitee_id", user.id).eq("amount", amount).maybeSingle();
  if (already) return 0;
  if (!(await withinReferralCaps(supabaseAdmin, user.tenant_id, user.referrer_id))) return 0;
  if (!(await creditInviter(supabaseAdmin, user.tenant_id, user.referrer_id, amount))) return 0;
  await supabaseAdmin.from("referral_credits").insert({
    tenant_id: user.tenant_id, inviter_id: user.referrer_id, invitee_id: user.id, amount,
  });
  return amount;
}

