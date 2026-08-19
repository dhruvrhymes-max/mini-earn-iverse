/**
 * Join-address / device tracking + multi-account screening (server only).
 * When a bot enables address tracking, a second account joining from an address
 * (or device) already used by another member is hard-blocked. The blocked
 * account stays visible in the admin panel so it can be unblocked in one tap.
 *
 * Some hosting layers strip client IP headers; in that case the mini app sends a
 * stable per-device id which is stored as `dev:<id>` in the same ip_logs table,
 * so multi-account detection keeps working.
 */

export function clientIpFromHeaders(headers: Headers): string | null {
  const raw =
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-vercel-forwarded-for") ||
    headers.get("true-client-ip") ||
    headers.get("x-client-ip") ||
    headers.get("x-forwarded-for");
  if (!raw) return null;
  return raw.split(",")[0]!.trim() || null;
}

export async function screenJoin(
  supabaseAdmin: any,
  tenant: any,
  user: any,
  ip: string | null,
  deviceId?: string | null,
): Promise<{ banned: boolean; reason: string | null; originalUsername: string | null }> {
  if (user?.banned) {
    return { banned: true, reason: user.ban_reason || "Account blocked", originalUsername: null };
  }
  const cfg: any = tenant?.security || {};
  const keys = [ip, deviceId ? `dev:${String(deviceId).slice(0, 64)}` : null].filter(Boolean) as string[];
  if (!cfg.ip_tracking || keys.length === 0) return { banned: false, reason: null, originalUsername: null };

  // Any other member of this bot already seen on this address/device?
  const { data: others } = await supabaseAdmin
    .from("ip_logs")
    .select("user_id, created_at")
    .eq("tenant_id", tenant.id)
    .in("ip", keys)
    .neq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1);

  if (others && others.length > 0) {
    const { data: original } = await supabaseAdmin
      .from("app_users").select("username,first_name").eq("id", others[0].user_id).maybeSingle();
    const reason =
      cfg.block_message ||
      "Multiple accounts are not allowed. Please continue with your original account.";
    const { error: banError } = await supabaseAdmin.from("app_users").update({
      banned: true,
      ban_reason: reason,
      ban_kind: "multi_account",
      banned_at: new Date().toISOString(),
      last_ip: ip ?? keys[0]!,
    }).eq("id", user.id);
    if (banError) throw new Error(`Could not block duplicate account: ${banError.message}`);
    return {
      banned: true,
      reason,
      originalUsername: original?.username ? `@${original.username}` : original?.first_name ?? null,
    };
  }

  // Daily tracking: one log row per key per day.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("ip_logs")
    .select("ip")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .gte("created_at", since);
  const logged = new Set((recent ?? []).map((r: any) => r.ip));
  const fresh = keys.filter((k) => !logged.has(k));
  if (fresh.length > 0) {
    const { error: logError } = await supabaseAdmin.from("ip_logs").insert(
      fresh.map((k) => ({ tenant_id: tenant.id, user_id: user.id, ip: k })),
    );
    if (logError) throw new Error(`Could not record join address: ${logError.message}`);
  }
  const primary = ip ?? keys[0]!;
  if (user.last_ip !== primary) {
    const { error: updateError } = await supabaseAdmin.from("app_users").update({ last_ip: primary }).eq("id", user.id);
    if (updateError) throw new Error(`Could not update join address: ${updateError.message}`);
    user.last_ip = primary;
  }
  return { banned: false, reason: null, originalUsername: null };
}
