import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendReminder } from '@/lib/email/send'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Cron endpoint — runs daily on Hobby plan, hourly on Pro.
 * Sends reminders for all reservations that:
 *  - start in the next 24 hours (Hobby) / next ~3h (with hourly cron)
 *  - haven't been reminded yet
 *  - status is CONFIRMED or SEATED
 *  - source is not WALKIN
 *
 * Security: protected by CRON_SECRET header (Vercel sets it automatically when configured).
 */
export async function GET(request: Request) {
  // Vercel sends Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
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
