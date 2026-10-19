import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/api-route'

const CreateSchema = z.object({
  nameDE: z.string().min(1).max(100),
  nameEN: z.string().max(100).optional().nullable(),
  nameUK: z.string().max(100).optional().nullable(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  isVisible: z.boolean().default(true),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const categories = await prisma.galleryCategory.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { images: true } } },
  })

  return NextResponse.json({ categories })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const data = CreateSchema.parse(await req.json())

    const maxPos = await prisma.galleryCategory.aggregate({ _max: { position: true } })

    const category = await prisma.galleryCategory.create({
      data: {
        ...data,
        position: (maxPos._max.position ?? -1) + 1,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'POST /api/gallery/categories', { uniqueCode: 'SLUG_TAKEN' })
  }
}
