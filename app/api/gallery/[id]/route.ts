import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePublicSite } from '@/lib/public/revalidate'
import { errorResponse } from '@/lib/api-route'

const UpdateSchema = z.object({
  url: z.string().url().optional(),
  altDE: z.string().max(200).optional().nullable(),
  altEN: z.string().max(200).optional().nullable(),
  altUK: z.string().max(200).optional().nullable(),
  categoryId: z.string().optional(),
  isFeatured: z.boolean().optional(),
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
    const data = UpdateSchema.parse(await req.json())

    const updated = await prisma.galleryImage.update({ where: { id }, data })
    revalidatePublicSite()
    return NextResponse.json(updated)
  } catch (error) {
    return errorResponse(error, 'PATCH /api/gallery/[id]')
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
    await prisma.galleryImage.delete({ where: { id } })
    revalidatePublicSite()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'DELETE /api/gallery/[id]')
  }
}
