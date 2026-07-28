/**
 * Exercise Guide Data — Detailed step-by-step instructions for each exercise.
 * Each exercise includes: setup, execution, common mistakes, pro tips, target muscles.
 */

export interface ExerciseGuide {
  id: string;
  name: string;
  icon: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  targetMuscles: string[];
  synergistMuscles: string[];
  equipment: string;
  setupTime: string;
  
  setup: string[];
  execution: string[];
  commonMistakes: { mistake: string; fix: string }[];
  proTips: string[];
  
  tempo: string;
  breathing: string;
  safetyNotes: string[];
}

export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  squat: {
    id: "squat",
    name: "Bodyweight Squat",
    icon: "🦵",
    difficulty: "Beginner",
    targetMuscles: ["Quadriceps", "Glutes"],
    synergistMuscles: ["Hamstrings", "Calves", "Core", "Abdominals"],
    equipment: "None (bodyweight)",
    setupTime: "10 seconds",
    
    setup: [
      "Stand with feet shoulder-width apart or slightly wider",
      "Turn toes out 15-30 degrees — find what's comfortable for your hips",
      "Engage your core by drawing your belly button toward your spine",
      "Raise arms straight in front of you at shoulder height for balance",
      "Keep your chest up and shoulders back — proud posture",
    ],
    
    execution: [
      "Begin the descent by pushing your hips back and bending your knees simultaneously",
      "Lower until your thighs are parallel to the floor (or as deep as your mobility allows)",
      "Keep your knees tracking in line with your toes — don't let them cave inward",
      "Keep your weight on your heels and mid-foot — you should be able to wiggle your toes",
      "Pause briefly at the bottom without losing tension",
      "Drive through your heels to stand back up, squeezing your glutes at the top",
      "Fully extend your hips and knees at the top — that's one rep",
    ],
    
    commonMistakes: [
      { mistake: "Knees caving inward (valgus)", fix: "Actively push your knees outward, in line with your toes. Imagine spreading the floor apart with your feet." },
      { mistake: "Heels lifting off the ground", fix: "Shift your weight back. If mobility is limited, place a small plate under your heels temporarily." },
      { mistake: "Rounding the lower back (butt wink)", fix: "Engage your core harder and don't go deeper than your mobility allows. Improve ankle and hip mobility." },
      { mistake: "Going up on toes", fix: "Keep weight distributed through the mid-foot and heels. Think 'sit back into a chair.'" },
      { mistake: "Not going deep enough", fix: "Aim for at least 90° knee bend. If you can't, work on ankle dorsiflexion and hip mobility." },
    ],
    
    proTips: [
      "Think 'sit back' rather than 'bend down' — this engages your glutes more effectively",
      "Squeeze your glutes hard at the top of each rep for maximum muscle activation",
      "Keep your neck neutral — don't look up or down excessively",
      "Control the descent (2-3 seconds down) and explode up (1 second up)",
      "If you feel it mostly in your quads, try widening your stance slightly",
    ],
    
    tempo: "3-1-1-0 (3s down, 1s pause, 1s up, 0s rest at top)",
    breathing: "Inhale during the descent. Exhale forcefully as you drive up.",
    safetyNotes: [
      "Stop if you feel sharp pain in your knees, lower back, or hips",
      "Never bounce at the bottom of the movement",
      "If you have knee issues, reduce depth and focus on perfect form",
    ],
  },

  pushup: {
    id: "pushup",
    name: "Push-up",
    icon: "💪",
    difficulty: "Beginner",
    targetMuscles: ["Chest (Pectoralis Major)", "Triceps", "Shoulders (Anterior Deltoid)"],
    synergistMuscles: ["Core", "Serratus Anterior", "Upper Back"],
    equipment: "None (bodyweight)",
    setupTime: "5 seconds",
    
    setup: [
      "Start on all fours with hands slightly wider than shoulder-width",
      "Extend your legs behind you, balancing on your toes",
      "Form a straight line from your head to your heels — no sagging hips",
      "Engage your core and squeeze your glutes to maintain the plank position",
      "Hands should be directly under your shoulders, fingers spread for stability",
      "Look at a point about 6 inches in front of your hands to keep neck neutral",
    ],
    
    execution: [
      "Lower your body by bending your elbows — they should track at about 45° from your torso",
      "Descend until your chest is about 1-2 inches from the floor",
      "Keep your entire body rigid — don't let your hips sag or pike up",
      "Pause briefly at the bottom",
      "Push through your palms to extend your arms and return to the starting position",
      "Fully straighten your arms at the top without locking elbows aggressively",
      "That's one rep — maintain the plank throughout the entire set",
    ],
    
    commonMistakes: [
      { mistake: "Hips sagging toward the floor", fix: "Squeeze your glutes and brace your abs harder. If you can't maintain the position, do knee push-ups instead." },
      { mistake: "Hips piked up (triangle position)", fix: "Shift your weight forward. Your body should be a straight line, not a tent." },
      { mistake: "Elbows flaring out to 90°", fix: "Keep elbows at about 45° from your torso. This protects your shoulder joints." },
      { mistake: "Not going low enough", fix: "Aim for your chest to nearly touch the floor. Use a cushion if needed to gauge depth." },
      { mistake: "Head dropping or looking up", fix: "Keep your neck neutral. Your spine should be one straight line from crown to heels." },
    ],
    
    proTips: [
      "Imagine pushing the floor away from you rather than pushing yourself up",
      "Screw your hands into the floor (externally rotate) to engage your lats and stabilize shoulders",
      "Squeeze your glutes the entire time — this stabilizes your lower back",
      "If full push-ups are too hard, elevate your hands on a bench or wall",
      "For more chest activation, widen your hands slightly. For more triceps, narrow them.",
    ],
    
    tempo: "2-1-1-0 (2s down, 1s pause, 1s up, 0s rest at top)",
    breathing: "Inhale as you lower. Exhale as you push up.",
    safetyNotes: [
      "Stop if you feel sharp shoulder pain — especially in the front of the joint",
      "Never let your elbows flare beyond 90° — this risks shoulder impingement",
      "If your wrists hurt, try push-up handles or make fists",
    ],
  },

  biceps_curl: {
    id: "biceps_curl",
    name: "Biceps Curl",
    icon: "🏋️",
    difficulty: "Beginner",
    targetMuscles: ["Biceps Brachii", "Brachialis"],
    synergistMuscles: ["Forearms", "Front Deltoids"],
    equipment: "Dumbbells (or resistance band)",
    setupTime: "10 seconds",
    
    setup: [
      "Stand tall with feet hip-width apart, knees slightly bent",
      "Hold a dumbbell in each hand with palms facing forward (supinated grip)",
      "Pin your elbows to your sides — they should not move during the exercise",
      "Engage your core and stand up straight — no leaning back",
      "Let your arms hang fully extended at your sides",
    ],
    
    execution: [
      "Curl the weights up by bending your elbows — keep elbows pinned to your sides",
      "Squeeze your biceps hard at the top of the movement",
      "The dumbbells should reach approximately shoulder level",
      "Lower the weights slowly and with control — resist gravity on the way down",
      "Fully extend your arms at the bottom without letting the weight pull your shoulders",
      "That's one rep — maintain strict form throughout",
    ],
    
    commonMistakes: [
      { mistake: "Swinging the body to lift the weight", fix: "Stand against a wall to prevent swinging. If you have to swing, the weight is too heavy." },
      { mistake: "Elbows drifting forward", fix: "Pin your elbows to your ribs. Imagine they're glued in place." },
      { mistake: "Not lowering fully", fix: "Fully extend your arms at the bottom. The stretch is where growth happens." },
      { mistake: "Going too fast", fix: "Control the negative (3 seconds down). The eccentric phase builds more muscle." },
      { mistake: "Shrugging shoulders", fix: "Keep your shoulders down and back. Think 'long neck.'" },
    ],
    
    proTips: [
      "Squeeze your biceps for 1 second at the top of every rep — mind-muscle connection matters",
      "Lower the weight slower than you lift it (3-second eccentric for maximum growth)",
      "Try twisting your pinky upward at the top (supination) for peak contraction",
      "Don't rest at the bottom — keep constant tension on the biceps",
      "If you feel it in your forearms more than biceps, lighten the weight and focus on form",
    ],
    
    tempo: "1-1-3-0 (1s up, 1s squeeze, 3s down, 0s rest)",
    breathing: "Exhale as you curl up. Inhale as you lower.",
    safetyNotes: [
      "Use a weight you can control — bouncing at the bottom damages tendons",
      "Keep wrists straight, not bent backward",
      "If you feel elbow pain, try hammer curls (palms facing each other) instead",
    ],
  },

  shoulder_press: {
    id: "shoulder_press",
    name: "Shoulder Press",
    icon: "🎯",
    difficulty: "Intermediate",
    targetMuscles: ["Deltoids (all three heads)", "Triceps"],
    synergistMuscles: ["Upper Chest", "Traps", "Core"],
    equipment: "Dumbbells",
    setupTime: "15 seconds",
    
    setup: [
      "Sit on a bench with back support, or stand with feet shoulder-width apart",
      "Hold a dumbbell in each hand at shoulder height",
      "Palms facing forward, elbows bent at 90° and pointing slightly forward",
      "Engage your core — brace as if someone is about to punch your stomach",
      "Squeeze your glutes to protect your lower back",
      "Keep your chest up and shoulders pulled back and down",
    ],
    
    execution: [
      "Press the dumbbells overhead by extending your arms fully",
      "The weights should move slightly toward each other at the top (but not touch)",
      "Keep your core engaged — don't arch your lower back",
      "Pause briefly at the top with arms fully extended",
      "Lower the weights slowly back to shoulder height",
      "Maintain control throughout — don't let the weights drop",
      "That's one rep",
    ],
    
    commonMistakes: [
      { mistake: "Excessive lower back arch", fix: "Squeeze your glutes and brace your core harder. Consider using a bench with back support." },
      { mistake: "Not pressing fully overhead", fix: "Lock out your arms at the top. Partial reps leave gains on the table." },
      { mistake: "Dumbbells drifting forward", fix: "Press the weights directly overhead, not in front of you. The weights should align with your ears at the top." },
      { mistake: "Rushing the descent", fix: "Lower slowly (3 seconds). The negative builds shoulder stability and strength." },
      { mistake: "Head jutting forward", fix: "Keep your head neutral. Don't crane your neck to look up." },
    ],
    
    proTips: [
      "Squeeze your glutes hard throughout the movement — this stabilizes your spine",
      "Imagine pushing yourself away from the ceiling rather than pushing weights up",
      "At the top, actively push the dumbbells toward the ceiling for 1 second (overhead press lockout)",
      "Lower the weights to ear level, not below — this keeps constant tension",
      "Standing presses build more core strength than seated, but seated allows heavier weights",
    ],
    
    tempo: "1-1-2-0 (1s press, 1s hold, 2s lower, 0s rest)",
    breathing: "Exhale as you press up. Inhale as you lower.",
    safetyNotes: [
      "Stop if you feel sharp pain in the shoulder joint (not muscle burn)",
      "Never bounce at the bottom — this can tear the rotator cuff",
      "If you have shoulder impingement, try pressing with palms facing each other (neutral grip)",
    ],
  },

  lunges: {
    id: "lunges",
    name: "Forward Lunge",
    icon: "🚶",
    difficulty: "Beginner",
    targetMuscles: ["Quadriceps", "Glutes"],
    synergistMuscles: ["Hamstrings", "Calves", "Core"],
    equipment: "None (bodyweight)",
    setupTime: "5 seconds",
    
    setup: [
      "Stand tall with feet hip-width apart",
      "Engage your core, chest up, shoulders back",
      "Keep your gaze straight ahead",
      "Hands on hips or at your sides for balance",
    ],
    
    execution: [
      "Take a big step forward with your right foot (about 2-3 feet)",
      "Lower your body by bending both knees simultaneously",
      "Your front knee should track over your toes — not past them",
      "Your back knee should descend toward the floor (but not touch)",
      "Both knees should reach approximately 90° at the bottom",
      "Keep your torso upright — don't lean forward",
      "Push through your front heel to return to the starting position",
      "Repeat with the left leg. That's one rep per side.",
    ],
    
    commonMistakes: [
      { mistake: "Front knee going past toes", fix: "Take a longer step. Your shin should be vertical at the bottom." },
      { mistake: "Leaning forward at the waist", fix: "Keep your torso upright. Engage your core and look straight ahead." },
      { mistake: "Short stride", fix: "Step far enough that both knees reach 90°. A short step puts too much pressure on the front knee." },
      { mistake: "Losing balance", fix: "Keep your feet hip-width apart (not on a tightrope). Engage your core." },
      { mistake: "Back knee slamming into floor", fix: "Control the descent. Your back knee should hover 1-2 inches above the floor." },
    ],
    
    proTips: [
      "Push through your front heel to emphasize glute activation",
      "Keep your front foot flat — don't let the heel lift",
      "Squeeze your glutes at the bottom of each rep for stability",
      "Alternate legs (1 rep each) or do all reps on one side before switching",
      "To make it harder, hold dumbbells at your sides",
    ],
    
    tempo: "2-1-1-0 (2s down, 1s pause, 1s up, 0s rest)",
    breathing: "Inhale as you step forward and lower. Exhale as you push back.",
    safetyNotes: [
      "If you have knee pain, try reverse lunges (stepping backward) instead",
      "Never let your front knee collapse inward",
      "Start with bodyweight before adding resistance",
    ],
  },

  plank: {
    id: "plank",
    name: "Plank Hold",
    icon: "🧘",
    difficulty: "Beginner",
    targetMuscles: ["Core (Transverse Abdominis)", "Rectus Abdominis"],
    synergistMuscles: ["Shoulders", "Glutes", "Lower Back", "Obliques"],
    equipment: "None (bodyweight)",
    setupTime: "5 seconds",
    
    setup: [
      "Start on all fours, then lower onto your forearms",
      "Position elbows directly under your shoulders",
      "Forearms parallel, hands flat or clasped together",
      "Extend your legs behind you, balancing on your toes",
      "Form a straight line from your head to your heels",
    ],
    
    execution: [
      "Engage your core by drawing your belly button toward your spine",
      "Squeeze your glutes and thighs — everything should be rigid",
      "Keep your neck neutral — look at the floor about 6 inches ahead",
      "Breathe normally — don't hold your breath",
      "Hold this position for the prescribed time",
      "Keep your hips level — don't let them sag or pike up",
    ],
    
    commonMistakes: [
      { mistake: "Hips sagging toward floor", fix: "Squeeze your glutes and quads harder. If you can't hold, lift your hips slightly." },
      { mistake: "Hips too high (pike position)", fix: "Lower your hips until your body forms a straight line. You're not doing downward dog." },
      { mistake: "Head dropping or looking up", fix: "Keep your neck neutral. Your spine should be one straight line." },
      { mistake: "Holding breath", fix: "Breathe steadily throughout the hold. Rhythmic breathing maintains core engagement." },
      { mistake: "Relaxing the glutes", fix: "Squeeze your glutes the entire time. This stabilizes your lower back." },
    ],
    
    proTips: [
      "Imagine someone is about to punch your stomach — that's the level of core engagement",
      "Squeeze EVERYTHING — glutes, quads, abs, even your armpits",
      "Start with 20-30 second holds and build up gradually",
      "If your form breaks, stop. Quality > quantity for planks",
      "To progress, try lifting one foot, or doing plank-to-pushup transitions",
    ],
    
    tempo: "Isometric hold — maintain constant tension",
    breathing: "Breathe normally. Inhale through nose, exhale through mouth.",
    safetyNotes: [
      "Stop if you feel lower back pain — this means your core has fatigued and your back is compensating",
      "Never hold your breath — this increases blood pressure",
      "If you have wrist issues, use forearms (which is the standard plank position anyway)",
    ],
  },

  jumping_jack: {
    id: "jumping_jack",
    name: "Jumping Jack",
    icon: "⭐",
    difficulty: "Beginner",
    targetMuscles: ["Full Body (Cardio)"],
    synergistMuscles: ["Shoulders", "Calves", "Glutes", "Heart"],
    equipment: "None (bodyweight)",
    setupTime: "3 seconds",
    
    setup: [
      "Stand with feet together, arms at your sides",
      "Engage your core",
      "Keep a slight bend in your knees",
    ],
    
    execution: [
      "Jump and spread your feet wider than shoulder-width",
      "Simultaneously raise your arms overhead in an arc",
      "Land softly on the balls of your feet",
      "Immediately jump back to the starting position (feet together, arms down)",
      "Maintain a steady rhythm — this is a cardio exercise",
      "Keep your core engaged throughout",
    ],
    
    commonMistakes: [
      { mistake: "Landing hard on heels", fix: "Land softly on the balls of your feet. Think 'quiet ninja.'" },
      { mistake: "Arms not reaching full overhead", fix: "Fully extend arms overhead each rep for full range of motion." },
      { mistake: "Asymmetric arm/leg movement", fix: "Coordinate arms and legs to move together symmetrically." },
      { mistake: "Stiff knees on landing", fix: "Keep a slight bend in your knees to absorb impact." },
    ],
    
    proTips: [
      "Use this as a warm-up or between-set cardio burst",
      "Keep a steady pace — don't go so fast that form breaks down",
      "Engage your core to protect your lower back",
      "For low-impact version, step side-to-side instead of jumping",
    ],
    
    tempo: "Continuous — 1 rep per second",
    breathing: "Breathe naturally. Don't hold your breath.",
    safetyNotes: [
      "Wear supportive shoes — this is a high-impact exercise",
      "If you have knee or ankle issues, do the low-impact stepping version",
      "Stop if you feel dizzy or lightheaded",
    ],
  },

  glute_bridge: {
    id: "glute_bridge",
    name: "Glute Bridge",
    icon: "🍑",
    difficulty: "Beginner",
    targetMuscles: ["Glutes (Maximus)", "Hamstrings"],
    synergistMuscles: ["Core", "Lower Back", "Quads"],
    equipment: "None (bodyweight)",
    setupTime: "10 seconds",
    
    setup: [
      "Lie on your back with knees bent, feet flat on the floor",
      "Feet hip-width apart, about 6 inches from your glutes",
      "Arms at your sides, palms down for stability",
      "Engage your core",
    ],
    
    execution: [
      "Drive through your heels to lift your hips off the floor",
      "Squeeze your glutes hard at the top",
      "Your body should form a straight line from knees to shoulders",
      "Hold the top position for 1-2 seconds with maximum glute squeeze",
      "Lower your hips slowly back to the floor",
      "Don't rest at the bottom — immediately start the next rep",
    ],
    
    commonMistakes: [
      { mistake: "Pushing through toes instead of heels", fix: "Drive through your heels. You can even lift your toes to ensure correct pressure." },
      { mistake: "Overarching lower back", fix: "Posteriorly tilt your pelvis (tuck your tailbone) before lifting. Squeeze your glutes, not your back." },
      { mistake: "Not squeezing at the top", fix: "Hold the top for 2 seconds with a hard glute squeeze. This is the most important part." },
      { mistake: "Going too fast", fix: "Control both the ascent and descent. 2 seconds up, 2 seconds down." },
      { mistake: "Feet too close or too far", fix: "Position feet so your shins are vertical at the top of the movement." },
    ],
    
    proTips: [
      "Imagine pushing the ceiling away with your hips at the top",
      "Tuck your tailbone (posterior pelvic tilt) before lifting to protect your lower back",
      "To make it harder, do single-leg glute bridges",
      "Place a mini band around your knees to activate glute medius (side glutes)",
      "If you feel it in your hamstrings more than glutes, move your feet closer to your body",
    ],
    
    tempo: "2-2-2-0 (2s up, 2s hold, 2s down, 0s rest)",
    breathing: "Exhale as you lift. Inhale as you lower.",
    safetyNotes: [
      "Stop if you feel sharp lower back pain",
      "Keep your neck relaxed — don't strain your cervical spine",
      "If you have knee discomfort, adjust foot position",
    ],
  },
};

export function getExerciseGuide(exerciseId: string): ExerciseGuide | null {
  return EXERCISE_GUIDES[exerciseId] || null;
}
