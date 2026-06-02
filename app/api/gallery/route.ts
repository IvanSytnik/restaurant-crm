import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CreateSchema = z.object({
  url: z.string().url(),
  altDE: z.string().max(200).optional().nullable(),
  altEN: z.string().max(200).optional().nullable(),
  altUK: z.string().max(200).optional().nullable(),
  categoryId: z.string(),
  isFeatured: z.boolean().default(false),
  isVisible: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')

  const images = await prisma.galleryImage.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: [{ categoryId: 'asc' }, { position: 'asc' }],
    include: {
      category: { select: { id: true, nameDE: true, slug: true } },
    },
  })

  return NextResponse.json({ images })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = CreateSchema.parse(await req.json())

    const maxPos = await prisma.galleryImage.aggregate({
      _max: { position: true },
      where: { categoryId: data.categoryId },
    })

    const image = await prisma.galleryImage.create({
      data: {
        ...data,
        altDE: data.altDE || null,
        altEN: data.altEN || null,
        altUK: data.altUK || null,
        position: (maxPos._max.position ?? -1) + 1,
      },
    })

    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 422 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
