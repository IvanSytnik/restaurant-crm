import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/api-route'
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

    // Same rule as POST, checked against the values after the update.
    if (data.capacity !== undefined || data.minCapacity !== undefined) {
      const current = await prisma.table.findUnique({
        where: { id },
        select: { capacity: true, minCapacity: true },
      })
      if (!current) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
      const capacity = data.capacity ?? current.capacity
      const minCapacity = data.minCapacity ?? current.minCapacity
      if (minCapacity > capacity) {
        return NextResponse.json({ error: 'MIN_GT_CAPACITY' }, { status: 400 })
      }
    }

    const updated = await prisma.table.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    return errorResponse(error, 'PATCH /api/tables/[id]', { uniqueCode: 'TABLE_NAME_TAKEN' })
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

  try {
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
  } catch (error) {
    return errorResponse(error, 'DELETE /api/tables/[id]', { uniqueCode: 'TABLE_NAME_TAKEN' })
  }
}
