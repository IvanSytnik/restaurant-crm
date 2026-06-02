import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const CreatePromotionSchema = z.object({
  titleDE: z.string().min(1).max(150),
  titleEN: z.string().max(150).optional().nullable(),
  titleUK: z.string().max(150).optional().nullable(),
  descriptionDE: z.string().max(2000).optional().nullable(),
  descriptionEN: z.string().max(2000).optional().nullable(),
  descriptionUK: z.string().max(2000).optional().nullable(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  startTime: z.string().regex(TIME_REGEX).optional().nullable().or(z.literal('')),
  endTime: z.string().regex(TIME_REGEX).optional().nullable().or(z.literal('')),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const showArchived = searchParams.get('archived') === 'true'

  const promotions = await prisma.promotion.findMany({
    where: showArchived ? { isArchived: true } : { isArchived: false },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json({ promotions })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = CreatePromotionSchema.parse(await req.json())

    if (new Date(data.endDate) < new Date(data.startDate)) {
      return NextResponse.json(
        { error: 'Дата окончания не может быть раньше даты начала' },
        { status: 400 }
      )
    }

    const promotion = await prisma.promotion.create({
      data: {
        titleDE: data.titleDE,
        titleEN: data.titleEN || null,
        titleUK: data.titleUK || null,
        descriptionDE: data.descriptionDE || null,
        descriptionEN: data.descriptionEN || null,
        descriptionUK: data.descriptionUK || null,
        slug: data.slug,
        imageUrl: data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl : null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        daysOfWeek: data.daysOfWeek,
        startTime: data.startTime && data.startTime !== '' ? data.startTime : null,
        endTime: data.endTime && data.endTime !== '' ? data.endTime : null,
        isActive: data.isActive,
      },
    })

    return NextResponse.json(promotion, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 422 })
    }
    if (error instanceof Error && error.message.includes('Unique')) {
      return NextResponse.json({ error: 'Акция с таким slug уже существует' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
