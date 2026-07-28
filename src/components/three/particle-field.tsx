"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Subtle particle field rendered via Three.js.
 * Pauses when tab is hidden. Low-density, GPU-friendly.
 */

const PARTICLE_COUNT = 400;
const SPREAD = 18;

interface ParticleData {
  positions: Float32Array;
  sizes: Float32Array;
  speeds: Float32Array;
}

function Particles({ color = "#a3e635" }: { color?: string }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  const data: ParticleData = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD * 2;
      sizes[i] = Math.random() * 0.04 + 0.01;
      speeds[i] = Math.random() * 0.3 + 0.1;
    }
    return { positions, sizes, speeds };
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute("size", new THREE.BufferAttribute(data.sizes, 1));
    return g;
  }, [data]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color,
        size: 0.06,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color]
  );

  useFrame((state) => {
    if (!pointsRef.current) return;
    if (document.hidden) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;

    // gentle drift
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime * data.speeds[i] + i) * 0.0008;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} scale={[viewport.width / 12, viewport.height / 12, 1]} />
  );
}

interface ParticleFieldProps {
  color?: string;
  className?: string;
}

export function ParticleField({ color = "#a3e635", className }: ParticleFieldProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className ?? ""}`}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <Particles color={color} />
      </Canvas>
    </div>
  );
}
