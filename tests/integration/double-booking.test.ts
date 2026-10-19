/**
 * Concurrency test against a real Postgres. Runs only when TEST_DATABASE_URL
 * is set (never in CI by default) and must point at a disposable database —
 * a Neon branch, never production. It creates one table and a few
 * reservations far in the future and deletes them again.
 *
 *   TEST_DATABASE_URL="postgresql://…" npm test
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const url = process.env.TEST_DATABASE_URL

describe.skipIf(!url)('double booking under concurrency (real database)', () => {
  // lib/prisma reads DATABASE_URL when first imported, so set it before.
  process.env.DATABASE_URL = url
  process.env.DIRECT_URL ??= url

  // A party size no ordinary table accepts, so the allocator can only ever
  // choose the table this test creates.
  const PARTY = 19
  const START = new Date('2030-01-15T11:00:00.000Z') // 12:00 Vienna
  const SETTINGS = {
    duration_1_2: 60,
    duration_3_4: 90,
    duration_5_plus: 120,
    buffer_minutes: 15,
    booking_horizon: 60,
    min_guests: 1,
    max_guests: 20,
  }

  let tableId = ''
  let mods: {
    prisma: typeof import('@/lib/prisma').prisma
    withBookingLock: typeof import('@/lib/booking/lock').withBookingLock
    findBestTable: typeof import('@/lib/booking/table-allocator').findBestTable
  }

  beforeAll(async () => {
    const [{ prisma }, { withBookingLock }, { findBestTable }] = await Promise.all([
      import('@/lib/prisma'),
      import('@/lib/booking/lock'),
      import('@/lib/booking/table-allocator'),
    ])
    mods = { prisma, withBookingLock, findBestTable }
    const table = await prisma.table.create({
      data: { name: `itest-${Date.now()}`, capacity: 20, minCapacity: PARTY, isActive: true },
    })
    tableId = table.id
  })

  afterAll(async () => {
    if (!mods) return
    await mods.prisma.reservation.deleteMany({ where: { tableId } })
    await mods.prisma.table.deleteMany({ where: { id: tableId } })
    await mods.prisma.$disconnect()
  })

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  /**
   * The booking flow of the API routes, with a pause between the conflict
   * check and the insert. The pause makes the race deterministic: without the
   * lock both requests check before either one writes.
   */
  async function book(useLock: boolean): Promise<'BOOKED' | 'REJECTED'> {
    const { prisma, withBookingLock, findBestTable } = mods
    const flow = async (db: Parameters<typeof findBestTable>[1]) => {
      const allocation = await findBestTable({ guestCount: PARTY, startTime: START, settings: SETTINGS }, db)
      if (!allocation.success) return 'REJECTED' as const
      await sleep(400)
      await db!.reservation.create({
        data: {
          guestName: 'Integration Test',
          guestEmail: 'itest@phone.local',
          guestPhone: '-',
          guestCount: PARTY,
          date: new Date('2030-01-15T00:00:00.000Z'),
          startTime: START,
          endTime: allocation.endTime,
          source: 'ADMIN',
          status: 'CONFIRMED',
          tableId: allocation.table.id,
        },
      })
      return 'BOOKED' as const
    }
    return useLock ? withBookingLock(flow) : flow(prisma)
  }

  it('control: without the lock, two concurrent requests both book the table', async () => {
    const results = await Promise.all([book(false), book(false)])
    expect(results).toEqual(['BOOKED', 'BOOKED'])
    expect(await mods.prisma.reservation.count({ where: { tableId } })).toBe(2)
    await mods.prisma.reservation.deleteMany({ where: { tableId } })
  })

  it('with withBookingLock(), exactly one of two concurrent requests succeeds', async () => {
    const results = await Promise.all([book(true), book(true)])
    expect([...results].sort()).toEqual(['BOOKED', 'REJECTED'])
    expect(await mods.prisma.reservation.count({ where: { tableId } })).toBe(1)
  })

  it('holds for a burst of five concurrent requests', async () => {
    await mods.prisma.reservation.deleteMany({ where: { tableId } })
    const results = await Promise.all(Array.from({ length: 5 }, () => book(true)))
    expect(results.filter((r) => r === 'BOOKED')).toHaveLength(1)
    expect(await mods.prisma.reservation.count({ where: { tableId } })).toBe(1)
  })
})
