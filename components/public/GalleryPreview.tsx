import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@/i18n/config'
import { pathForLocale } from '@/lib/public/locale'

type GalleryImg = {
  id: string
  url: string
  altDE: string | null
  altEN: string | null
  altUK: string | null
}

type Props = { locale: Locale; images: GalleryImg[] }

export async function GalleryPreview({ locale, images }: Props) {
  const t = await getTranslations({ locale, namespace: 'public.galleryPreview' })

  // Curated layout: 6 images, first one spans 2 cols on lg
  return (
    <section className="bg-cream py-24 lg:py-32">
      <div className="max-w-8xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
          <div>
            <p className="public-eyebrow text-accent">{t('eyebrow')}</p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight">
              {t('title')}
            </h2>
          </div>
          <Link
            href={pathForLocale(locale, 'gallery')}
            className="self-start sm:self-end inline-flex items-center gap-3 text-xs tracking-[0.25em] uppercase border-b border-ink pb-1 hover:text-accent hover:border-accent transition-colors"
          >
            {t('viewAll')}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {images.map((img, idx) => {
            const alt =
              locale === 'de' ? img.altDE :
              locale === 'en' ? img.altEN :
              img.altUK
            const aspectClass =
              idx === 0 ? 'aspect-[4/3] col-span-2 row-span-2 lg:col-span-2 lg:row-span-2'
              : idx % 3 === 0 ? 'aspect-[4/5]'
              : 'aspect-square'
            return (
              <div key={img.id} className={`relative overflow-hidden bg-stone-200 ${aspectClass}`}>
                <img
                  src={img.url}
                  alt={alt || ''}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
