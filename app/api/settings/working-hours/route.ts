import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const daySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  openTime: z.string().regex(timeRegex, 'Expected HH:mm'),
  closeTime: z.string().regex(timeRegex, 'Expected HH:mm'),
  lastBookingTime: z.string().regex(timeRegex, 'Expected HH:mm'),
})

const patchSchema = z.array(daySchema).length(7)

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await prisma.workingHours.findMany({ orderBy: { dayOfWeek: 'asc' } })

  // Ensure all 7 days exist; fill missing with defaults (closed)
  const map = new Map(rows.map((r) => [r.dayOfWeek, r]))
  const full = Array.from({ length: 7 }, (_, day) => {
    const r = map.get(day)
    return {
      dayOfWeek: day,
      isOpen: r?.isOpen ?? false,
      openTime: r?.openTime ?? '11:00',
      closeTime: r?.closeTime ?? '23:00',
      lastBookingTime: r?.lastBookingTime ?? '21:30',
    }
  })

  return NextResponse.json(full)
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const days = parsed.data

  // Validate logical constraints for open days
  for (const d of days) {
    if (!d.isOpen) continue
    if (d.openTime >= d.closeTime) {
      return NextResponse.json(
        { error: 'INVALID_RANGE', dayOfWeek: d.dayOfWeek, message: 'Open time must be before close time' },
        { status: 400 }
      )
    }
    if (d.lastBookingTime < d.openTime || d.lastBookingTime > d.closeTime) {
      return NextResponse.json(
        { error: 'INVALID_LAST_BOOKING', dayOfWeek: d.dayOfWeek, message: 'Last booking must be within open hours' },
        { status: 400 }
      )
    }
  }

  await prisma.$transaction(
    days.map((d) =>
      prisma.workingHours.upsert({
        where: { dayOfWeek: d.dayOfWeek },
        create: d,
        update: {
          isOpen: d.isOpen,
          openTime: d.openTime,
          closeTime: d.closeTime,
          lastBookingTime: d.lastBookingTime,
        },
      })
    )
  )

  const fresh = await prisma.workingHours.findMany({ orderBy: { dayOfWeek: 'asc' } })
  return NextResponse.json(fresh)
}
