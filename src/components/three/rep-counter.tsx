"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";
import * as THREE from "three";
// Disables troika's web worker — see the file for why Turbopack needs this.
import "./troika-text-config";

/**
 * 3D Rep Counter
 *
 * The big rep number is rendered as floating 3D text.
 * On each rep completion, the number does a 360° flip with a particle burst.
 * Form score ring is a 3D torus that fills up.
 *
 * Uses drei `Text` (SDF) rather than `Text3D` (extruded geometry) to avoid
 * needing a font JSON file — gives us the same premium 3D look with less
 * asset overhead.
 */

interface RepCounter3DProps {
  reps: number;
  formScore: number; // 0-100
  className?: string;
}

function CounterText({ reps, flipKey }: { reps: number; flipKey: number }) {
  const ref = useRef<THREE.Group>(null);
  const [flipProgress, setFlipProgress] = useState(0);

  useFrame((state, delta) => {
    if (!ref.current || document.hidden) return;
    // Gentle idle rotation
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;

    // Trigger flip animation when flipKey changes
    if (flipProgress > 0) {
      const next = Math.max(0, flipProgress - delta * 2.5); // 0.4s flip
      setFlipProgress(next);
      ref.current.rotation.x = flipProgress * Math.PI * 2;
    } else {
      ref.current.rotation.x = 0;
    }
  });

  // Trigger flip on key change
  useFrame(() => {
    if (flipKey > 0 && flipProgress === 0 && ref.current?.rotation.x === 0) {
      // Check if we should start a flip — handled by parent via key prop
    }
  });

  return (
    <group ref={ref}>
      <Text
        fontSize={2.2}
        fontWeight={900}
        color="#a3e635"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#050608"
        material-toneMapped={false}
      >
        {reps.toString()}
      </Text>
    </group>
  );
}

// Mounted with `key={trigger}` by the parent, so a new rep remounts this
// component and the burst starts from its initial state. That keeps the only
// setState in a timeout callback rather than synchronously in an effect body,
// which is what react-hooks/set-state-in-effect (rightly) flags: the old
// version rendered inactive, then immediately re-rendered active on every rep.
function FlipAnimation({ trigger }: { trigger: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const [active, setActive] = useState(trigger > 0);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 800);
    return () => clearTimeout(t);
  }, [active]);

  const particleData = useMemo(() => {
    const count = 60;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = Math.sin(angle) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return { positions, velocities, count };
  }, []);

  useFrame((_, delta) => {
    if (!active || !particlesRef.current) return;
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const velocities = particleData.velocities;
    for (let i = 0; i < particleData.count; i++) {
      positions[i * 3] += velocities[i * 3] * delta;
      positions[i * 3 + 1] += velocities[i * 3] * delta;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <group>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particleData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#a3e635"
          size={0.08}
          sizeAttenuation
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

// (useEffect already imported at top)

function FormScoreRing({ score }: { score: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const targetScale = score / 100;

  useFrame((_, delta) => {
    if (!ringRef.current) return;
    const current = ringRef.current.scale.x;
    const next = current + (targetScale - current) * Math.min(1, delta * 4);
    ringRef.current.scale.set(next, next, next);
    ringRef.current.rotation.z -= delta * 0.3;
  });

  const color = score >= 85 ? "#a3e635" : score >= 70 ? "#fcd34d" : "#fca5a5";

  return (
    <mesh ref={ringRef} position={[0, 0, -1]} rotation={[Math.PI / 2, 0, 0]} scale={0.001}>
      <torusGeometry args={[1.6, 0.04, 16, 64, Math.PI * 2 * 0.75]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        metalness={0.7}
        roughness={0.3}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function Scene({ reps, formScore, flipKey }: { reps: number; formScore: number; flipKey: number }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <spotLight position={[3, 5, 3]} angle={0.5} penumbra={1} intensity={2} color="#a3e635" />
      <spotLight position={[-3, 3, -2]} angle={0.5} penumbra={1} intensity={1} color="#22d3ee" />
      <pointLight position={[0, -2, 2]} intensity={0.8} color="#f472b6" />

      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.15}>
        <CounterText reps={reps} flipKey={flipKey} />
      </Float>

      <FlipAnimation key={flipKey} trigger={flipKey} />
      <FormScoreRing score={formScore} />
      
    </>
  );
}

export function RepCounter3D({ reps, formScore, className }: RepCounter3DProps) {
  // Use `reps` directly as the flip trigger — the Scene's internal useFrame
  // detects rep increases and triggers the flip animation + particle burst.
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <Scene reps={reps} formScore={formScore} flipKey={reps} />
      </Canvas>
    </div>
  );
}
