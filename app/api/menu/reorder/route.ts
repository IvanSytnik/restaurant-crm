import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/api-route'

const ReorderSchema = z.object({
  type: z.enum(['category', 'item']),
  // Массив id в новом порядке
  ids: z.array(z.string()).min(1),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const { type, ids } = ReorderSchema.parse(await req.json())

    // Транзакция: обновляем position для каждого id согласно индексу в массиве
    await prisma.$transaction(
      ids.map((id, index) => {
        if (type === 'category') {
          return prisma.menuCategory.update({
            where: { id },
            data: { position: index },
          })
        }
        return prisma.menuItem.update({
          where: { id },
          data: { position: index },
        })
      })
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return errorResponse(error, 'POST /api/menu/reorder')
  }
}
