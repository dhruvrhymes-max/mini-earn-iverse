import { sendPayout } from "./payout.server";
import { sendWithdrawalNotifications } from "./withdrawal-notifications.server";

export async function processWithdrawalSecurely(
  supabaseAdmin: any,
  tenant: any,
  transactionId: string,
  approve: boolean,
  reason?: string | null,
) {
  const { data: existing, error: readError } = await supabaseAdmin.from("transactions")
    .select("*, app_users(username,first_name,telegram_id)")
    .eq("id", transactionId).eq("tenant_id", tenant.id).eq("type", "withdraw").maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!existing) throw new Error("Withdrawal request not found");

  if (!approve) {
    const { data: rejected, error } = await supabaseAdmin.rpc("reject_withdrawal", {
      _transaction_id: transactionId,
      _tenant_id: tenant.id,
      _reason: reason?.trim() || "Rejected by admin",
    });
    if (error) throw new Error(error.message);
    const tx = { ...rejected, app_users: existing.app_users };
    await sendWithdrawalNotifications(supabaseAdmin, tenant, tx, "rejected", null, reason?.trim() || "Rejected by admin");
    return { ok: true, tx_hash: null };
  }

  const { data: claimed, error: claimError } = await supabaseAdmin.rpc("claim_withdrawal", {
    _transaction_id: transactionId,
    _tenant_id: tenant.id,
  });
  if (claimError) throw new Error(claimError.message);

  try {
    const result = await sendPayout(tenant, {
      network: claimed.network,
      wallet: claimed.wallet,
      amount: Number(claimed.amount),
    });
    // Remember the funded TON wallet version so later payouts skip the probe.
    if (result.tonWalletVersion && tenant?.payout_config?.ton && !tenant.payout_config.ton.wallet_version) {
      const next = { ...tenant.payout_config, ton: { ...tenant.payout_config.ton, wallet_version: result.tonWalletVersion } };
      await supabaseAdmin.from("tenants").update({ payout_config: next }).eq("id", tenant.id);
    }
    const { data: completed, error: completeError } = await supabaseAdmin.rpc("complete_withdrawal", {

      _transaction_id: transactionId,
      _tenant_id: tenant.id,
      _tx_hash: result.hash,
    });
    if (completeError) throw new Error(`Payment broadcast but saving its hash failed: ${completeError.message}`);
    const tx = { ...completed, app_users: existing.app_users };
    const notifications = await sendWithdrawalNotifications(supabaseAdmin, tenant, tx, "paid", result.hash, null);
    return { ok: true, tx_hash: result.hash, explorer: result.explorer, notifications };
  } catch (error) {
    await supabaseAdmin.rpc("release_withdrawal_claim", { _transaction_id: transactionId, _tenant_id: tenant.id });
    throw error;
  }
}