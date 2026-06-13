import { useMemo } from "react";
import type { SceneKind } from "@/lib/theme-presets";

/**
 * Animated themed backdrop for the mining/home screen.
 * Pure SVG + CSS — works inside Telegram WebView with no extra deps,
 * no network calls, and minimal CPU.
 *
 * Pass `kind` (scene id from theme preset) and the active theme colors.
 * Rendered as an absolutely-positioned layer; place behind tap content.
 */
export function ThemeScene({
  kind,
  primary,
  accent,
}: {
  kind: SceneKind | string | undefined;
  primary: string;
  accent: string;
}) {
  const seed = useMemo(() => Math.random(), []);
  const k = (kind || "gold") as SceneKind;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Soft radial glow shared by every scene */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(60% 50% at 50% 30%, ${primary}33, transparent 70%)`,
        }}
      />
      <SceneLayer kind={k} primary={primary} accent={accent} seed={seed} />
      <SceneStyles />
    </div>
  );
}

function SceneLayer({
  kind,
  primary,
  accent,
  seed,
}: {
  kind: SceneKind;
  primary: string;
  accent: string;
  seed: number;
}) {
  switch (kind) {
    case "galaxy":
      return <Galaxy primary={primary} accent={accent} seed={seed} />;
    case "diamond":
      return <Diamonds primary={primary} accent={accent} />;
    case "forest":
      return <Forest primary={primary} accent={accent} />;
    case "ocean":
      return <Ocean primary={primary} accent={accent} />;
    case "lava":
      return <Lava primary={primary} accent={accent} />;
    case "candy":
      return <Candy primary={primary} accent={accent} />;
    case "neon":
      return <Neon primary={primary} accent={accent} />;
    case "ice":
      return <Ice primary={primary} accent={accent} />;
    case "dragon":
      return <Dragon primary={primary} accent={accent} />;
    case "fish":
      return <Fish primary={primary} accent={accent} />;
    case "wood":
      return <Wood primary={primary} accent={accent} />;
    case "crypto":
      return <CryptoScene primary={primary} accent={accent} />;
    case "gold":
    default:
      return <Gold primary={primary} accent={accent} />;
  }
}

// ────────────────────────── helpers ──────────────────────────
function Floaters({
  count,
  emoji,
  duration = 12,
  size = 18,
}: {
  count: number;
  emoji: string;
  duration?: number;
  size?: number;
}) {
  const items = Array.from({ length: count });
  return (
    <>
      {items.map((_, i) => {
        const left = (i * 97) % 100;
        const delay = (i * 0.7) % duration;
        const dur = duration + ((i * 1.3) % 6);
        const scale = 0.7 + ((i * 0.13) % 0.8);
        return (
          <span
            key={i}
            className="absolute scene-fall"
            style={{
              left: `${left}%`,
              top: "-10%",
              fontSize: `${size}px`,
              animationDelay: `-${delay}s`,
              animationDuration: `${dur}s`,
              transform: `scale(${scale})`,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,.4))",
            }}
          >
            {emoji}
          </span>
        );
      })}
    </>
  );
}

function Dots({ color, count = 60 }: { color: string; count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const x = (i * 53) % 100;
        const y = (i * 37) % 100;
        const s = 1 + ((i * 7) % 3);
        const d = 2 + ((i * 11) % 6);
        return (
          <span
            key={i}
            className="absolute rounded-full scene-twinkle"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: s,
              height: s,
              background: color,
              animationDelay: `-${(i % 5)}s`,
              animationDuration: `${d}s`,
              opacity: 0.7,
            }}
          />
        );
      })}
    </>
  );
}

// ────────────────────────── scenes ──────────────────────────
function Galaxy({ primary, accent }: { primary: string; accent: string; seed: number }) {
  return (
    <>
      <Dots color="#ffffff" count={80} />
      <Dots color={accent} count={20} />
      {/* Moon */}
      <div
        className="absolute scene-float"
        style={{
          right: "8%",
          top: "10%",
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, #fff, ${accent} 60%, #1e1b4b)`,
          boxShadow: `0 0 40px ${primary}66`,
        }}
      />
      {/* Planet rings */}
      <div
        className="absolute scene-spin"
        style={{
          left: "6%",
          bottom: "18%",
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${primary}, #581c87)`,
          boxShadow: `0 0 30px ${primary}55, inset 0 0 30px #00000055`,
        }}
      />
      {/* Shooting stars */}
      <Floaters count={6} emoji="✨" duration={9} size={14} />
    </>
  );
}

function Diamonds({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Dots color="#ffffff" count={40} />
      <Floaters count={10} emoji="💎" duration={10} size={22} />
      <div
        className="absolute inset-0 opacity-40 scene-pulse"
        style={{
          background: `conic-gradient(from 90deg at 50% 60%, ${primary}22, transparent, ${accent}33, transparent)`,
        }}
      />
    </>
  );
}

function Forest({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={14} emoji="🍃" duration={12} size={20} />
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 opacity-60"
        style={{ background: `linear-gradient(to top, ${primary}66, transparent)` }}
      />
      <div className="absolute left-4 bottom-2 text-4xl scene-sway">🌲</div>
      <div className="absolute right-6 bottom-1 text-5xl scene-sway" style={{ animationDelay: "-1.5s" }}>🌳</div>
      <Dots color={accent} count={20} />
    </>
  );
}

function Ocean({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={20} emoji="🫧" duration={11} size={18} />
      <Floaters count={6} emoji="🐠" duration={14} size={22} />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 scene-wave"
        style={{
          background: `linear-gradient(to top, ${primary}55, transparent)`,
        }}
      />
      <Dots color={accent} count={30} />
    </>
  );
}

