import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CreateTableSchema = z.object({
  name: z.string().min(1).max(20),
  capacity: z.number().int().min(1).max(20),
  minCapacity: z.number().int().min(1).max(20).default(1),
  zone: z.enum(['INDOOR', 'OUTDOOR', 'TERRACE', 'PRIVATE']).default('INDOOR'),
  posX: z.number().min(0).max(100).default(50),
  posY: z.number().min(0).max(100).default(50),
  isActive: z.boolean().default(true),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tables = await prisma.table.findMany({
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ tables })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = CreateTableSchema.parse(await req.json())

    if (data.minCapacity > data.capacity) {
      return NextResponse.json(
        { error: 'Минимальная вместимость не может быть больше максимальной' },
        { status: 400 }
      )
    }

    const table = await prisma.table.create({ data })
    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 422 })
    }
    if (error instanceof Error && error.message.includes('Unique')) {
      return NextResponse.json({ error: 'Стол с таким именем уже существует' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
