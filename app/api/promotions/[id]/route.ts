import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePublicSite } from '@/lib/public/revalidate'
import { errorResponse } from '@/lib/api-route'

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
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const { id } = await params
    const data = UpdateSchema.parse(await req.json())

    // Same rule as POST, checked against the dates after the update.
    if (data.startDate !== undefined || data.endDate !== undefined) {
      const current = await prisma.promotion.findUnique({
        where: { id },
        select: { startDate: true, endDate: true },
      })
      if (!current) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
      const start = data.startDate ?? current.startDate.toISOString().slice(0, 10)
      const end = data.endDate ?? current.endDate.toISOString().slice(0, 10)
      if (end < start) {
        return NextResponse.json({ error: 'END_BEFORE_START' }, { status: 400 })
      }
    }

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

    revalidatePublicSite()
    return NextResponse.json(updated)
  } catch (error) {
    return errorResponse(error, 'PATCH /api/promotions/[id]', { uniqueCode: 'SLUG_TAKEN' })
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
    await prisma.promotion.delete({ where: { id } })
    revalidatePublicSite()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'DELETE /api/promotions/[id]', { uniqueCode: 'SLUG_TAKEN' })
  }
}
