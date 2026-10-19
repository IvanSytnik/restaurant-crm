import { describe, expect, it } from 'vitest'
import type { Table } from '@prisma/client'
import {
  NON_BLOCKING_STATUSES,
  blocks,
  findBestTable,
  selectBestTable,
  type ReservationSpan,
} from '@/lib/booking/table-allocator'
import type { Db } from '@/lib/booking/lock'
import type { BookingSettings } from '@/lib/booking/settings'

const at = (hhmm: string) => new Date(`2026-06-12T${hhmm}:00.000Z`)
const minutes = (n: number) => n * 60_000

function table(overrides: Partial<Table> & Pick<Table, 'id' | 'name' | 'capacity'>): Table {
  return {
    minCapacity: 1,
    zone: 'INDOOR',
    isActive: true,
    posX: 0,
    posY: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...overrides,
  }
}

const settings: BookingSettings = {
  duration_1_2: 60,
  duration_3_4: 90,
  duration_5_plus: 120,
  buffer_minutes: 15,
  booking_horizon: 60,
  min_guests: 1,
  max_guests: 8,
}

const T2 = table({ id: 't2', name: 'T2', capacity: 2 })
const T4 = table({ id: 't4', name: 'T4', capacity: 4, minCapacity: 2 })
const T4b = table({ id: 't4b', name: 'T4b', capacity: 4, minCapacity: 2 })
const T6 = table({ id: 't6', name: 'T6', capacity: 6, minCapacity: 3 })

function pick(
  tables: Table[],
  reservations: ReservationSpan[],
  guestCount: number,
  start: Date,
  occupiedMin = 75
) {
  return selectBestTable(tables, reservations, {
    guestCount,
    start,
    freedAt: new Date(start.getTime() + minutes(occupiedMin)),
    bufferMinutes: 15,
  })
}

describe('blocks()', () => {
  // existing: 18:00–19:00 guest time, freed at 19:15 with a 15 min buffer
  const existing = { startTime: at('18:00'), endTime: at('19:00') }

  it('detects a plain overlap', () => {
    expect(blocks(existing, at('18:30'), at('19:45'), 15)).toBe(true)
  })

  it('treats the cleaning buffer as occupied', () => {
    expect(blocks(existing, at('19:10'), at('20:25'), 15)).toBe(true)
  })

  it('allows a slot that starts exactly when the table is freed (touching)', () => {
    expect(blocks(existing, at('19:15'), at('20:30'), 15)).toBe(false)
  })

  it('allows a slot whose own freed-at time touches the existing start', () => {
    // new slot 16:45–17:45 guest time, freed at 18:00 sharp
    expect(blocks(existing, at('16:45'), at('18:00'), 15)).toBe(false)
  })

  it('blocks when the new slot ends one minute into the existing one', () => {
    expect(blocks(existing, at('16:46'), at('18:01'), 15)).toBe(true)
  })

  it('blocks a new slot that fully contains the existing one', () => {
    expect(blocks(existing, at('17:00'), at('21:00'), 15)).toBe(true)
  })
})

describe('selectBestTable()', () => {
  it('picks the smallest table that fits (best fit)', () => {
    expect(pick([T6, T4, T2], [], 2, at('18:00'))).toBe(T2)
    expect(pick([T6, T4, T2], [], 3, at('18:00'))).toBe(T4)
    expect(pick([T6, T4, T2], [], 5, at('18:00'))).toBe(T6)
  })

  it('breaks ties between equal capacities by name', () => {
    expect(pick([T4b, T4], [], 4, at('18:00'))).toBe(T4)
  })

  it('skips a busy table and takes the next best one', () => {
    const busy: ReservationSpan[] = [{ tableId: 't2', startTime: at('18:00'), endTime: at('19:00') }]
    expect(pick([T2, T4], busy, 2, at('18:30'))).toBe(T4)
  })

  it('ignores reservations on other tables', () => {
    const elsewhere: ReservationSpan[] = [{ tableId: 't4', startTime: at('18:00'), endTime: at('19:00') }]
    expect(pick([T2, T4], elsewhere, 2, at('18:00'))).toBe(T2)
  })

  it('accepts a touching slot after the buffer', () => {
    const before: ReservationSpan[] = [{ tableId: 't2', startTime: at('17:00'), endTime: at('18:00') }]
    expect(pick([T2], before, 2, at('18:15'))).toBe(T2)
    expect(pick([T2], before, 2, at('18:14'))).toBe('ALL_TABLES_OCCUPIED')
  })

  it('never uses inactive tables', () => {
    const off = table({ id: 'off', name: 'T1', capacity: 2, isActive: false })
    expect(pick([off, T4], [], 2, at('18:00'))).toBe(T4)
    expect(pick([off], [], 2, at('18:00'))).toBe('NO_SUITABLE_TABLE')
  })

  it('respects minCapacity (no single guest on a 6-top)', () => {
    expect(pick([T6], [], 1, at('18:00'))).toBe('NO_SUITABLE_TABLE')
    expect(pick([T6], [], 3, at('18:00'))).toBe(T6)
  })

  it('reports NO_SUITABLE_TABLE when the party is larger than every table', () => {
    expect(pick([T2, T4, T6], [], 7, at('18:00'))).toBe('NO_SUITABLE_TABLE')
  })

  it('reports ALL_TABLES_OCCUPIED when every fitting table is busy', () => {
    const full: ReservationSpan[] = [
      { tableId: 't4', startTime: at('18:00'), endTime: at('19:30') },
      { tableId: 't6', startTime: at('17:30'), endTime: at('19:30') },
    ]
    expect(pick([T4, T6], full, 4, at('18:30'))).toBe('ALL_TABLES_OCCUPIED')
  })
})

