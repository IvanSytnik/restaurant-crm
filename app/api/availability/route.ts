import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getBookingSettings, type BookingSettings } from '@/lib/booking/settings'
import { getTableOccupiedDuration } from '@/lib/booking/duration'

const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestCount: z.coerce.number().int().min(1).max(10),
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = QuerySchema.parse({
      date: searchParams.get('date'),
      guestCount: searchParams.get('guestCount'),
    })

    const settings = await getBookingSettings()
    const slots = await getAvailableSlots(query.date, query.guestCount, settings)

    return NextResponse.json({ slots })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Некорректные параметры', details: error.errors },
        { status: 422 }
      )
    }
    console.error('[GET /api/availability]', error)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}

async function getAvailableSlots(
  dateStr: string,
  guestCount: number,
  settings: BookingSettings
): Promise<string[]> {
  const date = new Date(`${dateStr}T12:00:00`)
  const dayOfWeek = date.getDay()

  const workingHours = await prisma.workingHours.findUnique({ where: { dayOfWeek } })
  if (!workingHours || !workingHours.isOpen) return []

  const allSlots = generateTimeSlots(
    dateStr,
    workingHours.openTime,
    workingHours.lastBookingTime,
    15
  )

  const now = new Date()
  const isToday = dateStr === formatLocalDate(now)
  const futureSlots = isToday ? allSlots.filter((s) => s > now) : allSlots
  if (futureSlots.length === 0) return []

  const suitableTables = await prisma.table.findMany({
    where: {
      isActive: true,
      capacity: { gte: guestCount },
      minCapacity: { lte: guestCount },
    },
    select: { id: true },
  })

  if (suitableTables.length === 0) return []
  const tableIds = suitableTables.map((t) => t.id)

  const dayStart = new Date(`${dateStr}T00:00:00`)
  const dayEnd = new Date(`${dateStr}T23:59:59`)

  const existingReservations = await prisma.reservation.findMany({
    where: {
      tableId: { in: tableIds },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { tableId: true, startTime: true, endTime: true },
  })

  const occupiedMinutes = getTableOccupiedDuration(guestCount, settings)
  const availableSlots: string[] = []

  for (const slotStart of futureSlots) {
    const slotFreedAt = new Date(slotStart.getTime() + occupiedMinutes * 60_000)
    const occupiedTableIds = new Set<string>()

    for (const res of existingReservations) {
      const resFreedAt = new Date(
        res.endTime.getTime() + settings.buffer_minutes * 60_000
      )
      const overlaps = slotStart < resFreedAt && slotFreedAt > res.startTime
      if (overlaps) occupiedTableIds.add(res.tableId)
    }

    const hasFreeTable = tableIds.some((id) => !occupiedTableIds.has(id))
    if (hasFreeTable) {
      availableSlots.push(formatTime(slotStart))
    }
  }

  return availableSlots
}

function generateTimeSlots(
  dateStr: string,
  startTimeStr: string,
  lastSlotStr: string,
  stepMinutes: number
): Date[] {
  const slots: Date[] = []
  const current = new Date(`${dateStr}T${startTimeStr}:00`)
  const lastSlot = new Date(`${dateStr}T${lastSlotStr}:00`)

  while (current <= lastSlot) {
    slots.push(new Date(current))
    current.setMinutes(current.getMinutes() + stepMinutes)
  }
  return slots
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
