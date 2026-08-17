// Per-theme "skin" system.
//
// Every tenant theme belongs to one of five layout families. The family decides
// far more than colours: card geometry, nav shape, button silhouette, section
// headers and even which items appear in the bottom bar. This keeps the 27
// presets from looking like the same template with different hues.

export type Family = "cosmic" | "crystal" | "forge" | "playful" | "nature";

const SCENE_FAMILY: Record<string, Family> = {
  galaxy: "cosmic", neon: "cosmic", crypto: "cosmic",
  diamond: "crystal", ice: "crystal", ocean: "crystal", fish: "crystal",
  lava: "forge", dragon: "forge", gold: "forge", wood: "forge",
  candy: "playful", milk: "playful", ghost: "playful",
  forest: "nature",
};

export function familyOf(tenant: any): Family {
  const theme = (tenant?.theme ?? {}) as any;
  const requested = theme.layout_family as Family | undefined;
  if (requested && requested in SKIN) return requested;
  const scene = (tenant?.theme_preset || theme.scene || "gold") as string;
  return SCENE_FAMILY[scene] ?? "playful";
}

export type Skin = {
  /** page wrapper */
  page: string;
  /** primary surface / list row */
  card: string;
  cardStyle: (primary: string, accent: string) => React.CSSProperties;
  /** section heading */
  section: string;
  /** page title */
  title: string;
  /** call-to-action button silhouette */
  cta: string;
  /** bottom navigation container */
  nav: string;
  navStyle: (primary: string) => React.CSSProperties;
  /** nav item wrapper (inactive / active handled inline) */
  navItem: string;
  navIconWrap: (active: boolean) => string;
  /** does this family use a raised center action button? */
  centerAction: boolean;
  /** how many destinations sit in the bar */
  navKeys: Array<"home" | "tasks" | "miners" | "refer" | "profile" | "wallet">;
  /** label casing helper */
  labelClass: string;
};

