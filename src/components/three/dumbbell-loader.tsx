"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Dumbbell() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current || document.hidden) return;
    groupRef.current.rotation.y += delta * 1.2;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.15;
  });

  const barMat = new THREE.MeshStandardMaterial({
    color: "#a3e635",
    metalness: 0.8,
    roughness: 0.3,
    emissive: "#a3e635",
    emissiveIntensity: 0.3,
  });
  const weightMat = new THREE.MeshStandardMaterial({
    color: "#1a1f2a",
    metalness: 0.6,
    roughness: 0.4,
  });

  return (
    <group ref={groupRef}>
      {/* Bar */}
      <mesh material={barMat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 2.4, 16]} />
      </mesh>
      {/* Left weights */}
      <mesh position={[-1, 0, 0]} material={weightMat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.45, 0.45, 0.4, 24]} />
      </mesh>
      <mesh position={[-1.25, 0, 0]} material={weightMat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.45, 0.45, 0.4, 24]} />
      </mesh>
      {/* Right weights */}
      <mesh position={[1, 0, 0]} material={weightMat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.45, 0.45, 0.4, 24]} />
      </mesh>
      <mesh position={[1.25, 0, 0]} material={weightMat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.45, 0.45, 0.4, 24]} />
      </mesh>
    </group>
  );
}

interface DumbbellLoaderProps {
  className?: string;
  size?: number;
}

export function DumbbellLoader({ className, size = 200 }: DumbbellLoaderProps) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 1, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.4} />
        <spotLight position={[3, 5, 3]} angle={0.5} penumbra={1} intensity={2} color="#a3e635" />
        <spotLight position={[-3, 2, -2]} angle={0.5} penumbra={1} intensity={1} color="#22d3ee" />
        <Dumbbell />
      </Canvas>
    </div>
  );
}
