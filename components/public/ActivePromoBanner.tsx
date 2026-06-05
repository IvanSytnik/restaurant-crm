import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@/i18n/config'
import { pathForLocale } from '@/lib/public/locale'
import { pickName, pickDescription } from '@/lib/menu/i18n'

type Promo = {
  id: string
  slug: string
  titleDE: string
  titleEN: string | null
  titleUK: string | null
  descriptionDE: string | null
  descriptionEN: string | null
  descriptionUK: string | null
  imageUrl: string | null
}

type Props = { locale: Locale; promotion: Promo }

export async function ActivePromoBanner({ locale, promotion }: Props) {
  const t = await getTranslations({ locale, namespace: 'public.activePromo' })

  const title = pickName(
    { nameDE: promotion.titleDE, nameEN: promotion.titleEN, nameUK: promotion.titleUK },
    locale
  )
  const description = pickDescription(
    {
      descriptionDE: promotion.descriptionDE,
      descriptionEN: promotion.descriptionEN,
      descriptionUK: promotion.descriptionUK,
    },
    locale
  )

  return (
    <section className="bg-ink text-cream">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        {promotion.imageUrl && (
          <div className="relative aspect-[4/3] overflow-hidden">
            <img
              src={promotion.imageUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        )}

        <div className={promotion.imageUrl ? '' : 'lg:col-span-2 max-w-3xl mx-auto text-center'}>
          <p className="public-eyebrow text-accent">{t('label')}</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl leading-tight">{title}</h2>
          {description && (
            <p className="mt-6 text-cream/80 leading-relaxed max-w-xl">{description}</p>
          )}
          <Link
            href={pathForLocale(locale, `promotions/${promotion.slug}`)}
            className="mt-8 inline-flex items-center gap-3 text-xs tracking-[0.25em] uppercase border-b border-cream pb-1 hover:text-accent hover:border-accent transition-colors"
          >
            {t('readMore')}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
