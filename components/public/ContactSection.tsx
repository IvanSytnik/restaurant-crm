import { getTranslations } from 'next-intl/server'
import { type Locale } from '@/i18n/config'
import { type ContactsMap } from '@/lib/contacts'
import { type DayHours } from '@/lib/public/hours'

type Props = {
  locale: Locale
  contacts: ContactsMap
  workingHours: DayHours[]
  isOpenNow: boolean
}

export async function ContactSection({ locale, contacts, workingHours, isOpenNow }: Props) {
  const t = await getTranslations({ locale, namespace: 'public.contact' })
  const tDays = await getTranslations({ locale, namespace: 'settings.days' })

  const addressLines = [
    contacts.address,
    [contacts.postal_code, contacts.city].filter(Boolean).join(' '),
    contacts.country,
  ].filter(Boolean) as string[]

  const fullAddress = addressLines.join(', ')

  // Order days: Monday … Sunday (DB stores 0 = Sunday)
  const ordered = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => workingHours.find((h) => h.dayOfWeek === d))
    .filter((x): x is DayHours => Boolean(x))

  const mapsSrc = fullAddress
    ? `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`
    : null

  return (
    <section id="contact" className="bg-cream-soft py-24 lg:py-32 scroll-mt-20">
      <div className="max-w-8xl mx-auto px-6 lg:px-12">
        <div className="mb-14">
          <p className="public-eyebrow text-accent">{t('eyebrow')}</p>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight">
            {t('title')}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Info column */}
          <div className="space-y-10">
            {addressLines.length > 0 && (
              <div>
                <p className="public-eyebrow text-ink-soft">{t('address')}</p>
                <div className="mt-3 text-base leading-relaxed">
                  {addressLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
                {contacts.maps_url && (
                  <a
                    href={contacts.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-xs tracking-widest uppercase text-accent hover:text-ink transition-colors"
                  >
                    {t('getDirections')}
                    <span aria-hidden>↗</span>
                  </a>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-8">
              {contacts.phone && (
                <div>
                  <p className="public-eyebrow text-ink-soft">{t('phone')}</p>
                  <a
                    href={`tel:${contacts.phone.replace(/\s+/g, '')}`}
                    className="mt-3 block hover:text-accent transition-colors"
                  >
                    {contacts.phone}
                  </a>
                </div>
              )}
              {contacts.email && (
                <div>
                  <p className="public-eyebrow text-ink-soft">{t('email')}</p>
                  <a
                    href={`mailto:${contacts.email}`}
                    className="mt-3 block break-all hover:text-accent transition-colors"
                  >
                    {contacts.email}
                  </a>
                </div>
              )}
            </div>

            {(contacts.instagram || contacts.facebook) && (
              <div>
                <p className="public-eyebrow text-ink-soft">{t('follow')}</p>
                <div className="mt-3 flex gap-6 text-sm">
                  {contacts.instagram && (
                    <a
                      href={contacts.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                  {contacts.facebook && (
                    <a
                      href={contacts.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent transition-colors"
                    >
                      Facebook
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Working hours table */}
            <div>
              <div className="flex items-baseline justify-between">
                <p className="public-eyebrow text-ink-soft">{t('openingHours')}</p>
                {ordered.length > 0 && (
                  <span className={`inline-flex items-center gap-1.5 text-xs ${isOpenNow ? 'text-emerald-700' : 'text-ink-soft'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${isOpenNow ? 'bg-emerald-600' : 'bg-stone-400'}`} />
                    {isOpenNow ? t('openNow') : t('closedNow')}
                  </span>
                )}
              </div>
              <dl className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
                {ordered.map((day) => (
                  <div key={day.dayOfWeek} className="flex items-center justify-between py-3 text-sm">
                    <dt className="text-ink-soft">{tDays(String(day.dayOfWeek))}</dt>
                    <dd>
                      {day.isOpen && day.openTime && day.closeTime
                        ? `${day.openTime} – ${day.closeTime}`
                        : <span className="text-ink-soft">{t('closed')}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Map column */}
          <div className="relative w-full min-h-[400px] lg:min-h-full bg-stone-200">
            {mapsSrc ? (
              <iframe
                title="Map"
                src={mapsSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 w-full h-full border-0 grayscale-[20%]"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-ink-soft text-sm">
                {t('noMap')}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
