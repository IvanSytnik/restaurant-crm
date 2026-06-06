import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { resolvePublicLocale } from '@/lib/public/locale'
import { pickName } from '@/lib/menu/i18n'
import { PageHero } from '@/components/public/PageHero'
import { GalleryGrid } from '@/components/public/GalleryGrid'

export const dynamic = 'force-dynamic'

type Params = { locale: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.galleryPage' })
  return { title: t('title') }
}

export default async function GalleryPage({ params }: { params: Promise<Params> }) {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.galleryPage' })

  const cats = await prisma.galleryCategory.findMany({
    where: { isVisible: true },
    orderBy: { position: 'asc' },
    include: {
      images: {
        where: { isVisible: true },
        orderBy: { position: 'asc' },
      },
    },
  })

  // Flatten + map to client shape. Alt has its own fallback (alt is optional everywhere).
  const images = cats.flatMap((c) => {
    const catName = pickName({ nameDE: c.nameDE, nameEN: c.nameEN, nameUK: c.nameUK }, locale)
    return c.images.map((img) => {
      const alt =
        locale === 'de'
          ? img.altDE
          : locale === 'en'
            ? img.altEN || img.altDE
            : img.altUK || img.altDE
      return {
        id: img.id,
        url: img.url,
        alt: alt || catName,
        categoryId: c.id,
        categoryName: catName,
      }
    })
  })

  const categories = cats
    .filter((c) => c.images.length > 0)
    .map((c) => ({
      id: c.id,
      name: pickName({ nameDE: c.nameDE, nameEN: c.nameEN, nameUK: c.nameUK }, locale),
    }))

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} subtitle={t('subtitle')} />

      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
        <GalleryGrid
          images={images}
          categories={categories}
          labels={{
            all: t('filterAll'),
            close: t('close'),
            prev: t('prev'),
            next: t('next'),
            empty: t('empty'),
          }}
        />
      </div>
    </>
  )
}
