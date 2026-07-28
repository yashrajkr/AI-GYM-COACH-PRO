# Production Setup

Everything here was verified against this repo on Next.js 16.2.12 with npm.
The app runs today with **zero** type errors, zero lint errors, 71/71 tests
passing, and a clean `next build`.

---

## 1. Local run (works out of the box)

```bash
npm install
npm run dev
```

`npm install` runs `prisma generate` via the `postinstall` hook, so there is no
separate generate step. Open http://localhost:3000 and click **Try Demo — No
Signup Needed**; it creates and signs into a shared `demo@try-aigymcoach.com`
account against the checked-in SQLite database at `db/custom.db`.

Nothing else is required. Every integration below is optional and the app
degrades gracefully without it (see the fallback list at the bottom of
`.env.example`).

---

## 2. Verify before you ship

Run all four. All four must be clean.

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Notes on what "clean" means:

- **typecheck** — must be silent. `next.config.ts` sets
  `typescript.ignoreBuildErrors: false`, so a type error fails the build too.
- **lint** — **0 errors**. There are ~56 warnings left (unused vars, `any`,
  non-null assertions, and deliberate `console.log` audit lines in the Stripe
  and Razorpay webhook handlers). Warnings do not fail the build. Clean them up
  if you want, but none of them affect correctness.
- **test** — 5 files, 71 tests.
- **build** — must print `✓ Compiled successfully` and produce `.next/BUILD_ID`.

> **Stop the dev server before running `npm run build`.** Both write to
> `.next/`, and a running dev server will delete the production output from
> under you. The symptom is `next start` failing with *"Could not find a
> production build in the '.next' directory"* even though the build just
> succeeded.

To smoke-test the real production server locally:

```bash
npm run build && npm start
```

Then check health — it does a live database round-trip:

```bash
curl http://localhost:3000/api/health
```

Expect `{"status":"healthy",...,"database":"connected","latencyMs":<n>}`.

---

## 3. Required environment variables

Only three are required. `src/lib/env.ts` validates them at boot and **throws in
production** if any is missing.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | See the database section below. |
| `NEXTAUTH_URL` | Full origin, e.g. `https://yourdomain.com`. Must be HTTPS in production (localhost is exempt). |
| `NEXTAUTH_SECRET` | Signs session JWTs. Generate a fresh one — see below. |

### Rotate the secret before deploying

The `NEXTAUTH_SECRET` currently in `.env` was generated for local development
and is sitting in your working tree. Anyone who has seen it can forge session
tokens. Generate a new one for production and never reuse the dev value:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`.env` is already gitignored (`.gitignore:38`), so it will not be committed —
but set the production value in your host's environment variable UI, not in a
file.

---

## 4. Database — the one blocking change for deployment

The app currently uses **SQLite**, which works locally but **will not work on
Vercel or any serverless host**: the filesystem is read-only and per-invocation,
so writes disappear and every instance sees a different database.

Migrating (do this before your first deploy):

