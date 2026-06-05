import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@/i18n/config'
import { pathForLocale } from '@/lib/public/locale'
import { pickName } from '@/lib/menu/i18n'

type Category = {
  id: string
  slug: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
  items: { imageUrl: string | null }[]
}

type Props = { locale: Locale; categories: Category[] }

export async function MenuPreview({ locale, categories }: Props) {
  const t = await getTranslations({ locale, namespace: 'public.menuPreview' })

  return (
    <section className="bg-cream-soft py-24 lg:py-32">
      <div className="max-w-8xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
          <div>
            <p className="public-eyebrow text-accent">{t('eyebrow')}</p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight">
              {t('title')}
            </h2>
          </div>
          <Link
            href={pathForLocale(locale, 'menu')}
            className="self-start sm:self-end inline-flex items-center gap-3 text-xs tracking-[0.25em] uppercase border-b border-ink pb-1 hover:text-accent hover:border-accent transition-colors"
          >
            {t('viewAll')}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat) => {
            const name = pickName({ nameDE: cat.nameDE, nameEN: cat.nameEN, nameUK: cat.nameUK }, locale)
            const img = cat.items[0]?.imageUrl
            return (
              <Link
                key={cat.id}
                href={pathForLocale(locale, `menu/${cat.slug}`)}
                className="group block"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-stone-200">
                  {img ? (
                    <img
                      src={img}
                      alt={name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-300 to-stone-400" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-display text-xl sm:text-2xl text-cream leading-tight">
                      {name}
                    </h3>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
