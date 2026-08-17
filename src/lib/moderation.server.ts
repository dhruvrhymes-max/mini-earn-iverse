/**
 * Join-address tracking + multi-account screening (server only).
 * When a bot enables address tracking, a second account joining from an address
 * already used by another member is hard-blocked. The blocked account stays
 * visible in the admin panel so it can be unblocked in one tap.
 */

export function clientIpFromHeaders(headers: Headers): string | null {
  const raw =
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for");
  if (!raw) return null;
  return raw.split(",")[0]!.trim() || null;
}

export async function screenJoin(
  supabaseAdmin: any,
  tenant: any,
  user: any,
  ip: string | null,
): Promise<{ banned: boolean; reason: string | null; originalUsername: string | null }> {
  if (user?.banned) {
    return { banned: true, reason: user.ban_reason || "Account blocked", originalUsername: null };
  }
  const cfg: any = tenant?.security || {};
  if (!cfg.ip_tracking || !ip) return { banned: false, reason: null, originalUsername: null };

  // Any other member of this bot already seen on this address?
  const { data: others } = await supabaseAdmin
    .from("ip_logs")
    .select("user_id")
    .eq("tenant_id", tenant.id)
    .eq("ip", ip)
    .neq("user_id", user.id)
    .limit(1);

  if (others && others.length > 0) {
    const { data: original } = await supabaseAdmin
      .from("app_users").select("username,first_name").eq("id", others[0].user_id).maybeSingle();
    const reason =
      cfg.block_message ||
      "Multiple accounts are not allowed. Please continue with your original account.";
    await supabaseAdmin.from("app_users").update({
      banned: true,
      ban_reason: reason,
      ban_kind: "multi_account",
      banned_at: new Date().toISOString(),
      last_ip: ip,
    }).eq("id", user.id);
    return {
      banned: true,
      reason,
      originalUsername: original?.username ? `@${original.username}` : original?.first_name ?? null,
    };
  }

  if (user.last_ip !== ip) {
    await supabaseAdmin.from("app_users").update({ last_ip: ip }).eq("id", user.id);
    await supabaseAdmin.from("ip_logs").insert({ tenant_id: tenant.id, user_id: user.id, ip });
  }
  return { banned: false, reason: null, originalUsername: null };
}
