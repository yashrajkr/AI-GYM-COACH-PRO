"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Zap, ChevronRight } from "lucide-react";
import { EXERCISE_LIST, ExerciseId } from "@/lib/exercises";

export function ExerciseLibrary({
  onStart,
}: {
  onStart: (exerciseId: ExerciseId) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-1">Exercise Library</h2>
        <p className="text-sm text-muted-foreground">
          {EXERCISE_LIST.length} exercises with AI-powered form tracking. Tap any to start a live session.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXERCISE_LIST.map((ex) => (
          <Card key={ex.id} className="p-5 border-border hover:border-lime/40 transition-all">
            <div className="flex items-start gap-4">
              <div className="text-4xl shrink-0">{ex.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold tracking-tight">{ex.name}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-[10px] h-5">
                    {ex.difficulty}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-5">
                    {ex.equipment}
                  </Badge>
                  {ex.muscleGroups.slice(0, 3).map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px] h-5 text-muted-foreground">
                      {m}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {ex.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    <Zap className="h-3 w-3 text-lime" />
                    <span>AI Tracked</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStart(ex.id)}
                    className="h-7 text-xs hover:bg-lime hover:text-background hover:border-lime"
                  >
                    Start <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
