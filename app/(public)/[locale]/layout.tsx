import { setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { resolvePublicLocale } from '@/lib/public/locale'
import { getAllContacts } from '@/lib/contacts'
import { PublicHeader } from '@/components/public/PublicHeader'
import { PublicFooter } from '@/components/public/PublicFooter'
import { pickName, pickDescription } from '@/lib/menu/i18n'
import '../../globals.css'

// ISR: served from cache, refreshed every 5 minutes and on admin edits
// (lib/public/revalidate.ts).
export const revalidate = 300

// Nothing is prerendered at build time (the build must not need a database);
// pages are rendered on first request and then cached per the revalidate above.
export function generateStaticParams() {
  return []
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const contacts = await getAllContacts()

  const name = pickName(
    { nameDE: contacts.name_de ?? '', nameEN: contacts.name_en ?? null, nameUK: contacts.name_uk ?? null },
    locale
  ) || 'Restaurant'

  const description = pickDescription(
    {
      descriptionDE: contacts.description_de ?? null,
      descriptionEN: contacts.description_en ?? null,
      descriptionUK: contacts.description_uk ?? null,
    },
    locale
  ) || ''

  return {
    title: { default: name, template: `%s · ${name}` },
    description,
    openGraph: { title: name, description, type: 'website' },
  }
}

export default async function PublicLocaleLayout({ children, params }: Props) {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  // Lets next-intl resolve the locale without reading request headers,
  // which would opt the page out of ISR.
  setRequestLocale(locale)

  // Root layout of the public site: locale and <html lang> come from the URL
  // segment (/ua -> uk), never from an admin session or cookie.
  const messages = (await import(`@/messages/${locale}.json`)).default
  const contacts = await getAllContacts()

  return (
    <html lang={locale}>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="bg-cream text-ink min-h-screen flex flex-col">
            <PublicHeader locale={locale} contacts={contacts} />
            <main className="flex-1">{children}</main>
            <PublicFooter locale={locale} contacts={contacts} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
