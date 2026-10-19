import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCancellation } from '@/lib/email/send'
import { getBookingSettings } from '@/lib/booking/settings'
import { withBookingLock } from '@/lib/booking/lock'
import { NON_BLOCKING_STATUSES, findTableConflicts } from '@/lib/booking/table-allocator'
import type { ReservationStatus } from '@prisma/client'

// PENDING stays in the Prisma enum for existing rows, but reservations are
// auto-confirmed, so nothing may move a reservation into it.
const UpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  internalNote: z.string().max(1000).optional(),
  tableId: z.string().min(1).optional(),
})

class RouteError extends Error {
  constructor(
    public code: string,
    public status: number,
    public params?: Record<string, string | number>
  ) {
    super(code)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const { id } = await params
    const data = UpdateSchema.parse(await req.json())

    const existing = await prisma.reservation.findUnique({
      where: { id },
      select: { status: true, tableId: true, startTime: true, endTime: true, guestCount: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    const isBlocking = (s: ReservationStatus) => !NON_BLOCKING_STATUSES.includes(s)
    const movesTable = data.tableId !== undefined && data.tableId !== existing.tableId
    const reactivates =
      data.status !== undefined && !isBlocking(existing.status) && isBlocking(data.status)
    const finalStatus = data.status ?? existing.status

    let updated
    if ((movesTable || reactivates) && isBlocking(finalStatus)) {
      // The reservation will occupy a table it did not hold a moment ago:
      // same conflict rule and lock as a new booking.
      const settings = await getBookingSettings()
      updated = await withBookingLock(async (tx) => {
        const tableId = data.tableId ?? existing.tableId
        if (movesTable) {
          const table = await tx.table.findUnique({ where: { id: tableId } })
          if (!table) throw new RouteError('TABLE_NOT_FOUND', 404)
          if (!table.isActive) throw new RouteError('TABLE_INACTIVE', 409)
          if (existing.guestCount > table.capacity) {
            throw new RouteError('CAPACITY_EXCEEDED', 400, { max: table.capacity })
          }
        }
        const conflicts = await findTableConflicts(tx, {
          tableIds: [tableId],
          start: existing.startTime,
          freedAt: new Date(existing.endTime.getTime() + settings.buffer_minutes * 60_000),
          bufferMinutes: settings.buffer_minutes,
          excludeReservationId: id,
        })
        if (conflicts.length > 0) throw new RouteError('TABLE_BUSY', 409)

        return tx.reservation.update({ where: { id }, data, include: { table: true } })
      })
    } else {
      updated = await prisma.reservation.update({
        where: { id },
        data,
        include: { table: true },
      })
    }

    // If status just changed to CANCELLED, notify the guest after responding
    if (updated.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      const reservationId = updated.id
      after(() =>
        sendCancellation(reservationId).catch((err) => {
          console.error('[reservations] cancellation send error', err)
        })
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: error.code, ...(error.params && { params: error.params }) },
        { status: error.status }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 })
    }
    console.error(error)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params
  await prisma.reservation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
