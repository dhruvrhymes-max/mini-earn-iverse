// Curated visual/economy presets shown to creators when setting up a bot.
// Each preset bundles a theme, token identity, action verb, welcome message,
// a `game_mode` (how players earn) and a `layout_family` (how the home screen looks).
// `scene` selects the animated backdrop rendered by <ThemeScene /> / <Theme3D />.
export type SceneKind =
  | "wood" | "gold" | "diamond" | "crypto" | "galaxy" | "forest" | "fish"
  | "lava" | "ocean" | "candy" | "neon" | "ice" | "dragon" | "ghost" | "milk";

/** How players earn in this bot. Tasks + "watch ads & earn" exist in every mode. */
export type GameMode = "mine" | "tap" | "spin" | "idle";

export type LayoutFamily = "cosmic" | "crystal" | "forge" | "playful" | "nature";

export const GAME_MODES: Array<{ id: GameMode; label: string; hint: string }> = [
  { id: "mine", label: "Mine to earn", hint: "Start a cycle, come back and claim" },
  { id: "tap", label: "Tap to earn", hint: "Tap for instant tokens, energy refills over time" },
  { id: "spin", label: "Spin to earn", hint: "Free daily spin plus spins earned from tasks" },
  { id: "idle", label: "Idle / farm to earn", hint: "Production accrues offline, collect on return" },
];

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
  scene: SceneKind;
  game_mode: GameMode;
  layout_family: LayoutFamily;
};

