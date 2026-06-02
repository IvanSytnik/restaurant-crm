import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const UpdateSchema = z.object({
  nameDE: z.string().min(1).max(100).optional(),
  nameEN: z.string().max(100).optional().nullable(),
  nameUK: z.string().max(100).optional().nullable(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  isVisible: z.boolean().optional(),
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

    const updated = await prisma.galleryCategory.update({ where: { id }, data })
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

  // Защита: нельзя удалить категорию с изображениями
  const count = await prisma.galleryImage.count({ where: { categoryId: id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `В этой категории ${count} ${count === 1 ? 'изображение' : 'изображений'}. Сначала переместите или удалите их.` },
      { status: 409 }
    )
  }

  await prisma.galleryCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
