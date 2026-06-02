import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const UpdateSchema = z.object({
  titleDE: z.string().min(1).max(150).optional(),
  titleEN: z.string().max(150).optional().nullable(),
  titleUK: z.string().max(150).optional().nullable(),
  descriptionDE: z.string().max(2000).optional().nullable(),
  descriptionEN: z.string().max(2000).optional().nullable(),
  descriptionUK: z.string().max(2000).optional().nullable(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  startTime: z.string().regex(TIME_REGEX).optional().nullable().or(z.literal('')),
  endTime: z.string().regex(TIME_REGEX).optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
  isArchived: z.boolean().optional(),
})

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
    const data = UpdateSchema.parse(await req.json())

    const updateData: Record<string, unknown> = { ...data }

    if ('imageUrl' in updateData) {
      updateData.imageUrl =
        updateData.imageUrl && (updateData.imageUrl as string).trim() !== ''
          ? updateData.imageUrl
          : null
    }
    if ('startDate' in updateData && typeof updateData.startDate === 'string') {
      updateData.startDate = new Date(updateData.startDate)
    }
    if ('endDate' in updateData && typeof updateData.endDate === 'string') {
      updateData.endDate = new Date(updateData.endDate)
    }
    if ('startTime' in updateData) {
      updateData.startTime = updateData.startTime && updateData.startTime !== '' ? updateData.startTime : null
    }
    if ('endTime' in updateData) {
      updateData.endTime = updateData.endTime && updateData.endTime !== '' ? updateData.endTime : null
    }

    const updated = await prisma.promotion.update({
      where: { id },
      data: updateData,
    })

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
  await prisma.promotion.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
