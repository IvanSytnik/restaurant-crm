import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBookingSettings } from '@/lib/booking/settings'

/**
 * GET /api/floor-status
 *
 * Возвращает все столы с их текущим статусом и брони на сегодня.
 *
 * Статусы:
 *   FREE        — сейчас никого и ближайшие 30 минут чисто
 *   SOON        — бронь начнётся в ближайшие 30 минут
 *   OCCUPIED    — сейчас идёт бронь (по времени или статус SEATED)
 *   INACTIVE    — стол выключен
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const soonThreshold = new Date(now.getTime() + 30 * 60_000) // +30 мин
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now)
  dayEnd.setHours(23, 59, 59, 999)

  const settings = await getBookingSettings()

  const [tables, todayReservations] = await Promise.all([
    prisma.table.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.reservation.findMany({
      where: {
        startTime: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] },
      },
      orderBy: { startTime: 'asc' },
    }),
  ])

  const result = tables.map((table) => {
    if (!table.isActive) {
      return { ...table, status: 'INACTIVE' as const, currentReservation: null, upcomingReservations: [] }
    }

    const tableReservations = todayReservations.filter((r) => r.tableId === table.id)

    // Текущая (сейчас идёт)
    const current = tableReservations.find((r) => {
      const freedAt = new Date(r.endTime.getTime() + settings.buffer_minutes * 60_000)
      const isInTimeWindow = r.startTime <= now && now < freedAt
      const isSeated = r.status === 'SEATED'
      return isInTimeWindow || isSeated
    })

    // Скоро (в ближайшие 30 минут)
    const soon = !current
      ? tableReservations.find((r) => r.startTime > now && r.startTime <= soonThreshold)
      : null

    // Все будущие на сегодня
    const upcoming = tableReservations
      .filter((r) => r.startTime > now && r.id !== soon?.id)
      .slice(0, 3)

    let status: 'FREE' | 'SOON' | 'OCCUPIED' | 'INACTIVE'
    if (current) status = 'OCCUPIED'
    else if (soon) status = 'SOON'
    else status = 'FREE'

    return {
      ...table,
      status,
      currentReservation: current || null,
      soonReservation: soon || null,
      upcomingReservations: upcoming,
    }
  })

  return NextResponse.json({ tables: result, settings })
}
