"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "./animated-number";

interface LevelRingProps {
  level: number;
  progress: number; // 0-1
  currentXp: number;
  nextLevelXp: number;
  size?: number;
}

/**
 * Animated SVG level ring with conic-gradient-like fill.
 * Shows level number in center, XP progress around.
 */
export function LevelRing({
  level,
  progress,
  currentXp,
  nextLevelXp,
  size = 140,
}: LevelRingProps) {
  const stroke = 8;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <defs>
          <linearGradient id="level-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#level-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          filter="url(#glow)"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Level</div>
        <div className="font-mono text-3xl font-bold text-gradient-lime">
          <AnimatedNumber value={level} duration={800} />
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
          {currentXp} / {nextLevelXp}
        </div>
      </div>
    </div>
  );
}
