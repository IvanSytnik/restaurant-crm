import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { findBestTable } from '@/lib/booking/table-allocator'
import { getBookingSettings } from '@/lib/booking/settings'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendConfirmation } from '@/lib/email/send'

/**
 * Public booking endpoint — no auth.
 *
 * Defenses:
 *  1) Rate limit: 5 requests / 10 min / IP (per Vercel instance, best-effort).
 *  2) Honeypot: hidden field `website` must be empty. If filled — silent ok.
 *  3) Min fill time: at least 3 seconds between form mount and submit.
 *  4) Zod validation, business rules (guest count, horizon, past time).
 *  5) Source forced to WEBSITE, status forced to CONFIRMED.
 *
 * Side effects:
 *  - On successful create, fires sendConfirmation in the background.
 *    Email failures (e.g. unverified Resend domain rejecting gmail) do NOT
 *    affect the response — the guest sees success regardless.
 */

const BookingSchema = z.object({
  guestName: z.string().min(2).max(100),
  guestEmail: z.string().email().max(200),
  guestPhone: z
    .string()
    .min(6)
    .max(20)
    .regex(/^[+\d\s\-()]+$/, 'Invalid phone'),
  guestCount: z.number().int().min(1).max(20),
  startTime: z.string().datetime(),
  comment: z.string().max(500).optional(),
  locale: z.enum(['de', 'en', 'uk']).default('de'),
  // Honeypot — must be empty
  website: z.string().max(0).optional(),
  // Anti-bot delay check (client timestamp in ms)
  mountedAt: z.number().int().positive(),
})

const MIN_FILL_TIME_MS = 3000

export async function POST(req: NextRequest) {
  try {
    // 1) Rate limit
    const ip = getClientIp(req)
    const rl = rateLimit(`booking:${ip}`, 5, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'TOO_MANY_REQUESTS' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await req.json()
    const data = BookingSchema.parse(body)

    // 2) Honeypot — silently accept (return fake success so bots don't retry).
    //    We don't actually create a reservation.
    if (data.website && data.website.length > 0) {
      return NextResponse.json({ id: 'noop' }, { status: 200 })
    }

    // 3) Min fill time
    if (Date.now() - data.mountedAt < MIN_FILL_TIME_MS) {
      return NextResponse.json({ error: 'TOO_FAST' }, { status: 400 })
    }

    const settings = await getBookingSettings()

    // 4) Business rules
    if (data.guestCount < settings.min_guests || data.guestCount > settings.max_guests) {
      return NextResponse.json(
        {
          error: 'GUEST_COUNT_OUT_OF_RANGE',
          min: settings.min_guests,
          max: settings.max_guests,
        },
        { status: 400 }
      )
    }

    const startTime = new Date(data.startTime)
    if (startTime < new Date()) {
      return NextResponse.json({ error: 'PAST_TIME' }, { status: 400 })
    }

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + settings.booking_horizon)
    if (startTime > maxDate) {
      return NextResponse.json(
        { error: 'BEYOND_HORIZON', horizon: settings.booking_horizon },
        { status: 400 }
      )
    }

    const allocation = await findBestTable({
      guestCount: data.guestCount,
      startTime,
      settings,
    })

    if (!allocation.success) {
      return NextResponse.json(
        { error: 'NO_TABLE_AVAILABLE', reason: allocation.reason },
        { status: 409 }
      )
    }

    const dateOnly = new Date(startTime)
    dateOnly.setHours(0, 0, 0, 0)

    const reservation = await prisma.reservation.create({
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
        source: 'WEBSITE',
        status: 'CONFIRMED',
        tableId: allocation.table.id,
      },
    })

    // Fire-and-forget confirmation email.
    // sendConfirmation already handles known failure modes gracefully
    // (returns { ok: false, reason }), but we still catch unexpected exceptions
    // so they cannot break the HTTP response to the guest.
    sendConfirmation(reservation.id).catch((err) => {
      console.error('[public/reservations] sendConfirmation threw', err)
    })

    return NextResponse.json({ id: reservation.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 422 }
      )
    }
    console.error('[POST /api/public/reservations]', error)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}