function Lava({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={18} emoji="🔥" duration={9} size={22} />
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 scene-pulse"
        style={{
          background: `radial-gradient(ellipse at center bottom, ${accent}aa, ${primary}55, transparent)`,
          filter: "blur(8px)",
        }}
      />
      <Dots color={accent} count={40} />
    </>
  );
}

function Candy({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={16} emoji="🍬" duration={11} size={22} />
      <Floaters count={8} emoji="🍭" duration={14} size={26} />
      <div
        className="absolute inset-0 opacity-30 scene-pulse"
        style={{ background: `radial-gradient(circle at 30% 70%, ${primary}55, transparent), radial-gradient(circle at 70% 30%, ${accent}55, transparent)` }}
      />
    </>
  );
}

function Neon({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      {/* Synth grid */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 scene-grid"
        style={{
          background: `linear-gradient(${primary}66 1px, transparent 1px), linear-gradient(90deg, ${primary}44 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />
      {/* Sun */}
      <div
        className="absolute scene-pulse"
        style={{
          left: "50%",
          top: "20%",
          transform: "translateX(-50%)",
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}, ${primary})`,
          boxShadow: `0 0 80px ${primary}aa`,
        }}
      />
      <Dots color={accent} count={30} />
    </>
  );
}

function Ice({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={28} emoji="❄️" duration={13} size={18} />
      <div
        className="absolute inset-0 opacity-30 scene-pulse"
        style={{ background: `linear-gradient(120deg, ${primary}55, transparent 40%, ${accent}55)` }}
      />
      <div className="absolute right-6 top-8 text-4xl scene-float">🌙</div>
      <Dots color="#ffffff" count={40} />
    </>
  );
}

function Dragon({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={14} emoji="🔥" duration={9} size={22} />
      <Floaters count={10} emoji="🪙" duration={12} size={20} />
      <div className="absolute left-6 bottom-4 text-5xl scene-sway">🐉</div>
      <div
        className="absolute inset-x-0 bottom-0 h-1/3 opacity-60"
        style={{ background: `linear-gradient(to top, ${accent}55, transparent)` }}
      />
      <Dots color={primary} count={30} />
    </>
  );
}

function Fish({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={20} emoji="🫧" duration={11} size={18} />
      <Floaters count={6} emoji="🐟" duration={15} size={24} />
      <Floaters count={4} emoji="🐡" duration={13} size={26} />
      <div className="absolute inset-x-0 bottom-0 h-1/2 scene-wave"
        style={{ background: `linear-gradient(to top, ${primary}55, transparent)` }} />
      <Dots color={accent} count={20} />
    </>
  );
}

function Wood({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={10} emoji="🍂" duration={12} size={22} />
      <div className="absolute left-4 bottom-2 text-5xl scene-sway">🌲</div>
      <div className="absolute right-6 bottom-3 text-4xl scene-sway" style={{ animationDelay: "-2s" }}>🪵</div>
      <Dots color={accent} count={20} />
      <div className="absolute inset-x-0 bottom-0 h-1/3 opacity-50"
        style={{ background: `linear-gradient(to top, ${primary}55, transparent)` }} />
    </>
  );
}

function CryptoScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={16} emoji="🪙" duration={11} size={22} />
      <Floaters count={6} emoji="⚡" duration={9} size={20} />
      <Dots color={accent} count={40} />
      <div className="absolute inset-0 opacity-30 scene-pulse"
        style={{ background: `radial-gradient(circle at 50% 50%, ${primary}55, transparent 60%)` }} />
    </>
  );
}

function Gold({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Floaters count={14} emoji="🪙" duration={11} size={22} />
      <Floaters count={6} emoji="✨" duration={8} size={18} />
      <Dots color={accent} count={30} />
      <div className="absolute inset-0 opacity-30 scene-pulse"
        style={{ background: `radial-gradient(circle at 50% 70%, ${primary}55, transparent)` }} />
    </>
  );
}

function SceneStyles() {
  return (
    <style>{`
      @keyframes scene-fall {
        0%   { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
        10%  { opacity: 1; }
        100% { transform: translateY(120vh) rotate(360deg); opacity: 0; }
      }
      @keyframes scene-twinkle {
        0%, 100% { opacity: .2; transform: scale(.6); }
        50%      { opacity: 1; transform: scale(1.2); }
      }
      @keyframes scene-float {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-12px); }
      }
      @keyframes scene-spin {
        from { transform: rotate(0); }
        to   { transform: rotate(360deg); }
      }
      @keyframes scene-pulse {
        0%, 100% { opacity: .35; }
        50%      { opacity: .8; }
      }
      @keyframes scene-sway {
        0%, 100% { transform: rotate(-3deg); }
        50%      { transform: rotate(3deg); }
      }
      @keyframes scene-wave {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-6px); }
      }
      @keyframes scene-grid {
        from { background-position: 0 0, 0 0; }
        to   { background-position: 0 32px, 32px 0; }
      }
      .scene-fall    { animation: scene-fall linear infinite; will-change: transform; }
      .scene-twinkle { animation: scene-twinkle ease-in-out infinite; }
      .scene-float   { animation: scene-float 4s ease-in-out infinite; }
      .scene-spin    { animation: scene-spin 40s linear infinite; }
      .scene-pulse   { animation: scene-pulse 4s ease-in-out infinite; }
      .scene-sway    { animation: scene-sway 3s ease-in-out infinite; transform-origin: bottom center; }
      .scene-wave    { animation: scene-wave 3s ease-in-out infinite; }
      .scene-grid    { animation: scene-grid 6s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .scene-fall, .scene-twinkle, .scene-float, .scene-spin, .scene-pulse, .scene-sway, .scene-wave, .scene-grid {
          animation: none !important;
        }
      }
    `}</style>
  );
}
