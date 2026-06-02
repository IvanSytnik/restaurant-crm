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
  id: z.string().optional(),
  labelDE: z.string().min(1).max(50),
  labelEN: z.string().max(50).optional().nullable(),
  labelUK: z.string().max(50).optional().nullable(),
  price: z.number().positive().max(9999),
})

const UpdateItemSchema = z.object({
  categoryId: z.string().optional(),
  nameDE: z.string().min(1).max(150).optional(),
  nameEN: z.string().max(150).optional().nullable(),
  nameUK: z.string().max(150).optional().nullable(),
  descriptionDE: z.string().max(1000).optional().nullable(),
  descriptionEN: z.string().max(1000).optional().nullable(),
  descriptionUK: z.string().max(1000).optional().nullable(),
  price: z.number().positive().max(9999).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  allergens: z.array(z.enum(ALLERGEN_VALUES)).optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  spicyLevel: z.number().int().min(0).max(3).optional(),
  isAvailable: z.boolean().optional(),
  variants: z.array(VariantSchema).optional(),
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
    const data = UpdateItemSchema.parse(await req.json())

    if (data.isVegan) data.isVegetarian = true

    const imageUrl =
      data.imageUrl !== undefined
        ? data.imageUrl && data.imageUrl.trim() !== ''
          ? data.imageUrl
          : null
        : undefined

    const { variants, ...itemData } = data

    // Если переданы варианты — полностью заменяем
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.menuItem.update({
        where: { id },
        data: {
          ...itemData,
          imageUrl,
        } as any,
      })

      if (variants) {
        await tx.menuItemVariant.deleteMany({ where: { itemId: id } })
        if (variants.length > 0) {
          await tx.menuItemVariant.createMany({
            data: variants.map((v, index) => ({
              itemId: id,
              labelDE: v.labelDE,
              labelEN: v.labelEN || null,
              labelUK: v.labelUK || null,
              price: v.price,
              position: index,
            })),
          })
        }
      }

      return tx.menuItem.findUnique({
        where: { id: updated.id },
        include: { variants: { orderBy: { position: 'asc' } } },
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 422 })
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
  await prisma.menuItem.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
