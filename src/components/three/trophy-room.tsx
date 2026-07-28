"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * 3D Trophy Room — displays earned badges as 3D objects.
 * Camera orbits slowly. Click a badge to zoom in.
 * Locked badges appear as translucent silhouettes.
 */

export interface TrophyBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  tier: "bronze" | "silver" | "gold";
}

interface BadgeObjectProps {
  badge: TrophyBadge;
  position: [number, number, number];
  index: number;
  onSelect: (b: TrophyBadge) => void;
  selected: boolean;
}

function BadgeObject({ badge, position, index, onSelect, selected }: BadgeObjectProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const tierColor = {
    bronze: "#cd7f32",
    silver: "#c0c0c0",
    gold: "#ffd700",
  }[badge.tier];

  const material = useMemo(() => {
    if (!badge.earned) {
      return new THREE.MeshStandardMaterial({
        color: "#1a1f2a",
        transparent: true,
        opacity: 0.25,
        metalness: 0.3,
        roughness: 0.7,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: tierColor,
      metalness: 0.9,
      roughness: 0.2,
      emissive: tierColor,
      emissiveIntensity: hovered || selected ? 0.4 : 0.15,
    });
  }, [badge.earned, tierColor, hovered, selected]);

  useFrame((state) => {
    if (!meshRef.current || document.hidden) return;
    const t = state.clock.elapsedTime;
    // gentle float per badge, offset by index
    meshRef.current.position.y = position[1] + Math.sin(t * 0.8 + index) * 0.08;
    meshRef.current.rotation.y = t * 0.3 + index;
    if (hovered || selected) {
      meshRef.current.scale.lerp(new THREE.Vector3(1.15, 1.15, 1.15), 0.1);
    } else {
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    }
  });

  return (
    <group
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(badge);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {/* Trophy base — hexagonal disc */}
      <mesh material={material} position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.45, 0.5, 0.1, 6]} />
      </mesh>
      {/* Trophy cup */}
      <mesh material={material} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.2, 0.4, 16]} />
      </mesh>
      {/* Trophy rim */}
      <mesh material={material} position={[0, 0.2, 0]}>
        <torusGeometry args={[0.3, 0.04, 8, 24]} />
      </mesh>
      {/* Handles (only for earned) */}
      {badge.earned && (
        <>
          <mesh material={material} position={[-0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.12, 0.025, 8, 16, Math.PI]} />
          </mesh>
          <mesh material={material} position={[0.35, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <torusGeometry args={[0.12, 0.025, 8, 16, Math.PI]} />
          </mesh>
        </>
      )}
      {/* Name label — only while hovered or selected.
          Every badge used to render its label permanently. drei's <Html> is a
          DOM overlay with no depth sorting, so all twelve names (including the
          ones behind the camera) stacked into an unreadable pile in the middle
          of the canvas. Showing one at a time is the fix; `occlude` also hides
          it when the trophy itself is behind another. */}
      {(hovered || selected) && (
        <Html position={[0, 0.75, 0]} center distanceFactor={6} occlude zIndexRange={[10, 0]}>
          <div className="px-2 py-1 rounded-md bg-background/90 border border-border text-[10px] font-mono whitespace-nowrap pointer-events-none">
            <span className={badge.earned ? "text-lime" : "text-muted-foreground"}>
              {badge.icon} {badge.name}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

function TrophyShelf({ badges, onSelect, selected }: {
  badges: TrophyBadge[];
  onSelect: (b: TrophyBadge) => void;
  selected: TrophyBadge | null;
}) {
  // Arrange badges in a circle
  const radius = 2.2;
  return (
    <group>
      {badges.map((badge, i) => {
        const angle = (i / badges.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <BadgeObject
            key={badge.id}
            badge={badge}
            position={[x, 0, z]}
            index={i}
            onSelect={onSelect}
            selected={selected?.id === badge.id}
          />
        );
      })}
    </group>
  );
}

/**
 * The overlay tells users "Drag to rotate · Scroll to zoom". Previously the
 * camera was driven entirely by a scripted orbit and there were no controls at
 * all, so dragging and scrolling did nothing — the instructions were simply
 * wrong. OrbitControls makes them true; autoRotate keeps the idle motion, and
 * stops as soon as a badge is selected so the detail panel is readable.
 */
function Controls({ selected }: { selected: TrophyBadge | null }) {
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      autoRotate={!selected}
      autoRotateSpeed={0.6}
      // Keep the shelf framed: users cannot fly inside a trophy or so far out
      // that the room disappears, and cannot flip under the floor.
      minDistance={3.5}
      maxDistance={9}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 0, 0]}
    />
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <spotLight position={[4, 6, 4]} angle={0.4} penumbra={0.8} intensity={2} color="#a3e635" castShadow />
      <spotLight position={[-4, 4, -2]} angle={0.5} penumbra={1} intensity={1} color="#22d3ee" />
      <pointLight position={[0, -2, 0]} intensity={0.5} color="#f472b6" />
    </>
  );
}

interface TrophyRoomProps {
  badges: TrophyBadge[];
  className?: string;
  onSelect?: (b: TrophyBadge) => void;
}

export function TrophyRoom({ badges, className, onSelect }: TrophyRoomProps) {
  const [selected, setSelected] = useState<TrophyBadge | null>(null);

  const handleSelect = (b: TrophyBadge) => {
    setSelected(b);
    onSelect?.(b);
  };

  return (
    // `relative` so the selected-badge panel below anchors to this box. Without
    // it the panel positioned against whatever ancestor happened to be
    // positioned, landing outside the trophy card.
    <div className={`relative ${className ?? ""}`}>
      <Canvas
        camera={{ position: [5.5, 1.5, 0], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        shadows
      >
        <Lights />
        <Float speed={0.5} rotationIntensity={0.05} floatIntensity={0.1}>
          <TrophyShelf badges={badges} onSelect={handleSelect} selected={selected} />
        </Float>
        <ContactShadows
          position={[0, -1.2, 0]}
          opacity={0.4}
          scale={8}
          blur={2.5}
          far={3}
          color="#a3e635"
        />
        <Controls selected={selected} />
      </Canvas>

      {/* Selected badge detail overlay */}
      {selected && (
        <div className="absolute bottom-3 left-3 right-3 glass-strong rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selected.icon}</span>
            <div>
              <div className="text-sm font-semibold">{selected.name}</div>
              <div className="text-xs text-muted-foreground">{selected.description}</div>
            </div>
          </div>
          <button
            onClick={() => setSelected(null)}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
