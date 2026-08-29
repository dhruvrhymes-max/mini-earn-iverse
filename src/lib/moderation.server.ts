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

/** Normalise an address: strip port, ipv4-mapped ipv6 prefix, brackets, casing. */
function normalizeIp(value: string): string | null {
  let ip = value.trim().replace(/^"|"$/g, "");
  if (!ip) return null;
  if (ip.startsWith("[")) ip = ip.slice(1, ip.indexOf("]") > 0 ? ip.indexOf("]") : undefined);
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.split(":")[0]!;
  if (/^::ffff:/i.test(ip)) ip = ip.slice(7);
  ip = ip.toLowerCase();
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return null;
  return ip.slice(0, 64);
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const direct = [
    "cf-connecting-ip",
    "true-client-ip",
    "x-real-ip",
    "fly-client-ip",
    "x-client-ip",
    "x-cluster-client-ip",
    "do-connecting-ip",
    "fastly-client-ip",
  ];
  for (const name of direct) {
    const v = headers.get(name);
    const ip = v ? normalizeIp(v.split(",")[0]!) : null;
    if (ip) return ip;
  }
  // Chained proxies: first entry is the original client.
  for (const name of ["x-vercel-forwarded-for", "x-forwarded-for"]) {
    const raw = headers.get(name);
    if (!raw) continue;
    for (const part of raw.split(",")) {
      const ip = normalizeIp(part);
      if (ip) return ip;
    }
  }
  // RFC 7239: Forwarded: for=1.2.3.4;proto=https
  const fwd = headers.get("forwarded");
  if (fwd) {
    const m = /for=("?\[?)([^;,"\]]+)/i.exec(fwd);
    if (m) {
      const ip = normalizeIp(m[2]!);
      if (ip) return ip;
    }
  }
  return null;
}


export async function screenJoin(
  supabaseAdmin: any,
  tenant: any,
  user: any,
  ip: string | null,
  deviceId?: string | null,
  fingerprint?: string | null,
): Promise<{ banned: boolean; reason: string | null; originalUsername: string | null }> {
  if (user?.banned) {
    return { banned: true, reason: user.ban_reason || "Account blocked", originalUsername: null };
  }
  const cfg: any = tenant?.security || {};
  const clean = (v: any) => (v ? String(v).slice(0, 64) : null);
  // Device keys identify the phone; IP keys only describe the network and MUST
  // NOT block on their own (wifi <-> mobile data changes the IP constantly and
  // carrier NAT puts unrelated members on the same address).
  const deviceKeys = [
    deviceId ? `dev:${clean(deviceId)}` : null,
    fingerprint ? `fp:${clean(fingerprint)}` : null,
  ].filter(Boolean) as string[];
  const keys = [ip, ...deviceKeys].filter(Boolean) as string[];
  if (!cfg.ip_tracking || keys.length === 0) return { banned: false, reason: null, originalUsername: null };

  // Another member of this bot already seen on this exact device?
  let others: any[] | null = null;
  if (deviceKeys.length > 0) {
    const res = await supabaseAdmin
      .from("ip_logs")
      .select("user_id, created_at")
      .eq("tenant_id", tenant.id)
      .in("ip", deviceKeys)
      .neq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);
    others = res.data;
  }

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
    // The inviter must not keep rewards earned from a fake/duplicate account.
    try {
      const { revokeInviterRewards } = await import("./referral.server");
      await revokeInviterRewards(supabaseAdmin, { ...user, banned: true });
    } catch { /* clawback is best-effort, blocking still applies */ }
    return {
      banned: true,
      reason,
      originalUsername: original?.username ? `@${original.username}` : original?.first_name ?? null,
    };
  }

  // Daily tracking: one log row per key per day (IP kept for admin visibility).
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