1. Provision Postgres — [Neon](https://neon.tech), Supabase, or Vercel Postgres.
2. In `prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL` to the connection string (include `?sslmode=require` for
   Neon).
4. Create the schema in the new database:
   ```bash
   npx prisma migrate deploy    # if you keep migrations
   # or, for a fresh database with no migration history:
   npx prisma db push
   ```

`docs/DATABASE_MIGRATION.md` has more detail.

If you stay on SQLite, you must deploy to a host with a real persistent disk
(a VPS, Fly.io with a volume, Railway) — the included `Dockerfile` and
`Caddyfile` cover that path.

---

## 5. Deploying to Vercel

1. Push to GitHub and import the repo in Vercel.
2. Add the three required env vars (plus any optional ones) under
   **Settings → Environment Variables**.
3. Set `NEXTAUTH_URL` to your production URL explicitly. Do not rely on the
   auto-detected preview URL.
4. Deploy.

Two things I changed to make this work correctly:

- **`vercel.json` now uses npm.** It previously specified `bun install` /
  `bun run build`. Your repo now contains **both** `bun.lock` and
  `package-lock.json`, and a build that installs with one lockfile while the
  other is present can resolve different versions than you tested.
  **Delete one lockfile.** Keep `package-lock.json` (that is what everything
  here was verified with) and delete `bun.lock`. If you would rather use bun,
  delete `package-lock.json` and revert `vercel.json` to the bun commands.
- **`metadataBase` is no longer hardcoded** to `aigymcoachpro.com`. It now reads
  `NEXT_PUBLIC_SITE_URL`, falls back to `NEXT_PUBLIC_VERCEL_URL` on previews,
  and only then to the canonical domain. Set `NEXT_PUBLIC_SITE_URL` in
  production so social preview images resolve to your own domain.

---

## 6. Optional integrations

All are off by default and the UI adapts when they are absent.

| Feature | Variables | Behaviour when unset |
|---|---|---|
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, **and** `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` | Button hidden; email/password + demo still work |
| Payments (Razorpay) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `NEXT_PUBLIC_RAZORPAY_ENABLED=true` | Pricing buttons show "Coming Soon" |
| Payments (Stripe) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs, `NEXT_PUBLIC_STRIPE_ENABLED=true` | Same |
| Email | `RESEND_API_KEY`, `NEXT_PUBLIC_RESEND_FROM` | Emails become silent no-ops |
| Error monitoring | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Errors go to console only |
| Analytics | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | No tracking |

The Google OAuth flag needs the `NEXT_PUBLIC_` mirror because the two secrets
are server-only — the browser cannot read them, so without the public flag the
button never renders.

### Turning on Google sign-in

1. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** of type *Web application*.
2. Add your authorised redirect URI — exactly:
   `https://yourdomain.com/api/auth/callback/google`
   (and `http://localhost:3000/api/auth/callback/google` for local work).
3. Set all three variables, then **rebuild** — `NEXT_PUBLIC_*` values are inlined
   at build time, so setting them on a running server has no effect:

   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
   ```

4. Confirm it registered: `curl https://yourdomain.com/api/auth/providers` should
   now list `google` alongside `credentials`. Until the two secrets are present
   the provider is deliberately not registered at all.

Notes on how the flow behaves:

- A Google sign-in **creates a real row** in the `User` table (via the `signIn`
  callback in `src/lib/auth/auth-options.ts`). The session strategy is JWT with
  no Prisma adapter, so without that step an OAuth user would hold a valid token
  with no database id and every route reading `session.user.id` would 401 —
  signed in, but nothing saves.
- If the email already belongs to a password account, the accounts are only
  linked when Google reports the address as **verified**. Otherwise sign-in is
  refused, so an unverified Google profile cannot take over an existing account.

### Content-Security-Policy

If you enable Sentry or PostHog, add their ingest hosts to `connect-src` in
`src/proxy.ts`. The policy is deliberately narrow and currently allows only the
hosts this app actually calls (`cdn.jsdelivr.net` and `storage.googleapis.com`
for the MediaPipe model fallback, `fonts.gstatic.com` for 3D text glyphs).
A missing entry shows up as a CSP violation in the console and a failed
request.

---

## 7. Known limitations to plan around

- **Rate limiting is in-memory** (`src/proxy.ts`). Each serverless instance
  keeps its own counters, so the effective limit scales with instance count.
  For real protection use `@upstash/ratelimit` backed by Redis. This is already
  noted in the file.
- **Weekly/streak notification routes are session-gated**, so they cannot be
  driven by an unauthenticated cron job as-is. Add a `CRON_SECRET` header check
  if you want scheduled email summaries.
- **`output: "standalone"`** is set in `next.config.ts` for the Docker path.
  It is harmless on Vercel.
- **Camera features need HTTPS.** `getUserMedia` only works on a secure origin
  (localhost is exempt), so the live coach will not run over plain HTTP on a
  deployed domain.
