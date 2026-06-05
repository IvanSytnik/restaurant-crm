import { getTranslations } from 'next-intl/server'
import { type Locale } from '@/i18n/config'
import { type ContactsMap } from '@/lib/contacts'
import { pickName, pickDescription } from '@/lib/menu/i18n'
import { type DayHours } from '@/lib/public/hours'

type Props = {
  locale: Locale
  contacts: ContactsMap
  today: DayHours | null
  isOpenNow: boolean
}

export async function AboutSection({ locale, contacts, today, isOpenNow }: Props) {
  const t = await getTranslations({ locale, namespace: 'public.about' })
  const tStatus = await getTranslations({ locale, namespace: 'public.contact' })

  const description = pickDescription(
    {
      descriptionDE: contacts.description_de ?? null,
      descriptionEN: contacts.description_en ?? null,
      descriptionUK: contacts.description_uk ?? null,
    },
    locale
  )

  const addressLine = [contacts.address, [contacts.postal_code, contacts.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')

  const todayHours =
    today?.isOpen && today.openTime && today.closeTime
      ? `${today.openTime} – ${today.closeTime}`
      : tStatus('closed')

  return (
    <section className="bg-cream py-24 lg:py-32">
      <div className="max-w-8xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
          <div className="lg:col-span-5">
            <p className="public-eyebrow text-accent">{t('eyebrow')}</p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.1]">
              {t('title')}
            </h2>
          </div>

          <div className="lg:col-span-7">
            {description && (
              <p className="text-lg leading-relaxed text-ink/85 font-light">
                {description}
              </p>
            )}

            {/* Key info cards */}
            <div className="mt-12 grid sm:grid-cols-3 gap-8 border-t border-[var(--border)] pt-8">
              {addressLine && (
                <div>
                  <p className="public-eyebrow text-ink-soft">{tStatus('address')}</p>
                  <p className="mt-3 text-sm leading-relaxed">{addressLine}</p>
                </div>
              )}

              <div>
                <p className="public-eyebrow text-ink-soft">{t('todayHours')}</p>
                <p className="mt-3 text-sm">
                  {todayHours}
                  {today?.isOpen && (
                    <span className={`ml-2 inline-flex items-center gap-1.5 text-xs ${isOpenNow ? 'text-emerald-700' : 'text-ink-soft'}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${isOpenNow ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                      {isOpenNow ? tStatus('openNow') : tStatus('closedNow')}
                    </span>
                  )}
                </p>
              </div>

              {contacts.phone && (
                <div>
                  <p className="public-eyebrow text-ink-soft">{tStatus('phone')}</p>
                  <a
                    href={`tel:${contacts.phone.replace(/\s+/g, '')}`}
                    className="mt-3 block text-sm hover:text-accent transition-colors"
                  >
                    {contacts.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
