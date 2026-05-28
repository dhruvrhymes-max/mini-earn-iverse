// Curated visual/economy presets shown to creators when setting up a bot.
// Each preset bundles a theme, token identity, action verb, and welcome message.
export type ThemePreset = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  theme: { primary: string; background: string; accent: string };
  token_name: string;
  token_symbol: string;
  token_icon_url: string | null;
  action_verb: string;
  welcome_text: string;
  welcome_cta_text: string;
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "fish",
    label: "FishVerse",
    emoji: "🐟",
    description: "Aqua neon — fishing-themed earning app",
    theme: { primary: "#22d3ee", background: "#06121f", accent: "#06b6d4" },
    token_name: "Fish",
    token_symbol: "FISH",
    token_icon_url: null,
    action_verb: "Fish",
    welcome_text: "🐟 Welcome to FishVerse!\nCast your line. Catch FISH. Withdraw USDT.\n\n🎁 Earn extra FISH by:\n• Completing tasks\n• Watching ads\n• Inviting friends",
    welcome_cta_text: "🎣 Start Fishing",
  },
  {
    id: "wood",
    label: "Wood Rush",
    emoji: "🪵",
    description: "Warm amber — lumberjack mining vibe",
    theme: { primary: "#f59e0b", background: "#1a0f05", accent: "#fbbf24" },
    token_name: "Wood",
    token_symbol: "WOOD",
    token_icon_url: null,
    action_verb: "Chop",
    welcome_text: "⛏️ Welcome to Wood Rush\nStart. Mine. Withdraw.\n\n🤑 Earn Extra Woods By:\n• Completing Tasks\n• Watching Ads\n• Refering Friends",
    welcome_cta_text: "🪵 Start Wood Mining",
  },
  {
    id: "gold",
    label: "Gold Rush",
    emoji: "🏆",
    description: "Luxe gold on black — premium feel",
    theme: { primary: "#eab308", background: "#0a0a0a", accent: "#fde047" },
    token_name: "Gold",
    token_symbol: "GOLD",
    token_icon_url: null,
    action_verb: "Mine",
    welcome_text: "🏆 Welcome to Gold Rush\nDig deep, claim gold, cash out USDT.\n\n✨ Earn more by:\n• Daily tasks\n• Ad rewards\n• Friend invites",
    welcome_cta_text: "⛏️ Start Mining",
  },
  {
    id: "diamond",
    label: "Diamond Hunt",
    emoji: "💎",
    description: "Icy cyan — crystal/diamond hunt",
    theme: { primary: "#60a5fa", background: "#020617", accent: "#a5f3fc" },
    token_name: "Diamond",
    token_symbol: "DMND",
    token_icon_url: null,
    action_verb: "Hunt",
    welcome_text: "💎 Welcome to Diamond Hunt\nHunt rare diamonds and convert to USDT.\n\n🔹 Boost your earnings:\n• Daily tasks\n• Watch & earn\n• Refer friends",
    welcome_cta_text: "💎 Start Hunting",
  },
  {
    id: "crypto",
    label: "Crypto Tap",
    emoji: "🪙",
    description: "Electric purple — Web3 tap-to-earn",
    theme: { primary: "#a855f7", background: "#0b0612", accent: "#c084fc" },
    token_name: "Coin",
    token_symbol: "COIN",
    token_icon_url: null,
    action_verb: "Tap",
    welcome_text: "🪙 Welcome to Crypto Tap\nTap. Stack. Withdraw to your wallet.\n\n⚡ Power up by:\n• Tasks\n• Sponsored ads\n• Referrals",
    welcome_cta_text: "🪙 Start Tapping",
  },
  {
    id: "galaxy",
    label: "Galaxy Miner",
    emoji: "🚀",
    description: "Deep space — sci-fi star mining",
    theme: { primary: "#f472b6", background: "#0b0421", accent: "#818cf8" },
    token_name: "Star",
    token_symbol: "STAR",
    token_icon_url: null,
    action_verb: "Mine",
    welcome_text: "🚀 Welcome to Galaxy Miner\nMine cosmic STAR and withdraw real USDT.\n\n🌌 Earn more:\n• Tasks\n• Ad rewards\n• Refer friends",
    welcome_cta_text: "🚀 Launch Miner",
  },
  {
    id: "forest",
    label: "Forest Quest",
    emoji: "🍃",
    description: "Emerald nature — eco-quest vibe",
    theme: { primary: "#10b981", background: "#04130d", accent: "#6ee7b7" },
    token_name: "Leaf",
    token_symbol: "LEAF",
    token_icon_url: null,
    action_verb: "Gather",
    welcome_text: "🍃 Welcome to Forest Quest\nGather LEAF tokens and cash out USDT.\n\n🌱 Grow faster:\n• Tasks\n• Ads\n• Referrals",
    welcome_cta_text: "🍃 Start Gathering",
  },
];

export const getPreset = (id?: string | null) =>
  THEME_PRESETS.find((p) => p.id === id) ?? null;
