import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type Db = Prisma.TransactionClient

// Arbitrary constant: one key for the whole restaurant. Booking writes are
// rare (a handful per minute at peak), so a single global lock costs nothing
// and cannot deadlock.
const BOOKING_LOCK_KEY = 4_207_317

/**
 * Runs `fn` inside an interactive transaction that holds a Postgres
 * transaction-level advisory lock. Every code path that checks a table for
 * conflicts and then writes a reservation must go through here, otherwise two
 * concurrent requests can both see the table as free and double-book it.
 *
 * pg_advisory_xact_lock (not pg_advisory_lock) is deliberate: it is released
 * on COMMIT/ROLLBACK, so it is safe behind PgBouncer in transaction mode, where
 * consecutive statements outside a transaction may run on different server
 * connections.
 */
export async function withBookingLock<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      // $executeRaw, not $queryRaw: the function returns `void`, which Prisma
      // cannot deserialize as a result column.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK_KEY})`
      return fn(tx)
    },
    { maxWait: 5_000, timeout: 10_000 }
  )
}
