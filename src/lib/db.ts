import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Only log queries in development. In production, query logging would
// dump every SQL statement (including `WHERE email = ...`) to stdout —
// a PII leak and a serious performance overhead.
type LogConfig = ("query" | "error" | "warn" | "info")[]
const logConfig: LogConfig =
  process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['query', 'error', 'warn']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db