describe('NON_BLOCKING_STATUSES', () => {
  it('frees the table for cancelled, no-show and completed reservations only', () => {
    expect([...NON_BLOCKING_STATUSES].sort()).toEqual(['CANCELLED', 'COMPLETED', 'NO_SHOW'])
  })
})

type Range = { gt?: Date; gte?: Date; lt?: Date; lte?: Date }
const inRange = (v: Date, r: Range = {}) =>
  (r.gt === undefined || v > r.gt) &&
  (r.gte === undefined || v >= r.gte) &&
  (r.lt === undefined || v < r.lt) &&
  (r.lte === undefined || v <= r.lte)

/**
 * In-memory stand-in for the two queries findBestTable() makes. It evaluates
 * the where-clauses as Prisma would (including every range operator), so the
 * overlap query itself is under test, not just the JS filtering after it.
 */
function fakeDb(tables: Table[], reservations: (ReservationSpan & { id: string; status: string })[]): Db {
  return {
    table: {
      findMany: async ({ where }: { where: { isActive: boolean; capacity: { gte: number }; minCapacity: { lte: number } } }) =>
        tables.filter(
          (t) =>
            t.isActive === where.isActive &&
            t.capacity >= where.capacity.gte &&
            t.minCapacity <= where.minCapacity.lte
        ),
    },
    reservation: {
      findMany: async ({
        where,
      }: {
        where: {
          tableId: { in: string[] }
          status: { notIn: string[] }
          startTime?: Range
          endTime?: Range
          id?: { not: string }
        }
      }) =>
        reservations
          .filter(
            (r) =>
              where.tableId.in.includes(r.tableId) &&
              !where.status.notIn.includes(r.status) &&
              inRange(r.startTime, where.startTime) &&
              inRange(r.endTime, where.endTime) &&
              (!where.id || r.id !== where.id.not)
          )
          .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
    },
  } as unknown as Db
}

describe('findBestTable()', () => {
  it('computes guest end time and freed-at time from party size', async () => {
    const res = await findBestTable({ guestCount: 3, startTime: at('18:00'), settings }, fakeDb([T4], []))
    expect(res).toMatchObject({ success: true, table: T4 })
    if (!res.success) throw new Error('unreachable')
    expect(res.endTime).toEqual(at('19:30')) // 3–4 guests: 90 min
    expect(res.tableFreedAt).toEqual(at('19:45')) // + 15 min buffer
  })

  it('finds a long reservation that started more than 4 hours earlier', async () => {
    // Regression: the old ±4h window only loaded reservations starting near
    // the new slot, so a 6-hour event starting at 12:00 was invisible at 17:00.
    const longEvent = { id: 'r1', tableId: 't6', status: 'CONFIRMED', startTime: at('12:00'), endTime: at('18:00') }
    const res = await findBestTable({ guestCount: 5, startTime: at('17:00'), settings }, fakeDb([T6], [longEvent]))
    expect(res).toEqual({ success: false, reason: 'ALL_TABLES_OCCUPIED' })
  })

  it('does not count cancelled, no-show or completed reservations', async () => {
    const freed = ['CANCELLED', 'NO_SHOW', 'COMPLETED'].map((status, i) => ({
      id: `r${i}`,
      tableId: 't2',
      status,
      startTime: at('18:00'),
      endTime: at('19:00'),
    }))
    const res = await findBestTable({ guestCount: 2, startTime: at('18:00'), settings }, fakeDb([T2], freed))
    expect(res).toMatchObject({ success: true, table: T2 })
  })

  it('counts seated and confirmed reservations', async () => {
    const seated = { id: 'r1', tableId: 't2', status: 'SEATED', startTime: at('18:00'), endTime: at('19:00') }
    const res = await findBestTable({ guestCount: 2, startTime: at('18:30'), settings }, fakeDb([T2], [seated]))
    expect(res).toEqual({ success: false, reason: 'ALL_TABLES_OCCUPIED' })
  })

  it('can exclude the reservation being edited', async () => {
    const self = { id: 'me', tableId: 't2', status: 'CONFIRMED', startTime: at('18:00'), endTime: at('19:00') }
    const res = await findBestTable(
      { guestCount: 2, startTime: at('18:00'), settings, excludeReservationId: 'me' },
      fakeDb([T2], [self])
    )
    expect(res).toMatchObject({ success: true, table: T2 })
  })
})