export const THEME_PRESETS: ThemePreset[] = [

  {
    id: "fish", label: "FishVerse", emoji: "🐟", scene: "fish",
    description: "Aqua neon — fishing-themed earning app",
    theme: { primary: "#22d3ee", background: "#06121f", accent: "#06b6d4" },
    token_name: "Fish", token_symbol: "FISH", token_icon_url: null, action_verb: "Fish",
    welcome_text: "🐟 Welcome to FishVerse!\nCast your line. Catch FISH. Withdraw USDT.\n\n🎁 Earn extra FISH by:\n• Completing tasks\n• Watching ads\n• Inviting friends",
    welcome_cta_text: "🎣 Start Fishing",
  },
  {
    id: "wood", label: "Wood Rush", emoji: "🪵", scene: "wood",
    description: "Warm amber — lumberjack mining vibe",
    theme: { primary: "#f59e0b", background: "#1a0f05", accent: "#fbbf24" },
    token_name: "Wood", token_symbol: "WOOD", token_icon_url: null, action_verb: "Chop",
    welcome_text: "⛏️ Welcome to Wood Rush\nStart. Mine. Withdraw.\n\n🤑 Earn Extra Woods By:\n• Completing Tasks\n• Watching Ads\n• Refering Friends",
    welcome_cta_text: "🪵 Start Wood Mining",
  },
  {
    id: "gold", label: "Gold Rush", emoji: "🏆", scene: "gold",
    description: "Luxe gold on black — premium feel",
    theme: { primary: "#eab308", background: "#0a0a0a", accent: "#fde047" },
    token_name: "Gold", token_symbol: "GOLD", token_icon_url: null, action_verb: "Mine",
    welcome_text: "🏆 Welcome to Gold Rush\nDig deep, claim gold, cash out USDT.\n\n✨ Earn more by:\n• Daily tasks\n• Ad rewards\n• Friend invites",
    welcome_cta_text: "⛏️ Start Mining",
  },
  {
    id: "diamond", label: "Diamond Hunt", emoji: "💎", scene: "diamond",
    description: "Icy cyan — crystal/diamond hunt",
    theme: { primary: "#60a5fa", background: "#020617", accent: "#a5f3fc" },
    token_name: "Diamond", token_symbol: "DMND", token_icon_url: null, action_verb: "Hunt",
    welcome_text: "💎 Welcome to Diamond Hunt\nHunt rare diamonds and convert to USDT.\n\n🔹 Boost your earnings:\n• Daily tasks\n• Watch & earn\n• Refer friends",
    welcome_cta_text: "💎 Start Hunting",
  },
  {
    id: "crypto", label: "Crypto Tap", emoji: "🪙", scene: "crypto",
    description: "Electric purple — Web3 tap-to-earn",
    theme: { primary: "#a855f7", background: "#0b0612", accent: "#c084fc" },
    token_name: "Coin", token_symbol: "COIN", token_icon_url: null, action_verb: "Tap",
    welcome_text: "🪙 Welcome to Crypto Tap\nTap. Stack. Withdraw to your wallet.\n\n⚡ Power up by:\n• Tasks\n• Sponsored ads\n• Referrals",
    welcome_cta_text: "🪙 Start Tapping",
  },
  {
    id: "galaxy", label: "Galaxy Miner", emoji: "🚀", scene: "galaxy",
    description: "Deep space — stars, moon, planets",
    theme: { primary: "#f472b6", background: "#0b0421", accent: "#818cf8" },
    token_name: "Star", token_symbol: "STAR", token_icon_url: null, action_verb: "Mine",
    welcome_text: "🚀 Welcome to Galaxy Miner\nMine cosmic STAR and withdraw real USDT.\n\n🌌 Earn more:\n• Tasks\n• Ad rewards\n• Refer friends",
    welcome_cta_text: "🚀 Launch Miner",
  },
  {
    id: "forest", label: "Forest Quest", emoji: "🍃", scene: "forest",
    description: "Emerald nature — falling leaves",
    theme: { primary: "#10b981", background: "#04130d", accent: "#6ee7b7" },
    token_name: "Leaf", token_symbol: "LEAF", token_icon_url: null, action_verb: "Gather",
    welcome_text: "🍃 Welcome to Forest Quest\nGather LEAF tokens and cash out USDT.\n\n🌱 Grow faster:\n• Tasks\n• Ads\n• Referrals",
    welcome_cta_text: "🍃 Start Gathering",
  },
  // ── 6 new themes ───────────────────────────────────────────────
  {
    id: "lava", label: "Lava Forge", emoji: "🌋", scene: "lava",
    description: "Molten red — volcano forge mining",
    theme: { primary: "#ef4444", background: "#170707", accent: "#fb923c" },
    token_name: "Ember", token_symbol: "EMBR", token_icon_url: null, action_verb: "Forge",
    welcome_text: "🌋 Welcome to Lava Forge\nForge molten EMBR tokens and trade for USDT.\n\n🔥 Heat things up:\n• Daily tasks\n• Watch ads\n• Refer friends",
    welcome_cta_text: "🔥 Start Forging",
  },
  {
    id: "ocean", label: "Ocean Drift", emoji: "🌊", scene: "ocean",
    description: "Deep blue — pearls, waves, bubbles",
    theme: { primary: "#0ea5e9", background: "#020a1a", accent: "#67e8f9" },
    token_name: "Pearl", token_symbol: "PRL", token_icon_url: null, action_verb: "Dive",
    welcome_text: "🌊 Welcome to Ocean Drift\nDive deep, harvest PRL pearls, withdraw USDT.\n\n🐚 Earn more:\n• Tasks\n• Ads\n• Referrals",
    welcome_cta_text: "🐚 Start Diving",
  },
  {
    id: "candy", label: "Candy Pop", emoji: "🍭", scene: "candy",
    description: "Bubblegum pink — sweet tap-to-earn",
    theme: { primary: "#ec4899", background: "#1a0820", accent: "#fbcfe8" },
    token_name: "Candy", token_symbol: "CNDY", token_icon_url: null, action_verb: "Pop",
    welcome_text: "🍭 Welcome to Candy Pop\nPop sweet CNDY and convert to USDT.\n\n🍬 Sweeter rewards:\n• Tasks\n• Watch & earn\n• Refer friends",
    welcome_cta_text: "🍬 Start Popping",
  },
  {
    id: "neon", label: "Neon City", emoji: "🌆", scene: "neon",
    description: "Cyberpunk neon — synthwave grid",
    theme: { primary: "#22d3ee", background: "#0a0014", accent: "#f0abfc" },
    token_name: "Volt", token_symbol: "VLT", token_icon_url: null, action_verb: "Charge",
    welcome_text: "🌆 Welcome to Neon City\nCharge VLT in the grid. Withdraw real USDT.\n\n⚡ Stack faster:\n• Tasks\n• Ads\n• Referrals",
    welcome_cta_text: "⚡ Start Charging",
  },
  {
    id: "ice", label: "Frost Peak", emoji: "❄️", scene: "ice",
    description: "Arctic white — snowflakes, aurora",
    theme: { primary: "#7dd3fc", background: "#04101a", accent: "#e0f2fe" },
    token_name: "Frost", token_symbol: "FRST", token_icon_url: null, action_verb: "Mine",
    welcome_text: "❄️ Welcome to Frost Peak\nMine FRST crystals in the snowstorm.\n\n☃️ Earn more:\n• Tasks\n• Ads\n• Refer friends",
    welcome_cta_text: "❄️ Start Mining",
  },
  {
    id: "dragon", label: "Dragon Hoard", emoji: "🐉", scene: "dragon",
    description: "Mythic crimson — dragon scales & fire",
    theme: { primary: "#dc2626", background: "#0f0008", accent: "#fbbf24" },
    token_name: "Scale", token_symbol: "SCL", token_icon_url: null, action_verb: "Hoard",
    welcome_text: "🐉 Welcome to Dragon Hoard\nHoard SCL scales. Trade for USDT.\n\n🔥 Bigger hoards:\n• Tasks\n• Ads\n• Refer friends",
    welcome_cta_text: "🐉 Start Hoarding",
  },
  {
    id: "ghost", label: "Ghostly", emoji: "👻", scene: "ghost",
    description: "Neon purple — spooky ghost tap-to-earn",
    theme: { primary: "#a855f7", background: "#0d0620", accent: "#ec4899" },
    token_name: "Ghost", token_symbol: "GHOST", token_icon_url: null, action_verb: "Haunt",
    welcome_text: "👻 Welcome to Ghostly\nHaunt the crypt. Stack GHOST. Withdraw USDT.\n\n💀 Earn more:\n• Daily tasks\n• Watch ads\n• Refer friends",
    welcome_cta_text: "👻 Start Haunting",
  },
  {
    id: "milk", label: "Milk Rush", emoji: "🥛", scene: "milk",
    description: "Warm cream & orange — cozy dairy vibes",
    theme: { primary: "#f97316", background: "#1a1108", accent: "#fde68a" },
    token_name: "Milk", token_symbol: "MILK", token_icon_url: null, action_verb: "Pour",
    welcome_text: "🥛 Welcome to Milk Rush\nPour MILK, stack rewards, cash out USDT.\n\n🍯 Earn more:\n• Daily tasks\n• Watch ads\n• Refer friends",
    welcome_cta_text: "🥛 Start Pouring",
  },
];

export const getPreset = (id?: string | null) =>
  THEME_PRESETS.find((p) => p.id === id) ?? null;
