# Database Migration Guide

AI Gym Coach Pro uses Prisma ORM and supports both SQLite (local dev) and PostgreSQL (production).

## Current Setup: SQLite (Local Dev)

The app ships with SQLite for zero-config local development. The database file lives at `db/custom.db`.

## Migrating to PostgreSQL (Production)

For production, use a managed Postgres database. Recommended providers:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| [Neon](https://neon.tech) | 0.5 GB, 1 project | Serverless Postgres, best for Vercel |
| [Supabase](https://supabase.com) | 500 MB, 2 projects | Includes auth + realtime if needed |
| [Railway](https://railway.app) | $5 credit/mo | Simple, good for small apps |
| [AWS RDS](https://aws.amazon.com/rds/) | None | Enterprise scale |

### Steps to Migrate

1. **Create a Postgres database** on your chosen provider and get the connection string.

2. **Update `.env`**:
   ```bash
   # Change from SQLite:
   # DATABASE_URL=file:/home/z/my-project/db/custom.db
   
   # To Postgres:
   DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
   ```

3. **Update `prisma/schema.prisma`** datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"  // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   
   Note: The schema models are already Postgres-compatible. No field changes needed.

4. **Push the schema to your new database**:
   ```bash
   npx prisma db push
   # OR create a proper migration:
   npx prisma migrate dev --name init
   ```

5. **Verify** by starting the app and creating a workout.

### Production Checklist

- [ ] `DATABASE_URL` points to Postgres (not SQLite)
- [ ] `provider = "postgresql"` in `schema.prisma`
- [ ] Connection pooling enabled (Neon does this automatically)
- [ ] Database backups configured (Neon/Supabase do this automatically)
- [ ] `NEXTAUTH_SECRET` is a real random value (`openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` matches your production domain
- [ ] Rate limiting tested (middleware is in-memory; for multi-instance, use `@upstash/ratelimit` + Redis)
