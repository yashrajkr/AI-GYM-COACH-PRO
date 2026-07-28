"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Classes for the inner lift wrapper that actually contains `children`. */
  contentClassName?: string;
  /** Max tilt in degrees (default 8) */
  maxTilt?: number;
  /** Glow color on hover */
  glow?: "lime" | "cyan" | "magenta" | "amber" | "none";
  /** Disable tilt (still gets hover glow) */
  disabled?: boolean;
}

/**
 * 3D tilt card with mouse-driven rotation + spring physics.
 * Used for premium interactive surfaces across the app.
 */
export function TiltCard({
  children,
  className,
  contentClassName,
  maxTilt = 8,
  glow = "lime",
  disabled = false,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  const glowClass =
    glow === "lime" ? "hover:glow-lime" :
    glow === "cyan" ? "hover:glow-cyan" :
    glow === "magenta" ? "hover:glow-magenta" :
    glow === "amber" ? "hover:glow-amber" : "";

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX: disabled ? 0 : rotateX, rotateY: disabled ? 0 : rotateY, transformStyle: "preserve-3d" }}
      className={cn(
        "glass glass-hover rounded-2xl transition-shadow duration-300",
        glowClass,
        className
      )}
    >
      {/* Children live inside this lift wrapper, so layout classes put on the
          card itself (e.g. `flex flex-col`) never reach them. `contentClassName`
          is the way to style this element — without it a card could not, for
          example, push a footer button to its bottom edge. */}
      <div
        className={contentClassName}
        style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}
      >
        {children}
      </div>
    </motion.div>
  );
}
