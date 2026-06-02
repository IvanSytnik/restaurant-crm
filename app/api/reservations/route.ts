import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { findBestTable } from '@/lib/booking/table-allocator'
import { getBookingSettings } from '@/lib/booking/settings'

const CreateReservationSchema = z.object({
  guestName: z.string().min(2).max(100),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(6).max(20),
  guestCount: z.number().int().min(1).max(10),
  startTime: z.string().datetime(),
  comment: z.string().max(500).optional(),
  source: z.enum(['WEBSITE', 'PHONE', 'WALKIN', 'ADMIN']).default('WEBSITE'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = CreateReservationSchema.parse(body)

    const settings = await getBookingSettings()
    const startTime = new Date(data.startTime)

    if (startTime < new Date()) {
      return NextResponse.json(
        { error: 'Невозможно забронировать на прошедшее время' },
        { status: 400 }
      )
    }

    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + settings.booking_horizon)
    if (startTime > maxDate) {
      return NextResponse.json(
        { error: `Бронирование возможно не более чем на ${settings.booking_horizon} дней вперёд` },
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
        { error: 'На выбранное время нет свободных столов', reason: allocation.reason },
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
        date: dateOnly,
        startTime,
        endTime: allocation.endTime,
        source: data.source,
        status: 'CONFIRMED',
        tableId: allocation.table.id,
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
    console.error('[POST /api/reservations]', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
