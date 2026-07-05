import { Suspense, lazy, useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, MeshDistortMaterial, Sparkles, Icosahedron, Trail } from "@react-three/drei";
import * as THREE from "three";
import { ThemeScene } from "./ThemeScene";

/**
 * Full-screen 3D backdrop that renders behind every mini-app page.
 * Falls back to the lightweight CSS `ThemeScene` when WebGL isn't available
 * or the user prefers reduced motion.
 */
export function Theme3D({ scene, primary, accent, background }: { scene: string; primary: string; accent: string; background: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    // WebGL support probe
    try {
      const c = document.createElement("canvas");
      const ok = !!(c.getContext("webgl2") || c.getContext("webgl"));
      setEnabled(ok);
    } catch { /* leave disabled */ }
  }, []);

  if (!enabled) {
    return <ThemeScene kind={scene as any} primary={primary} accent={accent} />;
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background }}
      aria-hidden
    >
      <Suspense fallback={<ThemeScene kind={scene as any} primary={primary} accent={accent} />}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 6], fov: 55 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[5, 5, 5]} intensity={1.5} color={primary} />
          <pointLight position={[-5, -3, 2]} intensity={0.8} color={accent} />
          <SceneRouter scene={scene} primary={primary} accent={accent} />
        </Canvas>
      </Suspense>
    </div>
  );
}

function SceneRouter({ scene, primary, accent }: { scene: string; primary: string; accent: string }) {
  switch (scene) {
    case "galaxy": return <GalaxyScene primary={primary} accent={accent} />;
    case "diamond": return <DiamondScene primary={primary} accent={accent} />;
    case "lava": return <LavaScene primary={primary} accent={accent} />;
    case "dragon": return <LavaScene primary={primary} accent={accent} />;
    case "ghost": return <GhostScene primary={primary} accent={accent} />;
    case "milk": return <MilkScene primary={primary} accent={accent} />;
    case "gold": return <GoldScene primary={primary} accent={accent} />;
    case "crypto": return <CryptoScene primary={primary} accent={accent} />;
    case "ocean": return <OceanScene primary={primary} accent={accent} />;
    case "ice": return <IceScene primary={primary} accent={accent} />;
    case "neon": return <NeonScene primary={primary} accent={accent} />;
    case "candy": return <CandyScene primary={primary} accent={accent} />;
    case "forest": return <ForestScene primary={primary} accent={accent} />;
    case "fish": return <OceanScene primary={primary} accent={accent} />;
    case "wood": return <ForestScene primary={primary} accent={accent} />;
    default: return <GalaxyScene primary={primary} accent={accent} />;
  }
}

/* ─────────── Scene implementations ─────────── */

function GalaxyScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Stars radius={80} depth={40} count={3000} factor={4} saturation={1} fade speed={0.8} />
      <Sparkles count={80} scale={12} size={4} speed={0.3} color={accent} />
      <Float speed={1.2} rotationIntensity={1} floatIntensity={1.5}>
        <mesh position={[2.2, 0.5, -1]}>
          <sphereGeometry args={[1.2, 64, 64]} />
          <MeshDistortMaterial color={primary} distort={0.35} speed={2} roughness={0.2} metalness={0.6} />
        </mesh>
      </Float>
      <Float speed={0.8} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[-2.5, -1, -2]}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
        </mesh>
      </Float>
    </>
  );
}

