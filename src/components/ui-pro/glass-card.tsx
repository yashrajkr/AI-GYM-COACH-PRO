"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  glow?: "lime" | "cyan" | "magenta" | "amber" | "none";
  hover?: boolean;
  strong?: boolean;
}

/**
 * Glassmorphism card with depth + optional glow + scroll reveal.
 * Default surface for the Athletic Premium 3D system.
 */
export function GlassCard({
  glow = "none",
  hover = true,
  strong = false,
  className,
  children,
  ...props
}: GlassCardProps) {
  const glowClass =
    glow === "lime" ? "glow-lime" :
    glow === "cyan" ? "glow-cyan" :
    glow === "magenta" ? "glow-magenta" :
    glow === "amber" ? "glow-amber" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        strong ? "glass-strong" : "glass",
        hover && "glass-hover",
        glowClass,
        "rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
