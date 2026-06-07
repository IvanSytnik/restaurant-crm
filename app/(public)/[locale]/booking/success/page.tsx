import { type Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { resolvePublicLocale, pathForLocale } from '@/lib/public/locale'
import { type Locale } from '@/i18n/config'
import { PageHero } from '@/components/public/PageHero'

export const dynamic = 'force-dynamic'

type Params = { locale: string }
type SearchParams = { id?: string }

const LOCALE_TAGS: Record<Locale, string> = {
  de: 'de-AT',
  en: 'en-GB',
  uk: 'uk-UA',
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: urlSeg } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.booking.success' })
  return { title: t('title') }
}

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<SearchParams>
}) {
  const { locale: urlSeg } = await params
  const sp = await searchParams
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.booking.success' })

  const id = sp.id
  if (!id) redirect(pathForLocale(locale, 'booking'))

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: {
      id: true,
      startTime: true,
      guestCount: true,
      table: { select: { name: true } },
    },
  })

  if (!reservation) redirect(pathForLocale(locale, 'booking'))

  const tag = LOCALE_TAGS[locale] ?? 'de-AT'
  const dateStr = new Intl.DateTimeFormat(tag, {
    timeZone: 'Europe/Vienna',
    dateStyle: 'long',
  }).format(reservation.startTime)
  const timeStr = new Intl.DateTimeFormat(tag, {
    timeZone: 'Europe/Vienna',
    timeStyle: 'short',
  }).format(reservation.startTime)

  return (
    <>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} />

      <div className="max-w-2xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
        <div className="bg-cream border border-[var(--border)] p-8 sm:p-12">
          <p className="text-base text-ink leading-relaxed mb-8">{t('confirmationSent')}</p>

          <dl className="space-y-5 pt-6 border-t border-[var(--border)]">
            <Row label={t('date')} value={dateStr} />
            <Row label={t('time')} value={timeStr} />
            <Row label={t('guests')} value={String(reservation.guestCount)} />
            <Row label={t('table')} value={reservation.table.name} />
          </dl>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href={pathForLocale(locale, '')}
            className="inline-block bg-ink text-cream px-8 py-4 text-xs tracking-[0.25em] uppercase text-center hover:bg-black transition-colors"
          >
            {t('backHome')}
          </Link>
          <Link
            href={pathForLocale(locale, 'menu')}
            className="inline-block border border-ink text-ink px-8 py-4 text-xs tracking-[0.25em] uppercase text-center hover:bg-ink hover:text-cream transition-colors"
          >
            {t('viewMenu')}
          </Link>
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[11px] tracking-widest uppercase text-ink-soft">{label}</dt>
      <dd className="font-display text-lg text-ink text-right">{value}</dd>
    </div>
  )
}
