"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, AlertTriangle, Lightbulb, Clock, Wind,
  Shield, Target, ChevronDown, ChevronUp, Dumbbell, Heart,
} from "lucide-react";
import { TiltCard } from "@/components/ui-pro";
import { Badge } from "@/components/ui/badge";
import { getExerciseGuide, type ExerciseGuide } from "@/lib/data/exercise-guides";
import { ExerciseFormDemo } from "./exercise-form-demo";

interface ExerciseGuideViewProps {
  exerciseId: string;
  onStart?: () => void;
  /**
   * Set false where the caller already shows the movement. The live-coach
   * screen has its own demo next to the camera, and rendering a second one
   * further down the page just pushed the written guide off-screen.
   */
  showFormDemo?: boolean;
}

export function ExerciseGuideView({
  exerciseId,
  onStart,
  showFormDemo = true,
}: ExerciseGuideViewProps) {
  const guide = getExerciseGuide(exerciseId);
  const [expandedSection, setExpandedSection] = useState<string | null>("setup");

  if (!guide) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Guide not available for this exercise.
      </div>
    );
  }

  const sections = [
    { id: "setup", label: "Setup", icon: Target, items: guide.setup },
    { id: "execution", label: "Execution", icon: Dumbbell, items: guide.execution },
  ];

  return (
    <div className="space-y-4">
      {/* Movement demo. A written guide tells you what to do; this shows it.
          Same tracked figure as the live coach, so the reference the user
          studies here is the one they are scored against. */}
      {showFormDemo && (
        <ExerciseFormDemo
          exerciseId={exerciseId}
          caption="Looping reference form"
        />
      )}

      {/* Header */}
      <TiltCard maxTilt={2} glow="lime" className="p-5">
        <div className="flex items-start gap-4">
          <div className="text-4xl shrink-0">{guide.icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold tracking-tight">{guide.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] h-5 border-lime/40 text-lime">
                {guide.difficulty}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5">
                <Clock className="mr-1 h-2.5 w-2.5" /> {guide.setupTime}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5">
                {guide.equipment}
              </Badge>
            </div>
          </div>
        </div>

        {/* Target Muscles */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-lime" />
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Target Muscles</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {guide.targetMuscles.map((m) => (
              <Badge key={m} className="bg-lime/15 text-lime border-lime/30 text-[10px]">
                {m}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 mb-2">
            <Heart className="h-3.5 w-3.5 text-cyan" />
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Synergist Muscles</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {guide.synergistMuscles.map((m) => (
              <Badge key={m} variant="outline" className="text-[10px] h-5 text-muted-foreground">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      </TiltCard>

      {/* Step-by-step sections */}
      {sections.map((section) => {
        const isExpanded = expandedSection === section.id;
        const Icon = section.icon;
        return (
          <TiltCard key={section.id} maxTilt={1} glow={isExpanded ? "lime" : "none"} className="overflow-hidden">
            <button
              onClick={() => setExpandedSection(isExpanded ? null : section.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-lime" />
                <span className="text-sm font-semibold">{section.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({section.items.length} steps)
                </span>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    {section.items.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-6 h-6 rounded-full bg-lime/20 border border-lime/40 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-mono font-bold text-lime">{i + 1}</span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed pt-0.5">{step}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TiltCard>
        );
      })}

      {/* Common Mistakes */}
      <TiltCard maxTilt={1} glow="amber" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber" />
          <h4 className="text-sm font-semibold">Common Mistakes & Fixes</h4>
        </div>
        <div className="space-y-3">
          {guide.commonMistakes.map((item, i) => (
            <div key={i} className="glass rounded-lg p-3">
              <div className="flex items-start gap-2 mb-1">
                <span className="text-amber text-xs mt-0.5">✗</span>
                <p className="text-xs text-foreground">{item.mistake}</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-lime shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">{item.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </TiltCard>

      {/* Pro Tips */}
      <TiltCard maxTilt={1} glow="cyan" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-cyan" />
          <h4 className="text-sm font-semibold">Pro Tips</h4>
        </div>
        <ul className="space-y-2">
          {guide.proTips.map((tip, i) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-cyan font-mono mt-0.5">→</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </TiltCard>

      {/* Tempo + Breathing */}
      <div className="grid grid-cols-2 gap-3">
        <TiltCard maxTilt={1} glow="none" className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-lime" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Tempo</span>
          </div>
          <p className="text-xs text-foreground font-mono">{guide.tempo}</p>
        </TiltCard>
        <TiltCard maxTilt={1} glow="none" className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wind className="h-3.5 w-3.5 text-cyan" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Breathing</span>
          </div>
          <p className="text-xs text-foreground">{guide.breathing}</p>
        </TiltCard>
      </div>

      {/* Safety Notes */}
      <TiltCard maxTilt={1} glow="magenta" className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-3.5 w-3.5 text-magenta" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Safety Notes</span>
        </div>
        <ul className="space-y-1.5">
          {guide.safetyNotes.map((note, i) => (
            <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <span className="text-magenta mt-0.5">⚠</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </TiltCard>

      {/* Start button */}
      {onStart && (
        <button
          onClick={onStart}
          className="w-full bg-lime text-background hover:bg-lime/90 glow-lime rounded-xl py-3 text-sm font-bold transition-all"
        >
          I'm Ready — Start Exercise →
        </button>
      )}
    </div>
  );
}
