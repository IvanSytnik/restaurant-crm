import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { errorResponse } from '@/lib/api-route'
import { MAX_PARTY_SIZE } from '@/lib/settings-booking'

const CreateTableSchema = z.object({
  name: z.string().min(1).max(20),
  capacity: z.number().int().min(1).max(MAX_PARTY_SIZE),
  minCapacity: z.number().int().min(1).max(MAX_PARTY_SIZE).default(1),
  zone: z.enum(['INDOOR', 'OUTDOOR', 'TERRACE', 'PRIVATE']).default('INDOOR'),
  posX: z.number().min(0).max(100).default(50),
  posY: z.number().min(0).max(100).default(50),
  isActive: z.boolean().default(true),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const tables = await prisma.table.findMany({
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ tables })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    const data = CreateTableSchema.parse(await req.json())

    if (data.minCapacity > data.capacity) {
      return NextResponse.json({ error: 'MIN_GT_CAPACITY' }, { status: 400 })
    }

    const table = await prisma.table.create({ data })
    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    return errorResponse(error, 'POST /api/tables', { uniqueCode: 'TABLE_NAME_TAKEN' })
  }
}
