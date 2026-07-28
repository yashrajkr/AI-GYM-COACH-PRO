"use client";

import { useEffect, useRef } from "react";
import type { SessionHistoryEntry } from "@/lib/stores/workout";

/**
 * Generates a shareable workout summary card as a canvas image.
 * The card shows: exercise name, reps, sets, form score, duration, date, brand mark.
 *
 * The canvas is 1080x1080 (Instagram-square compatible).
 */

interface ShareCardProps {
  workout: SessionHistoryEntry;
  userName?: string;
}

export function ShareCard({ workout, userName }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#050608");
    grad.addColorStop(1, "#0c0e12");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 56) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Top accent bar
    ctx.fillStyle = "#a3e635";
    ctx.fillRect(60, 60, 120, 4);

    // Brand mark
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = "#a1a1aa";
    ctx.textAlign = "left";
    ctx.fillText("AI GYM COACH PRO", 200, 80);

    // Exercise name (big)
    ctx.font = "bold 72px sans-serif";
    ctx.fillStyle = "#f4f4f5";
    ctx.fillText(workout.exerciseName, 60, 200);

    // Date
    ctx.font = "24px monospace";
    ctx.fillStyle = "#a1a1aa";
    const date = new Date(workout.date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
    ctx.fillText(date.toUpperCase(), 60, 240);

    // Big stats row
    const statsY = 360;
    const stats = [
      { label: "REPS", value: String(workout.totalReps), color: "#a3e635" },
      { label: "SETS", value: String(workout.setsCompleted), color: "#22d3ee" },
      { label: "FORM", value: `${workout.avgFormScore}`, color: workout.avgFormScore >= 85 ? "#a3e635" : "#fcd34d" },
      { label: "TIME", value: `${Math.round(workout.durationSec / 60)}m`, color: "#f472b6" },
    ];

    const statW = (W - 120) / stats.length;
    stats.forEach((stat, i) => {
      const x = 60 + i * statW;

      // Label
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(stat.label, x, statsY);

      // Value (big)
      ctx.font = "bold 72px monospace";
      ctx.fillStyle = stat.color;
      ctx.fillText(stat.value, x, statsY + 80);
    });

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 520);
    ctx.lineTo(W - 60, 520);
    ctx.stroke();

    // Best form score highlight
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#a1a1aa";
    ctx.fillText("BEST FORM SCORE", 60, 580);

    ctx.font = "bold 120px monospace";
    ctx.fillStyle = "#a3e635";
    ctx.fillText(`${workout.bestFormScore}`, 60, 700);

    ctx.font = "bold 36px monospace";
    ctx.fillStyle = "rgba(163,230,53,0.4)";
    ctx.fillText("/ 100", 60 + ctx.measureText(`${workout.bestFormScore}`).width + 10, 700);

    // Form score bar
    const barY = 740;
    const barW = W - 120;
    const barH = 12;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(60, barY, barW, barH);
    ctx.fillStyle = "#a3e635";
    ctx.fillRect(60, barY, barW * (workout.bestFormScore / 100), barH);

    // User name
    if (userName) {
      ctx.font = "bold 28px sans-serif";
      ctx.fillStyle = "#f4f4f5";
      ctx.fillText(`@${userName}`, 60, 820);
    }

    // Bottom brand
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#a1a1aa";
    ctx.textAlign = "right";
    ctx.fillText("YOUR VIDEO NEVER LEAVES YOUR DEVICE", W - 60, H - 60);

    // Glow accents (circles)
    ctx.fillStyle = "rgba(163,230,53,0.08)";
    ctx.beginPath();
    ctx.arc(W - 100, 200, 200, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(34,211,238,0.06)";
    ctx.beginPath();
    ctx.arc(100, H - 300, 150, 0, Math.PI * 2);
    ctx.fill();
  }, [workout, userName]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `workout-${workout.exerciseName}-${new Date(workout.date).toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className="w-full max-w-md mx-auto rounded-2xl border border-border"
      />
      <div className="flex gap-2 justify-center">
        <button
          onClick={handleDownload}
          className="glass glass-hover rounded-lg px-4 py-2 text-xs font-medium text-lime hover:text-lime flex items-center gap-2"
        >
          <Download className="h-4 w-4" /> Download PNG
        </button>
      </div>
    </div>
  );
}

import { Download } from "lucide-react";
