import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendCancellation } from '@/lib/email/send'

const UpdateSchema = z.object({
  status: z
    .enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .optional(),
  internalNote: z.string().max(1000).optional(),
  tableId: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const data = UpdateSchema.parse(await req.json())

    // Read previous state so we can detect status transitions
    const existing = await prisma.reservation.findUnique({
      where: { id },
      select: { status: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data,
      include: { table: true },
    })

    // If status just changed to CANCELLED, notify guest (fire-and-forget)
    if (updated.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      sendCancellation(updated.id).catch((err) => {
        console.error('[reservations] cancellation send error', err)
      })
    }

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
  await prisma.reservation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
