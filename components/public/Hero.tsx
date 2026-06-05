import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@/i18n/config'
import { type ContactsMap } from '@/lib/contacts'
import { pathForLocale } from '@/lib/public/locale'
import { pickName } from '@/lib/menu/i18n'

type Props = {
  locale: Locale
  contacts: ContactsMap
  image: { url: string; altDE: string | null; altEN: string | null; altUK: string | null } | null
}

export async function Hero({ locale, contacts, image }: Props) {
  const t = await getTranslations({ locale, namespace: 'public.hero' })

  const name = pickName(
    { nameDE: contacts.name_de ?? '', nameEN: contacts.name_en ?? null, nameUK: contacts.name_uk ?? null },
    locale
  ) || 'Restaurant'

  const tagline = pickName(
    { nameDE: contacts.tagline_de ?? '', nameEN: contacts.tagline_en ?? null, nameUK: contacts.tagline_uk ?? null },
    locale
  ) || ''

  const alt =
    locale === 'de' ? image?.altDE :
    locale === 'en' ? image?.altEN :
    image?.altUK

  return (
    <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      {/* Background */}
      {image ? (
        <img
          src={image.url}
          alt={alt || name}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-950" />
      )}

      {/* Atmospheric overlay — vertical gradient + slight vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/15 to-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.35)_100%)]" />

      {/* Content */}
      <div className="relative h-full flex flex-col">
        {/* spacer for fixed header */}
        <div className="h-20" />

        <div className="flex-1 flex items-center justify-center px-6 lg:px-12">
          <div className="max-w-3xl text-center text-cream">
            <p className="public-eyebrow text-cream/70 public-fade-up">
              {t('eyebrow')}
            </p>

            <h1 className="mt-6 font-display text-5xl sm:text-7xl lg:text-8xl leading-[1.05] tracking-tight public-fade-up public-fade-up-delay-1">
              {name}
            </h1>

            {tagline && (
              <p className="mt-6 text-base sm:text-lg text-cream/85 max-w-xl mx-auto leading-relaxed public-fade-up public-fade-up-delay-2">
                {tagline}
              </p>
            )}

            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 public-fade-up public-fade-up-delay-3">
              <Link
                href={pathForLocale(locale, 'booking')}
                className="inline-block min-w-[200px] bg-cream text-ink px-8 py-4 text-xs tracking-[0.25em] uppercase hover:bg-white transition-colors"
              >
                {t('cta_book')}
              </Link>
              <Link
                href={pathForLocale(locale, 'menu')}
                className="inline-block min-w-[200px] border border-cream/60 text-cream px-8 py-4 text-xs tracking-[0.25em] uppercase hover:bg-cream hover:text-ink transition-colors"
              >
                {t('cta_menu')}
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="pb-10 flex justify-center">
          <div className="public-fade-up public-fade-up-delay-3 flex flex-col items-center gap-2 text-cream/60">
            <span className="text-[10px] tracking-[0.3em] uppercase">{t('scroll')}</span>
            <span className="block h-10 w-px bg-cream/40" />
          </div>
        </div>
      </div>
    </section>
  )
}
