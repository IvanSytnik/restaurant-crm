import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findBestTable } from '@/lib/booking/table-allocator'
import { withBookingLock } from '@/lib/booking/lock'
import { viennaDateColumn } from '@/lib/public/vienna-time'
import { MAX_PARTY_SIZE } from '@/lib/settings-booking'
import { getBookingSettings } from '@/lib/booking/settings'
import { sendConfirmation } from '@/lib/email/send'

/**
 * Admin-only booking endpoint. Any logged-in role (OWNER/MANAGER/STAFF) may
 * create a reservation on a guest's behalf.
 *
 * `source` deliberately excludes WEBSITE: bookings made by a guest go through
 * the unauthenticated /api/public/reservations, which forces source=WEBSITE
 * and carries its own rate limit / honeypot / min-fill-time defenses.
 */
const CreateReservationSchema = z.object({
  guestName: z.string().min(2).max(100),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(6).max(20),
  guestCount: z.number().int().min(1).max(MAX_PARTY_SIZE),
  startTime: z.string().datetime(),
  comment: z.string().max(500).optional(),
  source: z.enum(['PHONE', 'WALKIN', 'ADMIN']).default('ADMIN'),
  locale: z.enum(['de', 'en', 'uk']).default('de'),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = CreateReservationSchema.parse(body)

    const settings = await getBookingSettings()
    const startTime = new Date(data.startTime)

    if (startTime < new Date()) {
      return NextResponse.json({ error: 'PAST_TIME' }, { status: 400 })
    }

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + settings.booking_horizon)
    if (startTime > maxDate) {
      return NextResponse.json(
        { error: 'BEYOND_HORIZON', params: { days: settings.booking_horizon } },
        { status: 400 }
      )
    }

    const dateOnly = viennaDateColumn(startTime)

    // Same lock as the public endpoint: allocation and insert are atomic.
    const outcome = await withBookingLock(async (tx) => {
      const allocation = await findBestTable(
        { guestCount: data.guestCount, startTime, settings },
        tx
      )
      if (!allocation.success) return allocation

      const reservation = await tx.reservation.create({
        data: {
          guestName: data.guestName,
          guestEmail: data.guestEmail,
          guestPhone: data.guestPhone,
          guestCount: data.guestCount,
          comment: data.comment,
          locale: data.locale,
          date: dateOnly,
          startTime,
          endTime: allocation.endTime,
          source: data.source,
          status: 'CONFIRMED',
          tableId: allocation.table.id,
          // Authorship comes from the session only — the schema above does not
          // accept createdById, so a value in the request body is discarded.
          createdById: session.user.id,
        },
        include: { table: true },
      })
      return { success: true as const, reservation }
    })

    if (!outcome.success) {
      return NextResponse.json(
        { error: 'NO_TABLE_AVAILABLE', reason: outcome.reason },
        { status: 409 }
      )
    }
    const { reservation } = outcome

    // Confirmation email after the response is sent. after() keeps the
    // function alive until it finishes; a bare un-awaited promise can be
    // frozen on Vercel. Skipped automatically for WALKIN, @phone.local, etc.
    after(() =>
      sendConfirmation(reservation.id).catch((err) => {
        console.error('[reservations] confirmation send error', err)
      })
    )

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 422 }
      )
    }
    console.error('[POST /api/reservations]', error)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
