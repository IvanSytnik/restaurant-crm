import { type Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolvePublicLocale } from '@/lib/public/locale'
import { getAllContacts, renderImpressum } from '@/lib/contacts'
import { PageHero } from '@/components/public/PageHero'

// ISR: served from cache, refreshed every 5 minutes and on admin edits
// (lib/public/revalidate.ts).
export const revalidate = 300

type Params = { locale: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.impressum' })
  return { title: t('title') }
}

export default async function ImpressumPage({ params }: { params: Promise<Params> }) {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  // Lets next-intl resolve the locale without reading request headers,
  // which would opt the page out of ISR.
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'public.impressum' })

  const contacts = await getAllContacts()
  const text = renderImpressum(contacts, locale).trim()

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} />

      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
        {text ? (
          <div className="whitespace-pre-line text-ink leading-relaxed text-[15px]">{text}</div>
        ) : (
          <p className="text-ink-soft">{t('notAvailable')}</p>
        )}
      </div>
    </>
  )
}
