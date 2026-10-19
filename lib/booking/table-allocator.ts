import { prisma } from '@/lib/prisma'
import type { Db } from './lock'
import { getTableOccupiedDuration } from './duration'
import type { BookingSettings } from './settings'
import type { Table } from '@prisma/client'

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

  const suitableTables = await db.table.findMany({
    where: {
      isActive: true,
      capacity: { gte: guestCount },
      minCapacity: { lte: guestCount },
    },
    orderBy: [{ capacity: 'asc' }, { name: 'asc' }],
  })

  if (suitableTables.length === 0) {
    return { success: false, reason: 'NO_SUITABLE_TABLE' }
  }

  for (const table of suitableTables) {
    const hasConflict = await checkTableConflict(db, {
      tableId: table.id,
      startTime,
      tableFreedAt,
      bufferMinutes: settings.buffer_minutes,
      excludeReservationId,
    })

    if (!hasConflict) {
      return { success: true, table, endTime, tableFreedAt }
    }
  }

  return { success: false, reason: 'ALL_TABLES_OCCUPIED' }
}

async function checkTableConflict(db: Db, {
  tableId,
  startTime,
  tableFreedAt,
  bufferMinutes,
  excludeReservationId,
}: {
  tableId: string
  startTime: Date
  tableFreedAt: Date
  bufferMinutes: number
  excludeReservationId?: string
}): Promise<boolean> {
  // Загружаем брони этого стола в окрестности нового слота
  const windowStart = new Date(startTime.getTime() - 4 * 60 * 60 * 1000)
  const windowEnd = new Date(tableFreedAt.getTime() + 4 * 60 * 60 * 1000)

  const reservations = await db.reservation.findMany({
    where: {
      tableId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      startTime: { gte: windowStart, lte: windowEnd },
      ...(excludeReservationId && { id: { not: excludeReservationId } }),
    },
    select: { startTime: true, endTime: true },
  })

  for (const res of reservations) {
    const resFreedAt = new Date(res.endTime.getTime() + bufferMinutes * 60_000)
    const overlaps = startTime < resFreedAt && tableFreedAt > res.startTime
    if (overlaps) return true
  }

  return false
}
