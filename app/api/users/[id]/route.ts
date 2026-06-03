import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isLastActiveOwner } from '@/lib/users'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      locale: true,
      createdAt: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, role, isActive } = parsed.data
  const isSelf = session.user.id === target.id

  if (isSelf) {
    if (role !== undefined && role !== target.role) {
      return NextResponse.json({ error: 'CANNOT_CHANGE_OWN_ROLE' }, { status: 400 })
    }
    if (isActive !== undefined && isActive !== target.isActive) {
      return NextResponse.json({ error: 'CANNOT_DEACTIVATE_SELF' }, { status: 400 })
    }
  }

  if (target.role === 'OWNER') {
    const willDemote = role !== undefined && role !== 'OWNER'
    const willDeactivate = isActive === false
    if (willDemote || willDeactivate) {
      const isLast = await isLastActiveOwner(target.id)
      if (isLast) {
        return NextResponse.json({ error: 'LAST_OWNER' }, { status: 400 })
      }
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      locale: true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'HARD_DELETE_DISABLED' },
    { status: 405 }
  )
}