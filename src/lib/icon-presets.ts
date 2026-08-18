/**
 * Built-in icon presets for token logos and miner artwork.
 *
 * Icons are generated as inline SVG data URIs so every bot can have a real
 * image logo without hosting any asset. Admins can still paste a URL or
 * upload a custom PNG.
 */

export function emojiIconUrl(emoji: string, from = "#f59e0b", to = "#b45309") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><circle cx="64" cy="64" r="62" fill="url(#g)"/><circle cx="64" cy="64" r="62" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="4"/><text x="64" y="86" font-size="62" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type IconPreset = { label: string; url: string };

const mk = (label: string, emoji: string, from: string, to: string): IconPreset => ({
  label,
  url: emojiIconUrl(emoji, from, to),
});

export const TOKEN_ICON_PRESETS: IconPreset[] = [
  mk("Gold coin", "🪙", "#fbbf24", "#b45309"),
  mk("Gem", "💎", "#38bdf8", "#1d4ed8"),
  mk("Fire", "🔥", "#fb923c", "#b91c1c"),
  mk("Bolt", "⚡", "#facc15", "#a16207"),
  mk("Star", "⭐", "#fde047", "#ca8a04"),
  mk("Crown", "👑", "#fcd34d", "#92400e"),
  mk("Rocket", "🚀", "#a78bfa", "#4c1d95"),
  mk("Leaf", "🍃", "#4ade80", "#166534"),
  mk("Skull", "💀", "#e5e7eb", "#374151"),
  mk("Moon", "🌙", "#c4b5fd", "#312e81"),
  mk("Drop", "💧", "#67e8f9", "#0e7490"),
  mk("Pickaxe", "⛏️", "#94a3b8", "#334155"),
];

export const MINER_ICON_PRESETS: IconPreset[] = [
  mk("Starter pick", "⛏️", "#94a3b8", "#334155"),
  mk("Hammer", "🔨", "#fbbf24", "#78350f"),
  mk("Drill", "🛠️", "#60a5fa", "#1e3a8a"),
  mk("Robot", "🤖", "#a5b4fc", "#312e81"),
  mk("Rig", "🖥️", "#34d399", "#065f46"),
  mk("Reactor", "☢️", "#fde047", "#854d0e"),
  mk("Rocket rig", "🚀", "#f472b6", "#831843"),
  mk("Dragon", "🐉", "#4ade80", "#14532d"),
  mk("Crown rig", "👑", "#fcd34d", "#92400e"),
  mk("Diamond rig", "💎", "#38bdf8", "#1d4ed8"),
  mk("Volcano", "🌋", "#fb7185", "#7f1d1d"),
  mk("Galaxy", "🌌", "#c084fc", "#1e1b4b"),
];
