import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBookingSettings } from '@/lib/booking/settings'
import { formatViennaDate, formatViennaTime } from '@/lib/public/vienna-time'

/**
 * POST /api/reservations/walkin
 *
 * Seats a guest who arrived without a booking: creates a reservation that is
 * already SEATED, starting now, on one specific table chosen by the staff
 * member. Because the table is picked in the UI there is nothing to allocate,
 * so findBestTable() does not apply — but the overlap rule below is the same
 * predicate checkTableConflict() uses in lib/booking/table-allocator.ts.
 *
 * No email is ever sent: source is WALKIN and the address is a placeholder,
 * either of which already makes lib/email/send.ts skip the reservation.
 *
 * Errors keep the { error } shape of the neighbouring routes, but `error` is
 * a stable code rather than prose, with the variable parts in `params`. The
 * admin panel is multilingual, and this endpoint's failures are shown to the
 * user verbatim, so the wording has to come from messages/*.json — see
 * floorPlan.modal.errors.* and components/admin/TableModal.tsx.
 */

// The UI offers exactly these four durations (components/admin/TableModal.tsx).
const DURATIONS = [60, 90, 120, 150] as const

const WalkinSchema = z.object({
  tableId: z.string().min(1),
  guestName: z.string().max(100).optional(),
  guestCount: z.number().int().min(1).max(20),
  durationMinutes: z.union([
    z.literal(DURATIONS[0]),
    z.literal(DURATIONS[1]),
    z.literal(DURATIONS[2]),
    z.literal(DURATIONS[3]),
  ]),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = WalkinSchema.parse(await req.json())

    const table = await prisma.table.findUnique({ where: { id: data.tableId } })
    if (!table) {
      return NextResponse.json({ error: 'TABLE_NOT_FOUND' }, { status: 404 })
    }
    if (!table.isActive) {
      return NextResponse.json({ error: 'TABLE_INACTIVE' }, { status: 409 })
    }
    if (data.guestCount > table.capacity) {
      return NextResponse.json(
        { error: 'CAPACITY_EXCEEDED', params: { max: table.capacity } },
        { status: 400 }
      )
    }

    const settings = await getBookingSettings()
    const startTime = new Date()
    const endTime = new Date(startTime.getTime() + data.durationMinutes * 60_000)
    const tableFreedAt = new Date(endTime.getTime() + settings.buffer_minutes * 60_000)

    // Same 4h neighbourhood and overlap formula as the allocator's private
    // checkTableConflict(), but narrowed to this one table. COMPLETED is
    // excluded as well: a finished visit no longer blocks the table, which is
    // also how /api/floor-status decides a table is free.
    const windowStart = new Date(startTime.getTime() - 4 * 60 * 60 * 1000)
    const windowEnd = new Date(tableFreedAt.getTime() + 4 * 60 * 60 * 1000)

    const neighbours = await prisma.reservation.findMany({
      where: {
        tableId: table.id,
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        startTime: { gte: windowStart, lte: windowEnd },
      },
      select: { startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    })

    const conflict = neighbours.find((r) => {
      const resFreedAt = new Date(r.endTime.getTime() + settings.buffer_minutes * 60_000)
      return startTime < resFreedAt && tableFreedAt > r.startTime
    })

    if (conflict) {
      const body =
        conflict.startTime <= startTime
          ? {
              error: 'TABLE_BUSY_UNTIL',
              params: { time: formatViennaTime(conflict.endTime) },
            }
          : {
              error: 'NEXT_RESERVATION',
              params: {
                time: formatViennaTime(conflict.startTime),
                minutes: Math.round(
                  (conflict.startTime.getTime() - startTime.getTime()) / 60_000
                ),
              },
            }
      return NextResponse.json(body, { status: 409 })
    }

    // Calendar day in Vienna, materialised as UTC midnight for the @db.Date
    // column. Never use setHours() here — that would resolve in the server's
    // local timezone (UTC on Vercel) and misfile late-evening walk-ins.
    const dateOnly = new Date(`${formatViennaDate(startTime)}T00:00:00.000Z`)

    const reservation = await prisma.reservation.create({
      data: {
        guestName: data.guestName?.trim() || 'Walk-in',
        // Placeholder contacts — same @phone.local convention the admin
        // booking form uses when a guest leaves no email (isRealGuestEmail()
        // in lib/email/send.ts treats these as non-deliverable). '-' is the
        // no-phone marker TableModal already renders as "no phone".
        guestEmail: 'walkin@phone.local',
        guestPhone: '-',
        guestCount: data.guestCount,
        date: dateOnly,
        startTime,
        endTime,
        source: 'WALKIN',
        status: 'SEATED',
        tableId: table.id,
        createdById: session.user.id,
      },
      include: { table: true },
    })

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: error.errors },
        { status: 422 }
      )
    }
    console.error('[POST /api/reservations/walkin]', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
