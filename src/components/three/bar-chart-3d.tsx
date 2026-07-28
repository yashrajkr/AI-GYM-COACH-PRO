"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";
// Disables troika's web worker — see the file for why Turbopack needs this.
import "./troika-text-config";

/**
 * 3D Bar Chart — volume by exercise.
 * Each bar is a 3D box with emissive glow, animated height on mount.
 */

interface BarData {
  label: string;
  value: number;
  color: string;
}

interface Bar3DProps {
  data: BarData;
  position: [number, number, number];
  maxValue: number;
  index: number;
}

function Bar3D({ data, position, maxValue, index }: Bar3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetHeight = maxValue > 0 ? (data.value / maxValue) * 3 : 0;
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!meshRef.current) return;
    const current = meshRef.current.scale.y;
    const next = current + (targetHeight - current) * 0.08;
    meshRef.current.scale.y = next;
    meshRef.current.position.y = (next * 0.5) - 0;
  });

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: hovered ? 0.6 : 0.3,
        metalness: 0.6,
        roughness: 0.3,
      }),
    [data.color, hovered]
  );

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        material={material}
        scale={[0.6, 0.01, 0.6]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        castShadow
      >
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      {/* Label */}
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.22}
        color="#a1a1aa"
        anchorX="center"
        anchorY="top"
        rotation={[-Math.PI / 4, 0, 0]}
      >
        {data.label}
      </Text>
      {/* Value on hover */}
      {hovered && (
        <Html position={[0, targetHeight + 0.4, 0]} center distanceFactor={8}>
          <div className="glass-strong rounded-md px-2 py-1 text-xs font-mono whitespace-nowrap">
            <span style={{ color: data.color }}>{data.value}</span> reps
          </div>
        </Html>
      )}
    </group>
  );
}

// (useState already imported at top)

function BarsScene({ data }: { data: BarData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const spacing = 1.4;
  const totalWidth = (data.length - 1) * spacing;
  const startX = -totalWidth / 2;

  return (
    <>
      <ambientLight intensity={0.3} />
      <spotLight position={[5, 8, 5]} angle={0.5} penumbra={1} intensity={2} color="#a3e635" castShadow />
      <spotLight position={[-5, 5, -3]} angle={0.5} penumbra={1} intensity={1} color="#22d3ee" />
      <pointLight position={[0, -2, 4]} intensity={0.5} color="#f472b6" />

      {data.map((d, i) => (
        <Bar3D
          key={i}
          data={d}
          position={[startX + i * spacing, -1.5, 0]}
          maxValue={maxValue}
          index={i}
        />
      ))}

      {/* Floor grid */}
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#0c0e12" metalness={0.3} roughness={0.8} />
      </mesh>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

interface Bar3DChartProps {
  data: BarData[];
  className?: string;
}

export function Bar3DChart({ data, className }: Bar3DChartProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        shadows
      >
        <BarsScene data={data} />
      </Canvas>
    </div>
  );
}
