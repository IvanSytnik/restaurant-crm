import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@/i18n/config'
import { type ContactsMap } from '@/lib/contacts'
import { pathForLocale } from '@/lib/public/locale'

type Props = { locale: Locale; contacts: ContactsMap }

export async function ReservationCTA({ locale, contacts }: Props) {
  const t = await getTranslations({ locale, namespace: 'public.reservationCta' })

  return (
    <section className="relative bg-ink text-cream">
      <div className="max-w-4xl mx-auto px-6 lg:px-12 py-28 lg:py-40 text-center">
        <p className="public-eyebrow text-accent">{t('eyebrow')}</p>
        <h2 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.1]">
          {t('title')}
        </h2>
        <p className="mt-6 text-cream/75 max-w-xl mx-auto leading-relaxed">
          {t('subtitle')}
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={pathForLocale(locale, 'booking')}
            className="inline-block min-w-[220px] bg-cream text-ink px-8 py-4 text-xs tracking-[0.25em] uppercase hover:bg-white transition-colors"
          >
            {t('button')}
          </Link>
          {contacts.phone && (
            <a
              href={`tel:${contacts.phone.replace(/\s+/g, '')}`}
              className="inline-block min-w-[220px] border border-cream/40 text-cream px-8 py-4 text-xs tracking-[0.25em] uppercase hover:border-cream transition-colors"
            >
              {t('callInstead')}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
