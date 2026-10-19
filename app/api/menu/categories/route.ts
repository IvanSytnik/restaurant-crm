import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePublicSite } from '@/lib/public/revalidate'
import { errorResponse } from '@/lib/api-route'

const CreateCategorySchema = z.object({
  nameDE: z.string().min(1).max(100),
  nameEN: z.string().max(100).optional().nullable(),
  nameUK: z.string().max(100).optional().nullable(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  isVisible: z.boolean().default(true),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const categories = await prisma.menuCategory.findMany({
    orderBy: { position: 'asc' },
    include: {
      _count: { select: { items: true } },
    },
  })

  return NextResponse.json({ categories })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const data = CreateCategorySchema.parse(await req.json())

    // Новая категория добавляется в конец списка
    const maxPos = await prisma.menuCategory.aggregate({
      _max: { position: true },
    })

    const category = await prisma.menuCategory.create({
      data: {
        ...data,
        position: (maxPos._max.position ?? -1) + 1,
      },
    })

    revalidatePublicSite()
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'POST /api/menu/categories', { uniqueCode: 'SLUG_TAKEN' })
  }
}
