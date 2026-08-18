/**
 * Builds a default "About this bot / how to earn" description from the
 * tenant's own configuration, so every bot ships with a meaningful blurb
 * that owners can edit.
 */
export function buildAboutText(t: any): string {
  const name = t?.name || "This bot";
  const symbol = t?.token_symbol || "TKN";
  const verb = (t?.action_verb || "Mine").toString();
  const econ = t?.economics || {};
  const perMine = Number(econ.tokens_per_mine ?? econ.mining_rate_per_hour ?? 0);
  const durSec = Number(econ.mine_duration_seconds ?? (Number(econ.mining_cycle_hours ?? 4) * 3600));
  const perUsdt = Number(econ.token_per_usdt ?? 0);
  const minWd = Number(econ.min_withdraw_usdt ?? 0);
  const ref = t?.referral_config || {};
  const dur = durSec >= 3600 ? `${(durSec / 3600).toFixed(durSec % 3600 ? 1 : 0)} h` : `${Math.round(durSec / 60) || 1} min`;

  const lines = [
    `${name} is a play-to-earn Telegram mini app where you collect ${symbol}.`,
    "",
    "How you can earn:",
    `• ${verb} — start a cycle and claim ${perMine ? perMine.toLocaleString() : "your"} ${symbol} every ${dur}.`,
    "• Watch & earn — watch short rewarded ads for instant bonus tokens.",
    "• Tasks — join channels, follow socials and complete daily quests for extra rewards.",
    "• Refer & earn — invite friends for an instant bonus plus lifetime commission on what they earn.",
    "• Boosters / miners — buy rigs in the shop to increase how much you collect per cycle.",
    "• Daily check-in & mini games — keep your streak alive for growing rewards.",
    "",
    "Cash out:",
    perUsdt ? `• ${perUsdt.toLocaleString()} ${symbol} = 1 USDT.` : `• Convert ${symbol} to USDT inside the app.`,
    minWd ? `• Minimum withdrawal: ${minWd} USDT — paid on-chain to your wallet.` : "• Withdraw on-chain to your wallet once you hit the minimum.",
  ];
  if (ref?.signup_bonus) lines.push("", `Referral bonus: ${ref.signup_bonus} ${symbol} for every friend who joins.`);
  return lines.join("\n");
}
