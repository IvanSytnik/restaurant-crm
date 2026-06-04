import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CONTACT_KEYS, getAllContacts, type ContactKey } from '@/lib/contacts'

export const dynamic = 'force-dynamic'

const KEY_SET = new Set<string>(CONTACT_KEYS)

const patchSchema = z.record(z.string(), z.string().max(20000))

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const data = await getAllContacts()
  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'OWNER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  const updates = parsed.data
  const ops = []
  for (const [key, rawValue] of Object.entries(updates)) {
    if (!KEY_SET.has(key)) continue
    const value = rawValue.trim()
    if (value === '') {
      ops.push(prisma.contact.deleteMany({ where: { key } }))
    } else {
      ops.push(
        prisma.contact.upsert({
          where: { key },
          create: { key: key as ContactKey, value },
          update: { value },
        })
      )
    }
  }

  await prisma.$transaction(ops)
  const fresh = await getAllContacts()
  return NextResponse.json(fresh)
}
