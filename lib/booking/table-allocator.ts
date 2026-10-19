import { prisma } from '@/lib/prisma'
import type { Db } from './lock'
import { getTableOccupiedDuration } from './duration'
import type { BookingSettings } from './settings'
import type { ReservationStatus, Table } from '@prisma/client'

/**
 * Reservations in these states no longer hold their table. COMPLETED is here
 * because staff mark a table completed when the guests leave — from then on
 * the table is free, even if the planned end time has not passed yet.
 * Every conflict check (allocator, walk-in, edits, availability, floor plan)
 * uses this one list.
 */
export const NON_BLOCKING_STATUSES: ReservationStatus[] = ['CANCELLED', 'NO_SHOW', 'COMPLETED']

export interface AllocationInput {
  guestCount: number
  startTime: Date
  settings: BookingSettings
  excludeReservationId?: string
}

export interface AllocationResult {
  success: true
  table: Table
  endTime: Date
  tableFreedAt: Date
}

export interface AllocationFailure {
  success: false
  reason: 'NO_SUITABLE_TABLE' | 'ALL_TABLES_OCCUPIED'
}

export type ReservationSpan = { tableId: string; startTime: Date; endTime: Date }

/**
 * Does an existing reservation block a new one that occupies the table from
 * `start` until `freedAt` (guest time + buffer)? The existing reservation
 * occupies its table until its own endTime + buffer. Touching intervals do
 * not overlap: a slot may start exactly when the previous one is freed.
 */
export function blocks(
  existing: { startTime: Date; endTime: Date },
  start: Date,
  freedAt: Date,
  bufferMinutes: number
): boolean {
  const existingFreedAt = existing.endTime.getTime() + bufferMinutes * 60_000
  return start.getTime() < existingFreedAt && freedAt.getTime() > existing.startTime.getTime()
}

/**
 * Best fit: among active tables whose [minCapacity, capacity] range contains
 * the party size, pick the smallest (then by name) that has no blocking
 * reservation. Pure — the caller supplies tables and nearby reservations.
 */
export function selectBestTable(
  tables: Table[],
  reservations: ReservationSpan[],
  input: { guestCount: number; start: Date; freedAt: Date; bufferMinutes: number }
): Table | 'NO_SUITABLE_TABLE' | 'ALL_TABLES_OCCUPIED' {
  const suitable = tables
    .filter(
      (t) => t.isActive && t.capacity >= input.guestCount && t.minCapacity <= input.guestCount
    )
    .sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name))

  if (suitable.length === 0) return 'NO_SUITABLE_TABLE'

  for (const table of suitable) {
    const busy = reservations.some(
      (r) =>
        r.tableId === table.id && blocks(r, input.start, input.freedAt, input.bufferMinutes)
    )
    if (!busy) return table
  }
  return 'ALL_TABLES_OCCUPIED'
}

/**
 * Loads reservations on the given tables that block [start, freedAt).
 * The query is the overlap condition itself, so reservations of any length
 * are found (no fixed look-back window).
 */
export async function findTableConflicts(
  db: Db,
  args: {
    tableIds: string[]
    start: Date
    freedAt: Date
    bufferMinutes: number
    excludeReservationId?: string
  }
): Promise<ReservationSpan[]> {
  const rows = await db.reservation.findMany({
    where: {
      tableId: { in: args.tableIds },
      status: { notIn: NON_BLOCKING_STATUSES },
      startTime: { lt: args.freedAt },
      endTime: { gt: new Date(args.start.getTime() - args.bufferMinutes * 60_000) },
      ...(args.excludeReservationId && { id: { not: args.excludeReservationId } }),
    },
    select: { tableId: true, startTime: true, endTime: true },
    orderBy: { startTime: 'asc' },
  })
  return rows.filter((r) => blocks(r, args.start, args.freedAt, args.bufferMinutes))
}

/**
 * Pass the transaction client from withBookingLock() when the result is going
 * to be written; the default client is only fine for read-only previews.
 */
export async function findBestTable(
  input: AllocationInput,
  db: Db = prisma
): Promise<AllocationResult | AllocationFailure> {
  const { guestCount, startTime, settings, excludeReservationId } = input

  const occupiedMinutes = getTableOccupiedDuration(guestCount, settings)
  const tableFreedAt = new Date(startTime.getTime() + occupiedMinutes * 60_000)
  const guestMinutes = occupiedMinutes - settings.buffer_minutes
  const endTime = new Date(startTime.getTime() + guestMinutes * 60_000)

  const tables = await db.table.findMany({
    where: {
      isActive: true,
      capacity: { gte: guestCount },
      minCapacity: { lte: guestCount },
    },
  })

  if (tables.length === 0) {
    return { success: false, reason: 'NO_SUITABLE_TABLE' }
  }

  const conflicts = await findTableConflicts(db, {
    tableIds: tables.map((t) => t.id),
    start: startTime,
    freedAt: tableFreedAt,
    bufferMinutes: settings.buffer_minutes,
    excludeReservationId,
  })

  const picked = selectBestTable(tables, conflicts, {
    guestCount,
    start: startTime,
    freedAt: tableFreedAt,
    bufferMinutes: settings.buffer_minutes,
  })

  if (typeof picked === 'string') return { success: false, reason: picked }
  return { success: true, table: picked, endTime, tableFreedAt }
}
