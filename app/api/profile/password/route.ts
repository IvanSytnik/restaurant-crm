import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || !user.password) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!ok) return NextResponse.json({ error: 'WRONG_CURRENT_PASSWORD' }, { status: 400 })

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json({ error: 'SAME_PASSWORD' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.user.update({ where: { id: session.user.id }, data: { password: hashed } })

  return NextResponse.json({ ok: true })
}
