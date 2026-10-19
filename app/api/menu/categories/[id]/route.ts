import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePublicSite } from '@/lib/public/revalidate'
import { errorResponse } from '@/lib/api-route'

const UpdateCategorySchema = z.object({
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
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const { id } = await params
    const data = UpdateCategorySchema.parse(await req.json())

    const updated = await prisma.menuCategory.update({ where: { id }, data })
    revalidatePublicSite()
    return NextResponse.json(updated)
  } catch (error) {
    return errorResponse(error, 'PATCH /api/menu/categories/[id]', { uniqueCode: 'SLUG_TAKEN' })
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

    // Защита: нельзя удалить категорию с блюдами
    const count = await prisma.menuItem.count({ where: { categoryId: id } })
    if (count > 0) {
      return NextResponse.json(
        { error: 'CATEGORY_NOT_EMPTY', params: { count } },
        { status: 409 }
      )
    }

    await prisma.menuCategory.delete({ where: { id } })
    revalidatePublicSite()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'DELETE /api/menu/categories/[id]', { uniqueCode: 'SLUG_TAKEN' })
  }
}