function DiamondScene({ primary, accent }: { primary: string; accent: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) { ref.current.rotation.y += dt * 0.5; ref.current.rotation.x += dt * 0.2; } });
  return (
    <>
      <Sparkles count={120} scale={10} size={5} speed={0.4} color={accent} />
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.8}>
        <mesh ref={ref} position={[0, 0.3, -1]}>
          <octahedronGeometry args={[1.6, 0]} />
          <meshPhysicalMaterial color={primary} metalness={0.9} roughness={0.05} clearcoat={1} clearcoatRoughness={0} transmission={0.4} thickness={0.5} ior={2.4} />
        </mesh>
      </Float>
      {Array.from({ length: 8 }).map((_, i) => (
        <Float key={i} speed={1 + i * 0.1} floatIntensity={1.2}>
          <mesh position={[Math.cos(i) * 3.5, Math.sin(i * 2) * 2, -2 - i * 0.3]}>
            <octahedronGeometry args={[0.25, 0]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function LavaScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Sparkles count={200} scale={12} size={3} speed={0.6} color={accent} noise={2} />
      <Float speed={0.8} rotationIntensity={1.5} floatIntensity={0.5}>
        <mesh position={[0, -0.3, -1]}>
          <icosahedronGeometry args={[1.8, 3]} />
          <MeshDistortMaterial color={primary} distort={0.6} speed={3} roughness={0.9} emissive={primary} emissiveIntensity={0.5} />
        </mesh>
      </Float>
      {Array.from({ length: 15 }).map((_, i) => (
        <Float key={i} speed={2 + i * 0.1} floatIntensity={3}>
          <mesh position={[(Math.random() - 0.5) * 8, -3 + Math.random() * 5, -1 - Math.random() * 3]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function GhostScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Sparkles count={80} scale={10} size={6} speed={0.3} color={accent} />
      {Array.from({ length: 5 }).map((_, i) => (
        <Float key={i} speed={1 + i * 0.2} rotationIntensity={0.3} floatIntensity={2}>
          <mesh position={[(i - 2) * 1.8, Math.sin(i) * 1.2, -1 - i * 0.5]}>
            <sphereGeometry args={[0.6, 32, 32]} />
            <meshPhysicalMaterial color={primary} transmission={0.7} thickness={0.3} roughness={0.2} emissive={accent} emissiveIntensity={0.3} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function MilkScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Sparkles count={60} scale={10} size={4} speed={0.2} color={accent} />
      {Array.from({ length: 6 }).map((_, i) => (
        <Float key={i} speed={0.6 + i * 0.15} rotationIntensity={0.4} floatIntensity={1.5}>
          <group position={[(i % 3 - 1) * 2.5, i < 3 ? 1.2 : -1.2, -1 - i * 0.2]}>
            <mesh>
              <cylinderGeometry args={[0.5, 0.55, 1.2, 24]} />
              <meshPhysicalMaterial color={"#fff8e7"} roughness={0.1} transmission={0.3} thickness={0.5} clearcoat={1} />
            </mesh>
            <mesh position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.3, 0.35, 0.3, 16]} />
              <meshStandardMaterial color={primary} />
            </mesh>
          </group>
        </Float>
      ))}
    </>
  );
}

function GoldScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Sparkles count={150} scale={10} size={5} speed={0.4} color={primary} />
      <Float speed={1} rotationIntensity={1} floatIntensity={1}>
        <mesh position={[0, 0, -1]}>
          <torusKnotGeometry args={[1.2, 0.35, 128, 24]} />
          <meshStandardMaterial color={primary} metalness={1} roughness={0.15} emissive={accent} emissiveIntensity={0.15} />
        </mesh>
      </Float>
    </>
  );
}

function CryptoScene({ primary, accent }: { primary: string; accent: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.8; });
  return (
    <>
      <Sparkles count={100} scale={10} size={4} speed={0.4} color={accent} />
      <Float speed={1.2} floatIntensity={1}>
        <mesh ref={ref} position={[0, 0, -1]}>
          <cylinderGeometry args={[1.4, 1.4, 0.3, 64]} />
          <meshStandardMaterial color={primary} metalness={0.9} roughness={0.2} emissive={accent} emissiveIntensity={0.3} />
        </mesh>
      </Float>
    </>
  );
}

function OceanScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Sparkles count={120} scale={12} size={3} speed={0.4} color={accent} />
      <Float speed={1} rotationIntensity={0.5} floatIntensity={1.5}>
        <mesh position={[0, 0, -1]}>
          <sphereGeometry args={[1.5, 64, 64]} />
          <MeshDistortMaterial color={primary} distort={0.4} speed={2} roughness={0.1} metalness={0.4} transmission={0.5} thickness={1} />
        </mesh>
      </Float>
    </>
  );
}

function IceScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Sparkles count={200} scale={14} size={4} speed={0.3} color={"#ffffff"} />
      <Float speed={0.8} rotationIntensity={0.4} floatIntensity={0.8}>
        <Icosahedron args={[1.5, 1]} position={[0, 0, -1]}>
          <meshPhysicalMaterial color={primary} roughness={0.1} transmission={0.6} thickness={0.5} clearcoat={1} />
        </Icosahedron>
      </Float>
    </>
  );
}

function NeonScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Sparkles count={200} scale={12} size={2} speed={0.8} color={primary} />
      <Sparkles count={100} scale={10} size={3} speed={0.5} color={accent} />
      <gridHelper args={[20, 20, primary, accent]} position={[0, -2.5, 0]} rotation={[0, 0, 0]} />
    </>
  );
}

function CandyScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Sparkles count={100} scale={10} size={5} speed={0.5} color={primary} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Float key={i} speed={1 + i * 0.1} rotationIntensity={1} floatIntensity={2}>
          <mesh position={[(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5, -1 - Math.random() * 2]}>
            <torusGeometry args={[0.4, 0.15, 16, 32]} />
            <meshStandardMaterial color={i % 2 ? primary : accent} roughness={0.3} metalness={0.2} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function ForestScene({ primary, accent }: { primary: string; accent: string }) {
  return (
    <>
      <Sparkles count={80} scale={12} size={4} speed={0.3} color={accent} />
      {Array.from({ length: 12 }).map((_, i) => (
        <Float key={i} speed={0.5 + i * 0.05} rotationIntensity={0.3} floatIntensity={2}>
          <mesh position={[(Math.random() - 0.5) * 8, 3 - i * 0.4, -1 - Math.random() * 3]} rotation={[Math.random(), Math.random(), Math.random()]}>
            <coneGeometry args={[0.15, 0.4, 4]} />
            <meshStandardMaterial color={i % 2 ? primary : accent} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

export default Theme3D;
