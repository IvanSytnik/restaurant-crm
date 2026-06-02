import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBookingSettings } from '@/lib/booking/settings'
import { calculateBookingTimes } from '@/lib/booking/duration'

const WalkinSchema = z.object({
  tableId: z.string(),
  guestName: z.string().optional(),
  guestCount: z.number().int().min(1).max(10),
  durationMinutes: z.number().int().min(15).max(300).optional(),
})

/**
 * POST /api/reservations/walkin
 *
 * Быстрая посадка гостя без брони:
 *  - сразу создаёт бронь со статусом SEATED
 *  - startTime = сейчас
 *  - source = WALKIN
 *  - длительность из настроек или из параметра
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = WalkinSchema.parse(await req.json())
    const settings = await getBookingSettings()

    const table = await prisma.table.findUnique({ where: { id: data.tableId } })
    if (!table || !table.isActive) {
      return NextResponse.json({ error: 'Стол недоступен' }, { status: 404 })
    }

    if (data.guestCount > table.capacity || data.guestCount < table.minCapacity) {
      return NextResponse.json(
        { error: `Стол на ${table.minCapacity}–${table.capacity} гостей` },
        { status: 400 }
      )
    }

    const startTime = new Date()

    // Если передана кастомная длительность — используем её
    let endTime: Date
    if (data.durationMinutes) {
      endTime = new Date(startTime.getTime() + data.durationMinutes * 60_000)
    } else {
      const times = calculateBookingTimes(startTime, data.guestCount, settings)
      endTime = times.endTime
    }

    // Проверка: нет ли конфликта с следующей бронью
    const tableFreedAt = new Date(endTime.getTime() + settings.buffer_minutes * 60_000)
    const conflict = await prisma.reservation.findFirst({
      where: {
        tableId: data.tableId,
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
        startTime: { gte: startTime, lt: tableFreedAt },
      },
      orderBy: { startTime: 'asc' },
    })

    if (conflict) {
      const conflictTime = conflict.startTime.toLocaleTimeString('de-AT', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return NextResponse.json(
        { error: `На этот стол есть бронь в ${conflictTime}. Уменьшите длительность.` },
        { status: 409 }
      )
    }

    const dateOnly = new Date(startTime)
    dateOnly.setHours(0, 0, 0, 0)

    const reservation = await prisma.reservation.create({
      data: {
        guestName: data.guestName || 'Walk-in',
        guestEmail: 'walkin@phone.local',
        guestPhone: '-',
        guestCount: data.guestCount,
        date: dateOnly,
        startTime,
        endTime,
        source: 'WALKIN',
        status: 'SEATED',
        tableId: data.tableId,
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
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
