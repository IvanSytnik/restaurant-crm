import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MAX_PARTY_SIZE } from '@/lib/settings-booking'

const UpdateTableSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  capacity: z.number().int().min(1).max(MAX_PARTY_SIZE).optional(),
  minCapacity: z.number().int().min(1).max(MAX_PARTY_SIZE).optional(),
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
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const { id } = await params
  const table = await prisma.table.findUnique({ where: { id } })
  if (!table) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json(table)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const { id } = await params
    const data = UpdateTableSchema.parse(await req.json())

    const updated = await prisma.table.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 })
    }
    console.error(error)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const { id } = await params

  // Запрещаем удаление если есть исторические брони — предлагаем деактивировать
  const reservationCount = await prisma.reservation.count({ where: { tableId: id } })
  if (reservationCount > 0) {
    return NextResponse.json(
      {
        error: 'TABLE_HAS_RESERVATIONS',
        params: { count: reservationCount },
        suggestion: 'deactivate',
      },
      { status: 409 }
    )
  }

  await prisma.table.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
