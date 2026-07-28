# Contributing to AI Gym Coach Pro

Thanks for your interest in contributing! 🎉

## Development Setup

```bash
# Clone + install
git clone https://github.com/yourusername/ai-gym-coach-pro.git
cd ai-gym-coach-pro
bun install

# Set up the database (SQLite for dev)
cp .env.example .env
bun run db:push

# Start dev server
bun run dev
```

Open http://localhost:3000 and click "Try Demo" to get started.

## Before Submitting a PR

Run all checks locally:

```bash
bun run typecheck   # 0 errors
bun run lint        # 0 errors (warnings OK for pre-existing code)
bun run test        # 71/71 passing
bun run build       # succeeds
```

All four must pass. CI will run these on your PR.

## Code Style

- **TypeScript strict mode** — no `any` in new code (warnings OK in legacy)
- **Functional components** with hooks — no class components except ErrorBoundary
- **Zustand for state** — subscribe to slices individually: `useWorkoutStore((s) => s.field)`
- **Tailwind v4** — use `@theme` tokens from `globals.css`, not hardcoded colors
- **Accessible by default** — every interactive element needs an `aria-label` if icon-only
- **Lazy-load heavy components** — Three.js, MediaPipe, recharts should be `lazy()` + `Suspense`

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add mountain climber exercise detector
fix: prevent RAF loop from spinning after workout ends
docs: update deployment guide for Vercel
refactor: extract KpiCard into reusable component
chore: upgrade Next.js to 16.1.4
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes + add tests if applicable
3. Run all 4 checks (typecheck, lint, test, build)
4. Push + open a PR with a clear description
5. Link any related issues
6. Wait for CI to pass
7. Address review feedback

## Reporting Bugs

Use the GitHub issue template. Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser + OS
- Console errors (if any)
- Screenshots (if visual)

## Feature Requests

Open a GitHub Discussion first to discuss the idea before implementing.
