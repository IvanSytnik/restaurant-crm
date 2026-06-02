import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const UpdateTableSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  capacity: z.number().int().min(1).max(20).optional(),
  minCapacity: z.number().int().min(1).max(20).optional(),
  zone: z.enum(['INDOOR', 'OUTDOOR', 'TERRACE', 'PRIVATE']).optional(),
  posX: z.number().min(0).max(100).optional(),
  posY: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const table = await prisma.table.findUnique({ where: { id } })
  if (!table) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(table)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const data = UpdateTableSchema.parse(await req.json())

    const updated = await prisma.table.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 422 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Запрещаем удаление если есть исторические брони — предлагаем деактивировать
  const reservationCount = await prisma.reservation.count({ where: { tableId: id } })
  if (reservationCount > 0) {
    return NextResponse.json(
      {
        error: `На этом столе есть ${reservationCount} ${reservationCount === 1 ? 'бронь' : 'бронирований'} в истории. Удаление невозможно. Деактивируйте стол вместо удаления.`,
        suggestion: 'deactivate',
      },
      { status: 409 }
    )
  }

  await prisma.table.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
