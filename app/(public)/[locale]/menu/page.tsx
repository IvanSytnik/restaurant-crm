import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { resolvePublicLocale } from '@/lib/public/locale'
import { pickName } from '@/lib/menu/i18n'
import { PageHero } from '@/components/public/PageHero'
import { MenuAnchorNav } from '@/components/public/MenuAnchorNav'
import { MenuCategorySection } from '@/components/public/MenuCategorySection'
import type { AllergenKey } from '@/lib/menu/allergens'

export const dynamic = 'force-dynamic'

type Params = { locale: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.menuPage' })
  return { title: t('title') }
}

export default async function MenuPage({ params }: { params: Promise<Params> }) {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.menuPage' })

  const categories = await prisma.menuCategory.findMany({
    where: { isVisible: true },
    orderBy: { position: 'asc' },
    include: {
      items: {
        where: { isAvailable: true },
        orderBy: { position: 'asc' },
        include: {
          variants: { orderBy: { position: 'asc' } },
        },
      },
    },
  })

  // Filter out empty categories
  const nonEmpty = categories.filter((c) => c.items.length > 0)

  const navItems = nonEmpty.map((c) => ({
    slug: c.slug,
    name: pickName({ nameDE: c.nameDE, nameEN: c.nameEN, nameUK: c.nameUK }, locale),
  }))

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      {nonEmpty.length === 0 ? (
        <div className="max-w-8xl mx-auto px-6 lg:px-12 py-24">
          <p className="text-center text-ink-soft">{t('empty')}</p>
        </div>
      ) : (
        <>
          <MenuAnchorNav categories={navItems} />

          <div className="max-w-5xl mx-auto px-6 lg:px-12 pb-24">
            {nonEmpty.map((cat) => (
              <MenuCategorySection
                key={cat.id}
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
            ))}

            {/* Allergen legend */}
            <div className="mt-16 pt-8 border-t border-[var(--border)] text-xs text-ink-soft">
              <p className="font-medium uppercase tracking-widest text-[11px] mb-2">{t('allergensInfo')}</p>
              <p>{t('allergensLegend')}</p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
