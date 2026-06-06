import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { resolvePublicLocale, pathForLocale } from '@/lib/public/locale'
import { pickName } from '@/lib/menu/i18n'
import { PageHero } from '@/components/public/PageHero'
import { MenuCategorySection } from '@/components/public/MenuCategorySection'
import type { AllergenKey } from '@/lib/menu/allergens'

export const dynamic = 'force-dynamic'

type Params = { locale: string; category: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: urlSeg, category: slug } = await params
  const locale = resolvePublicLocale(urlSeg)
  const cat = await prisma.menuCategory.findUnique({ where: { slug }, select: { nameDE: true, nameEN: true, nameUK: true } })
  if (!cat) return {}
  const name = pickName({ nameDE: cat.nameDE, nameEN: cat.nameEN, nameUK: cat.nameUK }, locale)
  return { title: name }
}

export default async function MenuCategoryPage({ params }: { params: Promise<Params> }) {
  const { locale: urlSeg, category: slug } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.menuPage' })

  const cat = await prisma.menuCategory.findUnique({
    where: { slug },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { position: 'asc' },
        include: { variants: { orderBy: { position: 'asc' } } },
      },
    },
  })

  if (!cat || !cat.isVisible) notFound()

  const name = pickName({ nameDE: cat.nameDE, nameEN: cat.nameEN, nameUK: cat.nameUK }, locale)

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={name} />

      <div className="max-w-5xl mx-auto px-6 lg:px-12 pb-24">
        {cat.items.length === 0 ? (
          <p className="text-center text-ink-soft py-24">{t('empty')}</p>
        ) : (
          <MenuCategorySection
            locale={locale}
            category={{
              id: cat.id,
              slug: cat.slug,
              nameDE: cat.nameDE,
              nameEN: cat.nameEN,
              nameUK: cat.nameUK,
              items: cat.items.map((it) => ({
                id: it.id,
                nameDE: it.nameDE,
                nameEN: it.nameEN,
                nameUK: it.nameUK,
                descriptionDE: it.descriptionDE,
                descriptionEN: it.descriptionEN,
                descriptionUK: it.descriptionUK,
                price: it.price,
                imageUrl: it.imageUrl,
                allergens: it.allergens as AllergenKey[],
                isVegetarian: it.isVegetarian,
                isVegan: it.isVegan,
                spicyLevel: it.spicyLevel,
                variants: it.variants.map((v) => ({
                  id: v.id,
                  labelDE: v.labelDE,
                  labelEN: v.labelEN,
                  labelUK: v.labelUK,
                  price: v.price,
                })),
              })),
            }}
          />
        )}

        <div className="mt-12">
          <Link
            href={pathForLocale(locale, 'menu')}
            className="text-xs tracking-widest uppercase text-ink-soft hover:text-ink"
          >
            ← {t('viewFullMenu')}
          </Link>
        </div>
      </div>
    </>
  )
}
