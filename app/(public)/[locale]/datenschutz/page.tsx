import { type Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { resolvePublicLocale } from '@/lib/public/locale'
import { getAllContacts } from '@/lib/contacts'
import { PageHero } from '@/components/public/PageHero'

export const dynamic = 'force-dynamic'

type Params = { locale: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.datenschutz' })
  return { title: t('title') }
}

export default async function DatenschutzPage({ params }: { params: Promise<Params> }) {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.datenschutz' })

  const contacts = await getAllContacts()
  const text =
    locale === 'de'
      ? contacts.privacy_text_de
      : locale === 'en'
        ? contacts.privacy_text_en || contacts.privacy_text_de
        : contacts.privacy_text_uk || contacts.privacy_text_de

  const dpoContact = contacts.dpo_contact
  const dpoName = contacts.dpo_name

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} />

      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
        {text?.trim() ? (
          <div className="whitespace-pre-line text-ink leading-relaxed text-[15px]">{text}</div>
        ) : (
          <p className="text-ink-soft">{t('notAvailable')}</p>
        )}

        {(dpoContact || dpoName) && (
          <div className="mt-12 pt-8 border-t border-[var(--border)]">
            <p className="text-[11px] tracking-widest uppercase text-ink-soft mb-2">
              {t('dataRequestsTitle')}
            </p>
            {dpoName && <p className="text-ink">{dpoName}</p>}
            {dpoContact && <p className="text-ink">{dpoContact}</p>}
          </div>
        )}
      </div>
    </>
  )
}
