import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BOOKING_KEYS, BOOKING_LIMITS, getBookingSettingsRaw, type BookingKey } from '@/lib/settings-booking'

export const dynamic = 'force-dynamic'

const KEY_SET = new Set<string>(BOOKING_KEYS)

const patchSchema = z.record(z.string(), z.number().int())

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data = await getBookingSettingsRaw()
  return NextResponse.json(data)
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

  const updates = parsed.data

  // Validate each known key is within its allowed range
  for (const [key, value] of Object.entries(updates)) {
    if (!KEY_SET.has(key)) continue
    const limits = BOOKING_LIMITS[key as BookingKey]
    if (value < limits.min || value > limits.max) {
      return NextResponse.json(
        { error: 'OUT_OF_RANGE', key, min: limits.min, max: limits.max },
        { status: 400 }
      )
    }
  }

  // Cross-field check: min_guests <= max_guests
  const current = await getBookingSettingsRaw()
  const merged = { ...current, ...updates } as Record<BookingKey, number>
  if (merged.min_guests > merged.max_guests) {
    return NextResponse.json({ error: 'MIN_GT_MAX' }, { status: 400 })
  }

  const ops = []
  for (const [key, value] of Object.entries(updates)) {
    if (!KEY_SET.has(key)) continue
    ops.push(
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    )
  }

  await prisma.$transaction(ops)
  const fresh = await getBookingSettingsRaw()
  return NextResponse.json(fresh)
}
