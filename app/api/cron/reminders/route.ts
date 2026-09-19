import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReminder } from '@/lib/email/send'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron endpoint — scheduled daily at 09:00 UTC via vercel.json.
 * Sends reminders for all reservations that:
 *  - start within REMINDER_HORIZON_HOURS from now (default 24)
 *  - haven't been reminded yet
 *  - status is CONFIRMED or SEATED
 *  - source is not WALKIN
 *
 * Security: requires `Authorization: Bearer <CRON_SECRET>` (Vercel sends this
 * header automatically for scheduled invocations once CRON_SECRET is set).
 * In production a missing CRON_SECRET is a misconfiguration, not a reason to
 * run unprotected — we refuse to send anything and return 500. In development
 * the secret is optional so the endpoint stays easy to exercise by hand.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[cron/reminders] CRON_SECRET is not set — refusing to run')
      return NextResponse.json({ error: 'Cron is not configured' }, { status: 500 })
    }
  } else {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const horizonHours = parseInt(process.env.REMINDER_HORIZON_HOURS || '24', 10)
  const upper = new Date(now.getTime() + horizonHours * 60 * 60 * 1000)

  const candidates = await prisma.reservation.findMany({
    where: {
      reminderSentAt: null,
      status: { in: ['CONFIRMED', 'SEATED'] },
      source: { not: 'WALKIN' },
      startTime: { gte: now, lte: upper },
      guestEmail: { not: '' },
    },
    select: { id: true, guestEmail: true, startTime: true },
    orderBy: { startTime: 'asc' },
    take: 200,
  })

  const results: { id: string; ok: boolean; reason?: string }[] = []
  for (const c of candidates) {
    const res = await sendReminder(c.id)
    results.push({ id: c.id, ...res })
    // small delay to be nice to Resend rate limits
    await new Promise((r) => setTimeout(r, 100))
  }

  const sent = results.filter((r) => r.ok).length
  const skipped = results.length - sent

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    sent,
    skipped,
    horizonHours,
    results,
  })
}
