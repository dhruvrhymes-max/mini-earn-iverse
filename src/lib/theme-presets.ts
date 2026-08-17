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
    id: "fish", label: "FishVerse", emoji: "🐟", scene: "fish", game_mode: "mine", layout_family: "crystal",
    description: "Aqua neon — fishing-themed earning app",
    theme: { primary: "#22d3ee", background: "#06121f", accent: "#06b6d4" },
    token_name: "Fish", token_symbol: "FISH", token_icon_url: null, action_verb: "Fish",
    welcome_text: "🐟 Welcome to FishVerse!\nCast your line. Catch FISH. Withdraw USDT.\n\n🎁 Earn extra FISH by:\n• Completing tasks\n• Watching ads\n• Inviting friends",
    welcome_cta_text: "🎣 Start Fishing",
  },
  {
    id: "wood", label: "Wood Rush", emoji: "🪵", scene: "wood", game_mode: "mine", layout_family: "forge",
    description: "Warm amber — lumberjack mining vibe",
    theme: { primary: "#f59e0b", background: "#1a0f05", accent: "#fbbf24" },
    token_name: "Wood", token_symbol: "WOOD", token_icon_url: null, action_verb: "Chop",
    welcome_text: "⛏️ Welcome to Wood Rush\nStart. Mine. Withdraw.\n\n🤑 Earn Extra Woods By:\n• Completing Tasks\n• Watching Ads\n• Refering Friends",
    welcome_cta_text: "🪵 Start Wood Mining",
  },
  {
    id: "gold", label: "Gold Rush", emoji: "🏆", scene: "gold", game_mode: "mine", layout_family: "forge",
    description: "Luxe gold on black — premium feel",
    theme: { primary: "#eab308", background: "#0a0a0a", accent: "#fde047" },
    token_name: "Gold", token_symbol: "GOLD", token_icon_url: null, action_verb: "Mine",
    welcome_text: "🏆 Welcome to Gold Rush\nDig deep, claim gold, cash out USDT.\n\n✨ Earn more by:\n• Daily tasks\n• Ad rewards\n• Friend invites",
    welcome_cta_text: "⛏️ Start Mining",
  },
  {
    id: "diamond", label: "Diamond Hunt", emoji: "💎", scene: "diamond", game_mode: "mine", layout_family: "crystal",
    description: "Icy cyan — crystal/diamond hunt",
    theme: { primary: "#60a5fa", background: "#020617", accent: "#a5f3fc" },
    token_name: "Diamond", token_symbol: "DMND", token_icon_url: null, action_verb: "Hunt",
    welcome_text: "💎 Welcome to Diamond Hunt\nHunt rare diamonds and convert to USDT.\n\n🔹 Boost your earnings:\n• Daily tasks\n• Watch & earn\n• Refer friends",
    welcome_cta_text: "💎 Start Hunting",
  },
  {
    id: "crypto", label: "Crypto Tap", emoji: "🪙", scene: "crypto", game_mode: "tap", layout_family: "cosmic",
    description: "Electric purple — Web3 tap-to-earn",
    theme: { primary: "#a855f7", background: "#0b0612", accent: "#c084fc" },
    token_name: "Coin", token_symbol: "COIN", token_icon_url: null, action_verb: "Tap",
    welcome_text: "🪙 Welcome to Crypto Tap\nTap. Stack. Withdraw to your wallet.\n\n⚡ Power up by:\n• Tasks\n• Sponsored ads\n• Referrals",
    welcome_cta_text: "🪙 Start Tapping",
  },
  {
    id: "galaxy", label: "Galaxy Miner", emoji: "🚀", scene: "galaxy", game_mode: "mine", layout_family: "cosmic",
    description: "Deep space — stars, moon, planets",
    theme: { primary: "#f472b6", background: "#0b0421", accent: "#818cf8" },
    token_name: "Star", token_symbol: "STAR", token_icon_url: null, action_verb: "Mine",
    welcome_text: "🚀 Welcome to Galaxy Miner\nMine cosmic STAR and withdraw real USDT.\n\n🌌 Earn more:\n• Tasks\n• Ad rewards\n• Refer friends",
    welcome_cta_text: "🚀 Launch Miner",
  },
  {
    id: "forest", label: "Forest Quest", emoji: "🍃", scene: "forest", game_mode: "idle", layout_family: "nature",
    description: "Emerald nature — falling leaves",
    theme: { primary: "#10b981", background: "#04130d", accent: "#6ee7b7" },
    token_name: "Leaf", token_symbol: "LEAF", token_icon_url: null, action_verb: "Gather",
    welcome_text: "🍃 Welcome to Forest Quest\nGather LEAF tokens and cash out USDT.\n\n🌱 Grow faster:\n• Tasks\n• Ads\n• Referrals",
    welcome_cta_text: "🍃 Start Gathering",
  },
  // ── 6 new themes ───────────────────────────────────────────────
  {
    id: "lava", label: "Lava Forge", emoji: "🌋", scene: "lava", game_mode: "mine", layout_family: "forge",
    description: "Molten red — volcano forge mining",
    theme: { primary: "#ef4444", background: "#170707", accent: "#fb923c" },
    token_name: "Ember", token_symbol: "EMBR", token_icon_url: null, action_verb: "Forge",
    welcome_text: "🌋 Welcome to Lava Forge\nForge molten EMBR tokens and trade for USDT.\n\n🔥 Heat things up:\n• Daily tasks\n• Watch ads\n• Refer friends",
    welcome_cta_text: "🔥 Start Forging",
  },
  {
    id: "ocean", label: "Ocean Drift", emoji: "🌊", scene: "ocean", game_mode: "idle", layout_family: "crystal",
    description: "Deep blue — pearls, waves, bubbles",
    theme: { primary: "#0ea5e9", background: "#020a1a", accent: "#67e8f9" },
    token_name: "Pearl", token_symbol: "PRL", token_icon_url: null, action_verb: "Dive",
    welcome_text: "🌊 Welcome to Ocean Drift\nDive deep, harvest PRL pearls, withdraw USDT.\n\n🐚 Earn more:\n• Tasks\n• Ads\n• Referrals",
    welcome_cta_text: "🐚 Start Diving",
  },
  {
    id: "candy", label: "Candy Pop", emoji: "🍭", scene: "candy", game_mode: "tap", layout_family: "playful",
    description: "Bubblegum pink — sweet tap-to-earn",
    theme: { primary: "#ec4899", background: "#1a0820", accent: "#fbcfe8" },
    token_name: "Candy", token_symbol: "CNDY", token_icon_url: null, action_verb: "Pop",
    welcome_text: "🍭 Welcome to Candy Pop\nPop sweet CNDY and convert to USDT.\n\n🍬 Sweeter rewards:\n• Tasks\n• Watch & earn\n• Refer friends",
    welcome_cta_text: "🍬 Start Popping",
  },
  {
    id: "neon", label: "Neon City", emoji: "🌆", scene: "neon", game_mode: "tap", layout_family: "cosmic",
    description: "Cyberpunk neon — synthwave grid",
    theme: { primary: "#22d3ee", background: "#0a0014", accent: "#f0abfc" },
    token_name: "Volt", token_symbol: "VLT", token_icon_url: null, action_verb: "Charge",
    welcome_text: "🌆 Welcome to Neon City\nCharge VLT in the grid. Withdraw real USDT.\n\n⚡ Stack faster:\n• Tasks\n• Ads\n• Referrals",
    welcome_cta_text: "⚡ Start Charging",
  },
  {
    id: "ice", label: "Frost Peak", emoji: "❄️", scene: "ice", game_mode: "mine", layout_family: "crystal",
    description: "Arctic white — snowflakes, aurora",
    theme: { primary: "#7dd3fc", background: "#04101a", accent: "#e0f2fe" },
    token_name: "Frost", token_symbol: "FRST", token_icon_url: null, action_verb: "Mine",
    welcome_text: "❄️ Welcome to Frost Peak\nMine FRST crystals in the snowstorm.\n\n☃️ Earn more:\n• Tasks\n• Ads\n• Refer friends",
    welcome_cta_text: "❄️ Start Mining",
  },
  {
    id: "dragon", label: "Dragon Hoard", emoji: "🐉", scene: "dragon", game_mode: "mine", layout_family: "forge",
    description: "Mythic crimson — dragon scales & fire",
    theme: { primary: "#dc2626", background: "#0f0008", accent: "#fbbf24" },
    token_name: "Scale", token_symbol: "SCL", token_icon_url: null, action_verb: "Hoard",
    welcome_text: "🐉 Welcome to Dragon Hoard\nHoard SCL scales. Trade for USDT.\n\n🔥 Bigger hoards:\n• Tasks\n• Ads\n• Refer friends",
    welcome_cta_text: "🐉 Start Hoarding",
  },
  {
    id: "ghost", label: "Ghostly", emoji: "👻", scene: "ghost", game_mode: "tap", layout_family: "playful",
    description: "Neon purple — spooky ghost tap-to-earn",
    theme: { primary: "#a855f7", background: "#0d0620", accent: "#ec4899" },
    token_name: "Ghost", token_symbol: "GHOST", token_icon_url: null, action_verb: "Haunt",
    welcome_text: "👻 Welcome to Ghostly\nHaunt the crypt. Stack GHOST. Withdraw USDT.\n\n💀 Earn more:\n• Daily tasks\n• Watch ads\n• Refer friends",
    welcome_cta_text: "👻 Start Haunting",
  },
  {
    id: "milk", label: "Milk Rush", emoji: "🥛", scene: "milk", game_mode: "idle", layout_family: "playful",
    description: "Warm cream & orange — cozy dairy vibes",
    theme: { primary: "#f97316", background: "#1a1108", accent: "#fde68a" },
    token_name: "Milk", token_symbol: "MILK", token_icon_url: null, action_verb: "Pour",
    welcome_text: "🥛 Welcome to Milk Rush\nPour MILK, stack rewards, cash out USDT.\n\n🍯 Earn more:\n• Daily tasks\n• Watch ads\n• Refer friends",
    welcome_cta_text: "🥛 Start Pouring",
  },
  // ── tap to earn ────────────────────────────────────────────────
  {
    id: "fruit", label: "Fruit Press", emoji: "🍊", scene: "candy", game_mode: "tap", layout_family: "playful",
    description: "Citrus orange — squeeze fruit for instant juice",
    theme: { primary: "#fb923c", background: "#1b0c04", accent: "#facc15" },
    token_name: "Juice", token_symbol: "JUICE", token_icon_url: null, action_verb: "Squeeze",
    welcome_text: "🍊 Welcome to Fruit Press\nSqueeze fruit, stack JUICE, cash out USDT.\n\n🧃 Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "🍊 Start Squeezing",
  },
  {
    id: "volt", label: "Volt Tap", emoji: "⚡", scene: "neon", game_mode: "tap", layout_family: "cosmic",
    description: "Electric blue — energy bar tap-to-earn",
    theme: { primary: "#38bdf8", background: "#020617", accent: "#facc15" },
    token_name: "Volt", token_symbol: "VOLT", token_icon_url: null, action_verb: "Zap",
    welcome_text: "⚡ Welcome to Volt Tap\nZap the core, drain your energy, refill and repeat.\n\n🔋 Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "⚡ Start Zapping",
  },
  {
    id: "arcade", label: "Pixel Arcade", emoji: "🕹️", scene: "crypto", game_mode: "tap", layout_family: "playful",
    description: "Retro magenta — 8-bit arcade tapping",
    theme: { primary: "#e879f9", background: "#12021c", accent: "#4ade80" },
    token_name: "Credit", token_symbol: "CRDT", token_icon_url: null, action_verb: "Play",
    welcome_text: "🕹️ Welcome to Pixel Arcade\nInsert credits, tap to score, withdraw USDT.\n\n👾 Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "🕹️ Insert Credit",
  },
  // ── spin to earn ───────────────────────────────────────────────
  {
    id: "orbit", label: "Lucky Orbit", emoji: "🎯", scene: "galaxy", game_mode: "spin", layout_family: "cosmic",
    description: "Deep violet — orbital prize wheel",
    theme: { primary: "#8b5cf6", background: "#08041a", accent: "#22d3ee" },
    token_name: "Orbit", token_symbol: "ORB", token_icon_url: null, action_verb: "Spin",
    welcome_text: "🎯 Welcome to Lucky Orbit\nOne free spin daily, more spins from tasks.\n\n🌌 Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "🎯 Spin the Orbit",
  },
  {
    id: "rune", label: "Rune Wheel", emoji: "🔮", scene: "ghost", game_mode: "spin", layout_family: "crystal",
    description: "Arcane teal — mystical rune spinner",
    theme: { primary: "#2dd4bf", background: "#04121a", accent: "#c084fc" },
    token_name: "Rune", token_symbol: "RUNE", token_icon_url: null, action_verb: "Cast",
    welcome_text: "🔮 Welcome to Rune Wheel\nCast the wheel, collect RUNE, withdraw USDT.\n\n✨ Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "🔮 Cast a Spin",
  },
  {
    id: "comet", label: "Comet Wheel", emoji: "☄️", scene: "ice", game_mode: "spin", layout_family: "cosmic",
    description: "Frozen indigo — comet trail jackpot wheel",
    theme: { primary: "#818cf8", background: "#050a1c", accent: "#7dd3fc" },
    token_name: "Comet", token_symbol: "CMT", token_icon_url: null, action_verb: "Launch",
    welcome_text: "☄️ Welcome to Comet Wheel\nLaunch a spin, chase the jackpot, cash out USDT.\n\n🌠 Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "☄️ Launch Spin",
  },
  // ── idle / farm to earn ────────────────────────────────────────
  {
    id: "coffee", label: "Coffee Roastery", emoji: "☕", scene: "wood", game_mode: "idle", layout_family: "forge",
    description: "Roasted brown — beans roast while you're away",
    theme: { primary: "#b45309", background: "#150c05", accent: "#fcd34d" },
    token_name: "Bean", token_symbol: "BEAN", token_icon_url: null, action_verb: "Roast",
    welcome_text: "☕ Welcome to Coffee Roastery\nYour roaster works offline — come back and collect.\n\n🫘 Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "☕ Start Roasting",
  },
  {
    id: "sky", label: "Sky Harvest", emoji: "🌾", scene: "forest", game_mode: "idle", layout_family: "nature",
    description: "Sunlit lime — floating farm islands",
    theme: { primary: "#84cc16", background: "#07140a", accent: "#fde047" },
    token_name: "Grain", token_symbol: "GRAIN", token_icon_url: null, action_verb: "Harvest",
    welcome_text: "🌾 Welcome to Sky Harvest\nCrops grow while you're away. Harvest and cash out USDT.\n\n🌤️ Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "🌾 Start Harvesting",
  },
  {
    id: "bakery", label: "Bakery Rush", emoji: "🥐", scene: "milk", game_mode: "idle", layout_family: "playful",
    description: "Buttery gold — ovens bake around the clock",
    theme: { primary: "#f59e0b", background: "#1a1207", accent: "#fef3c7" },
    token_name: "Crumb", token_symbol: "CRMB", token_icon_url: null, action_verb: "Bake",
    welcome_text: "🥐 Welcome to Bakery Rush\nOvens keep baking offline — collect your tray.\n\n🍞 Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "🥐 Start Baking",
  },
  {
    id: "caravan", label: "Nomad Caravan", emoji: "🐫", scene: "gold", game_mode: "idle", layout_family: "forge",
    description: "Desert sand — trade routes running overnight",
    theme: { primary: "#d97706", background: "#140d04", accent: "#fbbf24" },
    token_name: "Spice", token_symbol: "SPICE", token_icon_url: null, action_verb: "Trade",
    welcome_text: "🐫 Welcome to Nomad Caravan\nYour caravan trades while you sleep. Collect SPICE.\n\n🏜️ Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "🐫 Send Caravan",
  },
  // ── extra mine variants ────────────────────────────────────────
  {
    id: "reef", label: "Reef Dive", emoji: "🐚", scene: "ocean", game_mode: "mine", layout_family: "crystal",
    description: "Turquoise reef — deep dive salvage runs",
    theme: { primary: "#14b8a6", background: "#03121a", accent: "#a7f3d0" },
    token_name: "Coral", token_symbol: "CORAL", token_icon_url: null, action_verb: "Dive",
    welcome_text: "🐚 Welcome to Reef Dive\nRun dives, surface with CORAL, withdraw USDT.\n\n🪸 Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "🐚 Start Diving",
  },
  {
    id: "cavern", label: "Crystal Cavern", emoji: "🔷", scene: "diamond", game_mode: "mine", layout_family: "crystal",
    description: "Glacial indigo — deep cavern crystal seams",
    theme: { primary: "#6366f1", background: "#04061a", accent: "#67e8f9" },
    token_name: "Shard", token_symbol: "SHARD", token_icon_url: null, action_verb: "Cleave",
    welcome_text: "🔷 Welcome to Crystal Cavern\nCleave seams, bank SHARD, cash out USDT.\n\n💠 Earn more:\n• Daily tasks\n• Watch ads & earn\n• Invite friends",
    welcome_cta_text: "🔷 Start Cleaving",
  },
];


export const getPreset = (id?: string | null) =>
  THEME_PRESETS.find((p) => p.id === id) ?? null;
