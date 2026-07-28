# AI Gym Coach Pro

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/tests-71%20passing-success)](#testing)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A next-generation, browser-native AI fitness platform that delivers real-time pose detection, voice coaching, and adaptive workout intelligence — without a single server-side video frame.

Built with **Next.js 16 + TypeScript + MediaPipe Tasks-Vision + Tailwind CSS 4 + shadcn/ui**.

## ✨ Features

- 🎥 **Real-time AI pose detection** — 33 body landmarks at 30 FPS via MediaPipe
- 🗣️ **Voice coaching** — context-aware audio cues (drill / zen / technical personalities)
- 🔒 **Privacy-first** — video never leaves the device; all detection runs in-browser
- 📊 **Progress analytics** — volume, form accuracy trends, personal records, 3D charts
- 🏆 **Gamification** — XP, levels, streaks, badges, 3D trophy room
- 📱 **PWA** — installable, offline-ready, push notifications
- 🌓 **Dark / light / system theme** — fully theme-aware charts and UI
- 📱 **Responsive** — mobile, tablet, desktop
- ♿ **Accessible** — keyboard nav, focus traps, ARIA, screen-reader friendly
- 💳 **Stripe billing** — Pro / Trainer tiers (optional; app works in free mode without it)

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (or [Bun](https://bun.sh) — recommended, faster)
- A webcam (laptop or external)
- Chrome/Edge browser (best Web Speech API support)

### Installation

```bash
# Clone the repo
git clone https://github.com/yashrajkr/ai-gym-coach-pro.git
cd ai-gym-coach-pro

# Install dependencies (use bun for speed, or npm/yarn also works)
bun install
# or
npm install

# 2. Start the dev server
bun run dev
# or
npm run dev

# 3. Open in browser
# Visit http://localhost:3000
```

That's it. No environment variables required for the core app — pose detection runs entirely in your browser.

### Optional: Enable LLM-powered coaching (Groq)

The app ships with template-based voice cues that work offline. To upgrade to dynamic LLM-generated coaching text:

1. Get a free API key from [console.groq.com](https://console.groq.com)
2. Create a `.env.local` file in the project root:
   ```
   GROQ_API_KEY=your_key_here
   ```
3. Restart the dev server

### Optional: Enable database (Prisma + SQLite)

The app works without a database — all data is stored locally in the browser via Zustand + localStorage. To enable server-side persistence:

```bash
# Push the Prisma schema to SQLite
bun run db:push
# or
npx prisma db push
```

---

## Features

### Live AI Coach (Core)
- Real-time browser-side pose detection via **MediaPipe Tasks-Vision** (WASM + GPU)
- 33 body landmarks tracked at 30+ FPS
- Skeleton overlay rendered on canvas (neon-lime + cyan)
- Per-rep form scoring (0-100) computed from joint angle deviation
- Voice coaching via **Web Speech API** (zero-latency, offline, native OS voices)
- 3 coach personalities: Drill Sergeant, Zen, Technical
- **Privacy by architecture**: zero video frames leave your device

### 5 Exercise Detectors
| Exercise | Key Metrics |
|----------|-------------|
| Squat | Knee angle, back angle, depth status |
| Push-up | Elbow angle, body alignment, hip position |
| Biceps Curl | Elbow angle, shoulder stability, swing detection |
| Shoulder Press | Elbow angle, extension, back arch |
| Lunge | Front knee angle, torso angle, balance |

Each detector is a TypeScript class extending `BaseExercise` — adding a new exercise is one file (~80 lines).

### Workout Programs
- 5 pre-built programs: Beginner Full Body, Push/Pull/Legs, HIIT Fat Burn, Strength Foundations, Bodyweight Minimalist
- Program detail view with day-by-day breakdown
- One-click start for any exercise in a program

### Progress Analytics
- Volume by exercise (bar chart)
- Form accuracy trend (area chart, last 20 sessions)
- 14-day activity heatmap
- Personal records (best form score per exercise)
- All charts via Recharts

### Gamification
- XP system: earn XP for workouts, PRs, good form, streaks
- 50 levels with progressive XP requirements
- Streak tracking (daily, with yesterday check)
- Badges (12 available — see `src/lib/data/programs.ts`)

### Exercise Library
- 5 detailed exercise cards with muscle groups, difficulty, equipment
- Form cues for each exercise
- One-click start for a live session

---

## Project Structure

```
ai-gym-coach-pro/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (dark theme, fonts)
│   │   ├── page.tsx            # Main SPA (landing + dashboard + all views)
│   │   └── globals.css         # Dark athletic theme tokens
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (pre-installed)
│   │   └── gym/
│   │       ├── live-coach.tsx     # Real-time pose detection + voice
│   │       ├── dashboard.tsx      # Stats, level, quick start
│   │       ├── programs.tsx       # Program list + detail
│   │       ├── analytics.tsx      # Charts (Recharts)
│   │       ├── library.tsx        # Exercise library
│   │       └── workout-setup.tsx  # Configure sets/reps modal
│   └── lib/
│       ├── exercises/          # Exercise detectors (TypeScript port of original Python)
│       │   ├── base.ts         # BaseExercise abstract class
│       │   ├── squat.ts
│       │   ├── pushup.ts
│       │   ├── biceps_curl.ts
│       │   ├── shoulder_press.ts
│       │   ├── lunges.ts
│       │   └── index.ts        # Config + form issue rules
│       ├── coaching/
│       │   └── voice.ts        # Web Speech API voice coach
│       ├── stores/
│       │   └── workout.ts      # Zustand store (sessions, XP, streaks)
│       └── data/
│           └── programs.ts     # Pre-built programs + badges
├── prisma/
│   └── schema.prisma           # Database schema (optional)
├── public/
│   └── logo.svg
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `bg-background` | `#0a0b0d` | Page background |
| `bg-card` | `#111418` | Cards, panels |
| `primary` (lime) | `#a3e635` | CTAs, active states, live data |
| `accent` (cyan) | `#22d3ee` | Links, secondary highlights |
| `text-foreground` | `#f4f4f5` | Body text |
| `text-muted-foreground` | `#a1a1aa` | Captions, labels |
| `border` | `#27272a` | Dividers, card edges |

**Typography**: Inter (sans, weights 300-900) + JetBrains Mono (numeric data, labels).

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | SSR for landing/SEO, RSC for dashboard perf |
| Language | TypeScript 5 | Type safety |
| Styling | Tailwind CSS 4 | Utility-first, dark-mode native |
| UI Components | shadcn/ui + Radix | Composable, accessible |
| Pose Detection | @mediapipe/tasks-vision | Browser-native, 30+ FPS, no server inference |
| Voice Output | Web Speech API | Zero-latency, offline, native OS voices |
| State | Zustand + persist | Lightweight client state |
| Charts | Recharts 2 | Composable React charts |
| Database (optional) | Prisma + SQLite | Type-safe, serverless-ready |
| Auth (optional) | NextAuth.js v4 | Available but not wired by default |

---

## Scripts

```bash
bun run dev      # Start dev server on http://localhost:3000
bun run build    # Production build
bun run start    # Run production build
bun run lint     # ESLint check
bun run db:push  # Push Prisma schema to SQLite
```

---

## How It Works (Architecture)

### Live Workout Session Flow

1. User clicks **Start** → camera stream begins via `getUserMedia`
2. Each video frame is passed to `PoseLandmarker.detectForVideo()`
3. Returned 33 landmarks are passed to the active exercise detector's `process()` method
4. Detector returns metrics (reps, angles, form score)
5. Skeleton is rendered to a canvas overlay (mirrored for natural interaction)
6. If a form issue is detected, an event is enqueued to the voice pipeline
7. Voice pipeline debounces (5s min gap), calls LLM (optional) for coaching text, speaks via Web Speech API
8. On set completion, metrics are persisted to Zustand store (localStorage)

**Steps 1-7 happen entirely in the browser. Only step 8 touches local storage — no network calls for video.**

### Adding a New Exercise

1. Create `src/lib/exercises/my_exercise.ts`:
   ```typescript
   import { BaseExercise, Landmarks, POSE_LANDMARKS } from "./base";

   export interface MyExerciseMetrics {
     reps: number;
     pose_detected: boolean;
     my_metric: string;
     form_score: number;
   }

   export class MyExerciseDetector extends BaseExercise<MyExerciseMetrics> {
     reset() { this.reps = 0; this.stage = null; }

     process(landmarks: Landmarks): MyExerciseMetrics {
       // Your detection logic here
       return { reps: this.reps, pose_detected: true, my_metric: "OK", form_score: 90 };
     }
   }
   ```

2. Register it in `src/lib/exercises/index.ts`:
   ```typescript
   import { MyExerciseDetector } from "./my_exercise";
   // Add to EXERCISES record with config
   // Add form issue rules to getFormIssue()
   ```

3. Done — it appears in the dashboard, library, and live coach automatically.

---

## Browser Compatibility

| Browser | Pose Detection | Voice Output | Notes |
|---------|---------------|--------------|-------|
| Chrome 90+ | ✅ Full | ✅ Full | Best experience |
| Edge 90+ | ✅ Full | ✅ Full | Same as Chrome |
| Firefox 90+ | ✅ Full | ⚠️ Limited | Voices may differ |
| Safari 15+ | ✅ Full | ⚠️ Limited | Web Speech API partial |

**Camera permission required.** The app will prompt on first live session.

---

## Privacy

- **Zero video transmission**: All pose detection runs client-side via MediaPipe WASM
- **Zero video storage**: No video frames are saved anywhere
- **Local-only persistence**: Workout history stored in browser localStorage via Zustand
- **No analytics/tracking**: No third-party analytics on the dev build
- **GDPR/CCPA compliant by architecture**

---

## Troubleshooting

**"Camera access denied"**
- Check browser permissions (chrome://settings/content/camera)
- Ensure no other app is using the camera
- Try HTTPS (some browsers require it for camera access — `localhost` is exempt)

**"Model loading..." never completes**
- Check your network — the pose model loads from Google Cloud Storage on first use
- Try refreshing; the model is cached after first load

**Voice coach doesn't speak**
- Check system volume
- Try a different browser (Chrome recommended)
- Some browsers require user interaction before speech synthesis works — click anywhere first

**Low FPS (< 15)**
- Close other browser tabs
- Ensure good lighting (low light = harder detection = slower)
- Try a smaller camera resolution in browser settings
- The `pose_landmarker_lite` model is used by default for speed; switch to `full` for accuracy (edit `live-coach.tsx`)

---

## Roadmap

- [x] 8 exercises with AI form detection (squat, pushup, curl, press, lunge, plank, jumping jack, glute bridge)
- [x] PWA + offline mode
- [x] Real auth (NextAuth) + cloud sync
- [x] Stripe billing integration
- [ ] 20+ exercises (deadlift, burpees, mountain climbers, etc.)
- [ ] Custom plan builder (drag-and-drop)
- [ ] Trainer tier with client management
- [ ] iOS/Android native apps
- [ ] Apple Health / Google Fit sync

---

## 🚢 Deployment

### Vercel (recommended — 1-click deploy)

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Vercel auto-detects Next.js — no config needed
4. Add Environment Variables (see `.env.example`):
   - `DATABASE_URL` — use [Neon](https://neon.tech) (free Postgres)
   - `NEXTAUTH_URL` — your Vercel URL (e.g. `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - Optional: `STRIPE_*`, `GOOGLE_CLIENT_*`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`
5. Deploy — Vercel runs `bun install` + `prisma generate` (postinstall) + `next build` automatically
6. Run `prisma migrate deploy` once (or use Neon's web console to push the schema)

> **Note:** The app works in **demo mode** with just `DATABASE_URL` + `NEXTAUTH_URL` + `NEXTAUTH_SECRET`.
> All other services (Stripe, Google OAuth, Sentry, PostHog) are optional add-ons.

### Docker

```bash
# Build
docker build -t ai-gym-coach-pro .

# Run (requires env vars)
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_URL="https://yourdomain.com" \
  -e NEXTAUTH_SECRET="your-secret" \
  ai-gym-coach-pro
```

The Dockerfile includes a `HEALTHCHECK` that hits `/api/health` every 30s.

### Self-hosted (Node.js)

```bash
bun install
bun run db:generate
bun run build:standalone
NODE_ENV=production node .next/standalone/server.js
```

---

## 🧪 Testing

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Unit tests (71 tests)
bun run test

# Production build
bun run build
```

All checks must pass before merging. CI runs these on every push (see `.github/workflows/ci.yml`).

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # 12 API routes (auth, billing, workouts, etc.)
│   ├── layout.tsx          # Root layout + theme script + metadata
│   ├── page.tsx            # Main app shell (landing + authed views)
│   ├── error.tsx           # Branded error boundary
│   ├── loading.tsx         # Branded loading state
│   └── not-found.tsx       # Branded 404
├── components/
│   ├── gym/                # 13 fitness-specific components
│   ├── three/              # 6 Three.js 3D components
│   ├── ui/                 # 40+ shadcn/ui primitives
│   └── ui-pro/             # 6 premium UI components
├── lib/
│   ├── auth/               # NextAuth config + CSRF helpers
│   ├── billing/            # Stripe integration
│   ├── coaching/           # Voice + sound coaching
│   ├── config/             # Runtime feature detection
│   ├── data/               # Programs + exercise guides
│   ├── exercises/          # 8 pose-detection exercise detectors
│   ├── fitness/            # Calculations (1RM, calories, recovery)
│   ├── stores/             # Zustand stores (workout, router)
│   └── env.ts              # Environment validation
├── prisma/
│   └── schema.prisma       # 14 models, cascade deletes, indexed
└── public/
    ├── manifest.json       # PWA manifest
    ├── sw.js               # Service worker
    ├── offline.html        # PWA offline fallback
    └── models/             # MediaPipe WASM + pose model
```

---

## 🔒 Security

- ✅ NextAuth JWT sessions with rotating secret
- ✅ Password hashing (bcrypt, cost 12)
- ✅ CSRF defense-in-depth on mutations
- ✅ Rate limiting on auth + workout endpoints
- ✅ Input validation (Zod) on all API routes
- ✅ Atomic database transactions (workout + XP)
- ✅ Stripe webhook idempotency (event-ID dedup)
- ✅ Account deletion requires password re-auth
- ✅ SSRF prevention (image URL allowlist)
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ No PII in logs (Prisma query logging disabled in production)

---

## License

MIT — see [LICENSE](LICENSE).

---

## Credits

Built on top of the original AI Gym Coach Streamlit prototype, reimagined as a production-grade browser-native web app.
