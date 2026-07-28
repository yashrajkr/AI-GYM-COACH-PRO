"use client";

import { motion } from "framer-motion";
import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

interface GlowButtonProps
  extends Omit<React.ComponentProps<"button">, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration">,
    VariantProps<typeof buttonVariants> {
  glow?: "lime" | "cyan" | "magenta" | "amber";
  glowStrong?: boolean;
  children?: ReactNode;
  asChild?: boolean;
}

/**
 * Button with neon glow + spring press animation.
 *
 * Uses motion.button directly (no wrapper div) so clicks never get
 * intercepted and the disabled state propagates correctly.
 *
 * The React drag handlers are omitted from the props type because
 * framer-motion's motion.button has incompatible signatures for them
 * (motion uses PanInfo, React uses DragEvent). If you need drag, use
 * <motion.button> directly instead of GlowButton.
 */
export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ glow = "lime", glowStrong = false, className, children, disabled, ...props }, ref) => {
    const glowClass =
      glow === "lime" ? (glowStrong ? "glow-lime-strong" : "glow-lime") :
      glow === "cyan" ? "glow-cyan" :
      glow === "magenta" ? "glow-magenta" :
      glow === "amber" ? "glow-amber" : "";

    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: props.variant, size: props.size }),
          glowClass,
          "transition-shadow duration-300",
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
GlowButton.displayName = "GlowButton";
