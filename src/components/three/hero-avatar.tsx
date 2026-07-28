"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * 3D Hero Avatar — stylized low-poly human figure doing a squat loop.
 * Built from primitive geometry (no external GLB dependency).
 * Auto-rotating, ~8 second squat cycle, soft rim lighting in lime.
 *
 * Performance:
 *   - DPR capped at [1, 1.75] to avoid mobile GPU burn.
 *   - Materials created once via useMemo + disposed on unmount.
 *   - useFrame early-returns when the document is hidden.
 */

interface HeroAvatarProps {
  className?: string;
}

function HumanFigure() {
  const groupRef = useRef<THREE.Group>(null);
  const hipsRef = useRef<THREE.Group>(null);
  const kneesRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const armsRef = useRef<THREE.Group>(null);

  // Materials — created once, disposed on unmount to free GPU memory.
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a1f2a",
        metalness: 0.5,
        roughness: 0.4,
        emissive: "#0a0b0d",
      }),
    []
  );
  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#a3e635",
        metalness: 0.7,
        roughness: 0.3,
        emissive: "#a3e635",
        emissiveIntensity: 0.4,
      }),
    []
  );

  // Dispose materials on unmount — critical for SPA navigation.
  useEffect(() => {
    return () => {
      bodyMat.dispose();
      accentMat.dispose();
    };
  }, [bodyMat, accentMat]);

  useFrame((state) => {
    // Skip rendering when the tab is hidden (saves battery + GPU).
    if (typeof document !== "undefined" && document.hidden) return;
    const t = state.clock.elapsedTime;

    // Squat cycle: 8 second loop
    const cycle = (Math.sin(t * 0.8) + 1) / 2; // 0 to 1
    const squatDepth = cycle * 0.45;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.25;
    }

    // Hips drop during squat
    if (hipsRef.current) {
      hipsRef.current.position.y = -squatDepth;
    }

    // Knees bend during squat
    if (kneesRef.current) {
      kneesRef.current.rotation.x = squatDepth * 1.2;
    }

    // Torso leans forward slightly at bottom of squat
    if (torsoRef.current) {
      torsoRef.current.rotation.x = squatDepth * 0.3;
    }

    // Arms extend forward during squat (counterbalance)
    if (armsRef.current) {
      armsRef.current.rotation.x = -squatDepth * 0.8 - 0.2;
    }
  });

  // Framing budget (all in world units, scale 0.85 applied):
  //   geometry spans local y ∈ [-0.92, 2.06]  →  [-1.13, 1.40] at this offset
  //   squat drops the whole hips group 0.45   →  bottom reaches -1.51
  //   Float bobs ±0.4                         →  extremes [-1.91, 1.80]
  // The camera (z=5.6, fov 45) sees ±2.32, leaving ~0.4 of margin top and
  // bottom. The old -1.5 offset put the feet at -2.28 against a -1.57 floor,
  // which cropped the legs off — most visibly in the wide, short viewport on
  // the landing demo. Keep this offset and the camera in sync.
  return (
    <group ref={groupRef} position={[0, -0.35, 0]} scale={0.85}>
      {/* Hips group (whole body moves down) */}
      <group ref={hipsRef}>
        {/* Pelvis */}
        <mesh position={[0, 0.8, 0]} material={accentMat}>
          <boxGeometry args={[0.55, 0.25, 0.35]} />
        </mesh>

        {/* Torso (leans forward on squat) */}
        <group ref={torsoRef} position={[0, 0.8, 0]}>
          {/* Chest */}
          <mesh position={[0, 0.5, 0]} material={bodyMat}>
            <boxGeometry args={[0.6, 0.7, 0.32]} />
          </mesh>
          {/* Chest accent stripe */}
          <mesh position={[0, 0.5, 0.17]} material={accentMat}>
            <boxGeometry args={[0.4, 0.5, 0.02]} />
          </mesh>

          {/* Head */}
          <mesh position={[0, 1.1, 0]} material={bodyMat}>
            <boxGeometry args={[0.3, 0.32, 0.3]} />
          </mesh>
          {/* Head visor accent */}
          <mesh position={[0, 1.12, 0.16]} material={accentMat}>
            <boxGeometry args={[0.22, 0.08, 0.02]} />
          </mesh>

          {/* Arms (extend forward during squat) */}
          <group ref={armsRef} position={[0, 0.75, 0]}>
            {/* Left arm */}
            <mesh position={[-0.45, 0, 0]} material={bodyMat}>
              <boxGeometry args={[0.15, 0.6, 0.15]} />
            </mesh>
            <mesh position={[-0.45, -0.35, 0]} material={accentMat}>
              <boxGeometry args={[0.12, 0.12, 0.12]} />
            </mesh>
            {/* Right arm */}
            <mesh position={[0.45, 0, 0]} material={bodyMat}>
              <boxGeometry args={[0.15, 0.6, 0.15]} />
            </mesh>
            <mesh position={[0.45, -0.35, 0]} material={accentMat}>
              <boxGeometry args={[0.12, 0.12, 0.12]} />
            </mesh>
          </group>
        </group>

        {/* Legs (knees bend during squat) */}
        <group position={[0, 0.55, 0]}>
          {/* Left thigh */}
          <mesh position={[-0.18, -0.35, 0]} material={bodyMat}>
            <boxGeometry args={[0.18, 0.7, 0.2]} />
          </mesh>
          {/* Right thigh */}
          <mesh position={[0.18, -0.35, 0]} material={bodyMat}>
            <boxGeometry args={[0.18, 0.7, 0.2]} />
          </mesh>

          {/* Knees (bend here) */}
          <group ref={kneesRef} position={[0, -0.7, 0]}>
            {/* Left shin */}
            <mesh position={[-0.18, -0.35, 0.1]} material={bodyMat}>
              <boxGeometry args={[0.16, 0.7, 0.18]} />
            </mesh>
            <mesh position={[-0.18, -0.35, 0.1]} material={accentMat}>
              <boxGeometry args={[0.17, 0.05, 0.19]} />
            </mesh>
            {/* Right shin */}
            <mesh position={[0.18, -0.35, 0.1]} material={bodyMat}>
              <boxGeometry args={[0.16, 0.7, 0.18]} />
            </mesh>
            <mesh position={[0.18, -0.35, 0.1]} material={accentMat}>
              <boxGeometry args={[0.17, 0.05, 0.19]} />
            </mesh>
            {/* Feet */}
            <mesh position={[-0.18, -0.72, 0.2]} material={accentMat}>
              <boxGeometry args={[0.2, 0.1, 0.35]} />
            </mesh>
            <mesh position={[0.18, -0.72, 0.2]} material={accentMat}>
              <boxGeometry args={[0.2, 0.1, 0.35]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      {/* Key light — lime (no shadow for perf on a decorative element) */}
      <spotLight
        position={[3, 5, 3]}
        angle={0.4}
        penumbra={0.8}
        intensity={2.5}
        color="#a3e635"
      />
      {/* Fill light — cyan */}
      <spotLight
        position={[-3, 3, -2]}
        angle={0.5}
        penumbra={1}
        intensity={1.2}
        color="#22d3ee"
      />
      {/* Rim light from behind */}
      <pointLight position={[0, 2, -4]} intensity={1.5} color="#f472b6" />
    </>
  );
}

export function HeroAvatar({ className }: HeroAvatarProps) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        // Aimed at the origin, where HumanFigure is now centred. fov 45 at
        // z=5.6 gives ±2.32 of vertical room, which clears the figure's full
        // range of motion (see the framing budget in HumanFigure) with margin
        // to spare. fov is vertical, so wide containers only ever add
        // horizontal slack — no aspect ratio can crop it.
        camera={{ position: [0, 0, 5.6], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        // Cap DPR at 1.75 — 2x burns mobile GPU for a barely-visible difference.
        dpr={[1, 1.75]}
        // ContactShadows alone is enough; disabling renderer shadows saves perf.
        shadows={false}
      >
        <Lights />
        <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.4}>
          <HumanFigure />
        </Float>
        <ContactShadows
          // Just under the feet at the deepest point of the squat (y=-1.51).
          position={[0, -1.55, 0]}
          opacity={0.4}
          scale={5}
          blur={2.5}
          far={3}
          color="#a3e635"
        />
      </Canvas>
    </div>
  );
}
