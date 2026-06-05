import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { type Locale } from '@/i18n/config'
import { type ContactsMap } from '@/lib/contacts'
import { pathForLocale } from '@/lib/public/locale'
import { pickName } from '@/lib/menu/i18n'

type Props = { locale: Locale; contacts: ContactsMap }

export async function PublicFooter({ locale, contacts }: Props) {
  const t = await getTranslations({ locale, namespace: 'public.footer' })
  const tNav = await getTranslations({ locale, namespace: 'public.nav' })

  const name = pickName(
    { nameDE: contacts.name_de ?? '', nameEN: contacts.name_en ?? null, nameUK: contacts.name_uk ?? null },
    locale
  ) || 'Restaurant'

  const tagline = pickName(
    { nameDE: contacts.tagline_de ?? '', nameEN: contacts.tagline_en ?? null, nameUK: contacts.tagline_uk ?? null },
    locale
  ) || ''

  const year = new Date().getFullYear()

  return (
    <footer className="bg-ink text-cream/80">
      <div className="max-w-8xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
        <div className="grid md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href={pathForLocale(locale, '')} className="font-display text-2xl text-cream">
              {name}
            </Link>
            {tagline && <p className="mt-3 text-sm text-cream/60 max-w-xs">{tagline}</p>}
          </div>

          {/* Navigation */}
          <div>
            <p className="public-eyebrow text-cream/50">{t('links')}</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li><Link href={pathForLocale(locale, 'menu')} className="hover:text-cream transition-colors">{tNav('menu')}</Link></li>
              <li><Link href={pathForLocale(locale, 'promotions')} className="hover:text-cream transition-colors">{tNav('promotions')}</Link></li>
              <li><Link href={pathForLocale(locale, 'gallery')} className="hover:text-cream transition-colors">{tNav('gallery')}</Link></li>
              <li><Link href={pathForLocale(locale, 'booking')} className="hover:text-cream transition-colors">{tNav('book')}</Link></li>
            </ul>
          </div>

          {/* Contact + legal */}
          <div>
            <p className="public-eyebrow text-cream/50">{t('contact')}</p>
            <ul className="mt-5 space-y-2 text-sm">
              {contacts.address && <li>{contacts.address}</li>}
              {(contacts.postal_code || contacts.city) && (
                <li>{[contacts.postal_code, contacts.city].filter(Boolean).join(' ')}</li>
              )}
              {contacts.phone && (
                <li>
                  <a href={`tel:${contacts.phone.replace(/\s+/g, '')}`} className="hover:text-cream transition-colors">
                    {contacts.phone}
                  </a>
                </li>
              )}
              {contacts.email && (
                <li>
                  <a href={`mailto:${contacts.email}`} className="hover:text-cream transition-colors break-all">
                    {contacts.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-cream/10 flex flex-col sm:flex-row justify-between gap-4 text-xs text-cream/50">
          <p>© {year} {name}. {t('copyright')}</p>
          <div className="flex gap-6">
            <Link href={pathForLocale(locale, 'impressum')} className="hover:text-cream transition-colors">{t('impressum')}</Link>
            <Link href={pathForLocale(locale, 'datenschutz')} className="hover:text-cream transition-colors">{t('privacy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