export const SKIN: Record<Family, Skin> = {
  cosmic: {
    page: "px-4 pt-6",
    card: "rounded-2xl px-4 py-3 backdrop-blur-md",
    cardStyle: (p) => ({ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 0 24px -18px ${p}` }),
    section: "text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3 px-1",
    title: "text-2xl font-black tracking-tight",
    cta: "rounded-full px-6 py-3 font-bold uppercase tracking-[0.15em] text-black",
    nav: "fixed bottom-3 left-3 right-3 max-w-md mx-auto rounded-full backdrop-blur-xl flex justify-around items-center py-2 z-40",
    navStyle: (p) => ({ background: "rgba(10,10,20,0.75)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: `0 0 40px -22px ${p}` }),
    navItem: "flex flex-col items-center text-[10px] tracking-wider",
    navIconWrap: (a) => `p-1.5 rounded-full ${a ? "bg-white/10" : ""}`,
    centerAction: true,
    navKeys: ["home", "tasks", "miners", "refer", "profile"],
    labelClass: "uppercase",
  },
  crystal: {
    page: "px-4 pt-6",
    card: "px-4 py-3 [clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)]",
    cardStyle: (p, a) => ({ background: `linear-gradient(135deg, ${hexA(p, 0.16)}, rgba(255,255,255,0.04) 55%, ${hexA(a, 0.12)})`, border: "1px solid rgba(255,255,255,0.16)" }),
    section: "text-xs font-semibold tracking-[0.2em] text-white/50 mb-3 pl-3 border-l-2",
    title: "text-2xl font-extrabold tracking-[0.02em]",
    cta: "px-6 py-3 font-bold text-black [clip-path:polygon(12px_0,100%_0,calc(100%-12px)_100%,0_100%)]",
    nav: "fixed bottom-0 left-0 right-0 max-w-md mx-auto flex justify-around items-stretch pt-2 pb-2 z-40 backdrop-blur-xl",
    navStyle: (p) => ({ background: "rgba(6,14,22,0.85)", borderTop: `1px solid ${hexA(p, 0.45)}` }),
    navItem: "flex flex-col items-center text-[10px] px-2",
    navIconWrap: (a) => `p-1.5 ${a ? "[clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)] bg-white/15" : ""}`,
    centerAction: false,
    navKeys: ["home", "tasks", "miners", "refer", "profile"],
    labelClass: "tracking-wide",
  },
  forge: {
    page: "px-4 pt-5",
    card: "rounded-md px-4 py-3",
    cardStyle: (p) => ({ background: "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(0,0,0,0.35))", borderTop: "1px solid rgba(255,255,255,0.18)", borderBottom: `3px solid ${hexA(p, 0.75)}` }),
    section: "text-xs font-black uppercase tracking-[0.25em] text-white/45 mb-2",
    title: "text-2xl font-black uppercase tracking-[0.06em]",
    cta: "rounded-md px-6 py-3 font-black uppercase text-black border-b-4 border-black/40",
    nav: "fixed bottom-0 left-0 right-0 max-w-md mx-auto grid grid-cols-5 items-center py-2 z-40",
    navStyle: (p) => ({ background: "linear-gradient(180deg,#141414,#000)", borderTop: `2px solid ${hexA(p, 0.6)}` }),
    navItem: "flex flex-col items-center text-[10px] uppercase font-bold",
    navIconWrap: (a) => `p-1.5 ${a ? "[clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)] bg-white/15" : ""}`,
    centerAction: true,
    navKeys: ["home", "tasks", "miners", "refer", "profile"],
    labelClass: "uppercase",
  },
  playful: {
    page: "px-4 pt-6",
    card: "rounded-[26px] px-4 py-3.5",
    cardStyle: (p, a) => ({ background: `linear-gradient(160deg, ${hexA(p, 0.22)}, ${hexA(a, 0.1)})`, border: "2px solid rgba(255,255,255,0.18)", boxShadow: "0 6px 0 rgba(0,0,0,0.28)" }),
    section: "text-sm font-extrabold text-white/70 mb-2 px-1",
    title: "text-[26px] font-black",
    cta: "rounded-full px-7 py-3.5 font-black text-black shadow-[0_6px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none transition",
    nav: "fixed bottom-3 left-4 right-4 max-w-md mx-auto rounded-[30px] flex justify-around items-center py-2.5 z-40",
    navStyle: () => ({ background: "rgba(20,10,30,0.92)", border: "2px solid rgba(255,255,255,0.16)", boxShadow: "0 8px 0 rgba(0,0,0,0.35)" }),
    navItem: "flex flex-col items-center text-[10px] font-bold",
    navIconWrap: (a) => `rounded-full p-2 ${a ? "bg-white/20 scale-110" : ""} transition-transform`,
    centerAction: false,
    navKeys: ["home", "tasks", "miners", "refer", "profile"],
    labelClass: "",
  },
  nature: {
    page: "px-4 pt-6",
    card: "rounded-[22px] rounded-tl-[6px] px-4 py-3 border-l-4",
    cardStyle: (p) => ({ background: "rgba(255,255,255,0.06)", borderColor: hexA(p, 0.8), border: "1px solid rgba(255,255,255,0.1)", borderLeft: `4px solid ${p}` }),
    section: "text-xs font-semibold tracking-wide text-white/50 mb-2",
    title: "text-2xl font-bold",
    cta: "rounded-[18px] px-6 py-3 font-bold text-black",
    nav: "fixed bottom-0 left-0 right-0 max-w-md mx-auto flex justify-around items-center pt-3 pb-2 z-40 rounded-t-[28px] backdrop-blur",
    navStyle: (p) => ({ background: "rgba(9,20,14,0.9)", borderTop: `1px solid ${hexA(p, 0.35)}` }),
    navItem: "flex flex-col items-center text-[10px]",
    navIconWrap: (a) => `p-1.5 rounded-[14px] rounded-tl-[4px] ${a ? "bg-white/12" : ""}`,
    centerAction: false,
    navKeys: ["home", "tasks", "miners", "refer", "profile"],
    labelClass: "",
  },
};

export function skinOf(tenant: any): Skin {
  return SKIN[familyOf(tenant)];
}

/** hex + alpha → rgba() string, tolerant of bad input. */
export function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
