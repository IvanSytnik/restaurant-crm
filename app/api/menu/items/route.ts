import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLERGEN_VALUES = [
  'GLUTEN', 'CRUSTACEANS', 'EGGS', 'FISH', 'PEANUTS',
  'SOYBEANS', 'MILK', 'NUTS', 'CELERY', 'MUSTARD',
  'SESAME', 'SULPHITES', 'LUPIN', 'MOLLUSCS',
] as const

const VariantSchema = z.object({
  labelDE: z.string().min(1).max(50),
  labelEN: z.string().max(50).optional().nullable(),
  labelUK: z.string().max(50).optional().nullable(),
  price: z.number().positive().max(9999),
})

const CreateItemSchema = z.object({
  categoryId: z.string(),
  nameDE: z.string().min(1).max(150),
  nameEN: z.string().max(150).optional().nullable(),
  nameUK: z.string().max(150).optional().nullable(),
  descriptionDE: z.string().max(1000).optional().nullable(),
  descriptionEN: z.string().max(1000).optional().nullable(),
  descriptionUK: z.string().max(1000).optional().nullable(),
  price: z.number().positive().max(9999).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  allergens: z.array(z.enum(ALLERGEN_VALUES)).default([]),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  spicyLevel: z.number().int().min(0).max(3).default(0),
  isAvailable: z.boolean().default(true),
  variants: z.array(VariantSchema).default([]),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')

  const items = await prisma.menuItem.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: [{ categoryId: 'asc' }, { position: 'asc' }],
    include: {
      category: { select: { id: true, nameDE: true, slug: true } },
      variants: { orderBy: { position: 'asc' } },
    },
  })

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = CreateItemSchema.parse(await req.json())

    // Должна быть либо базовая цена, либо хотя бы один вариант
    if (!data.price && data.variants.length === 0) {
      return NextResponse.json(
        { error: 'Укажите цену или добавьте хотя бы один вариант' },
        { status: 400 }
      )
    }

    // Веган всегда вегетарианец
    if (data.isVegan) data.isVegetarian = true

    // Очищаем пустой imageUrl
    const imageUrl = data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl : null

    // Позиция: в конец категории
    const maxPos = await prisma.menuItem.aggregate({
      _max: { position: true },
      where: { categoryId: data.categoryId },
    })

    const item = await prisma.menuItem.create({
      data: {
        categoryId: data.categoryId,
        nameDE: data.nameDE,
        nameEN: data.nameEN || null,
        nameUK: data.nameUK || null,
        descriptionDE: data.descriptionDE || null,
        descriptionEN: data.descriptionEN || null,
        descriptionUK: data.descriptionUK || null,
        price: data.price ?? null,
        imageUrl,
        allergens: data.allergens,
        isVegetarian: data.isVegetarian,
        isVegan: data.isVegan,
        spicyLevel: data.spicyLevel,
        isAvailable: data.isAvailable,
        position: (maxPos._max.position ?? -1) + 1,
        variants: {
          create: data.variants.map((v, index) => ({
            labelDE: v.labelDE,
            labelEN: v.labelEN || null,
            labelUK: v.labelUK || null,
            price: v.price,
            position: index,
          })),
        },
      },
      include: { variants: true },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 422 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
