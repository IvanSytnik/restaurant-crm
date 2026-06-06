import { type Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import { resolvePublicLocale, pathForLocale } from '@/lib/public/locale'
import { pickTitle, pickDescription } from '@/lib/menu/i18n'
import { getPromotionStatus } from '@/lib/promotions'
import { formatDateRange } from '@/lib/format'
import { PromotionStatusBadge } from '@/components/public/PromotionStatusBadge'

export const dynamic = 'force-dynamic'

type Params = { locale: string; slug: string }

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale: urlSeg, slug } = await params
  const locale = resolvePublicLocale(urlSeg)
  const p = await prisma.promotion.findUnique({
    where: { slug },
    select: { titleDE: true, titleEN: true, titleUK: true },
  })
  if (!p) return {}
  return {
    title: pickTitle({ titleDE: p.titleDE, titleEN: p.titleEN, titleUK: p.titleUK }, locale),
  }
}

export default async function PromotionDetailPage({ params }: { params: Promise<Params> }) {
  const { locale: urlSeg, slug } = await params
  const locale = resolvePublicLocale(urlSeg)
  const t = await getTranslations({ locale, namespace: 'public.promotionsPage' })
  const tStatus = await getTranslations({ locale, namespace: 'public.promotionsPage.status' })
  const tDays = await getTranslations({ locale, namespace: 'public.promotionsPage.days' })

  const promo = await prisma.promotion.findUnique({ where: { slug } })
  if (!promo || promo.isArchived) notFound()

  const status = getPromotionStatus(promo)
  const title = pickTitle({ titleDE: promo.titleDE, titleEN: promo.titleEN, titleUK: promo.titleUK }, locale)
  const description = pickDescription(
    {
      descriptionDE: promo.descriptionDE,
      descriptionEN: promo.descriptionEN,
      descriptionUK: promo.descriptionUK,
    },
    locale
  )
  const dateRange = formatDateRange(promo.startDate, promo.endDate, locale)
  const hasDays = promo.daysOfWeek && promo.daysOfWeek.length > 0
  const hasHours = !!(promo.startTime && promo.endTime)

  return (
    <article className="bg-cream">
      {/* Hero image (if exists) */}
      {promo.imageUrl ? (
        <div className="relative h-[50svh] min-h-[360px] w-full overflow-hidden bg-ink">
          <img
            src={promo.imageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink/60" />
          <div className="absolute inset-x-0 bottom-0 px-6 lg:px-12 pb-12 lg:pb-16">
            <div className="max-w-5xl mx-auto">
              <PromotionStatusBadge
                status={status}
                labelActive={tStatus('ACTIVE')}
                labelScheduled={tStatus('SCHEDULED')}
                labelExpired={tStatus('EXPIRED')}
              />
              <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl text-cream leading-tight">
                {title}
              </h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-32 pb-12 lg:pt-40 lg:pb-16 border-b border-[var(--border)]">
          <div className="max-w-5xl mx-auto px-6 lg:px-12">
            <PromotionStatusBadge
              status={status}
              labelActive={tStatus('ACTIVE')}
              labelScheduled={tStatus('SCHEDULED')}
              labelExpired={tStatus('EXPIRED')}
            />
            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl text-ink leading-tight">
              {title}
            </h1>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
        {description && (
          <div className="text-lg text-ink leading-relaxed whitespace-pre-line">{description}</div>
        )}

        {/* Meta */}
        <dl className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-[var(--border)]">
          <div>
            <dt className="text-[11px] tracking-widest uppercase text-ink-soft">{t('validFrom')}</dt>
            <dd className="mt-2 font-display text-lg text-ink">{dateRange}</dd>
          </div>

          {hasDays && (
            <div>
              <dt className="text-[11px] tracking-widest uppercase text-ink-soft">{t('daysOfWeek')}</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {promo.daysOfWeek.map((d) => (
                  <span
                    key={d}
                    className="px-2.5 py-1 text-xs uppercase tracking-wider border border-[var(--border)] text-ink"
                  >
                    {tDays(DAY_KEYS[d])}
                  </span>
                ))}
              </dd>
            </div>
          )}

          {hasHours && (
            <div>
              <dt className="text-[11px] tracking-widest uppercase text-ink-soft">{t('hours')}</dt>
              <dd className="mt-2 font-display text-lg text-ink">
                {promo.startTime} – {promo.endTime}
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-12">
          <Link
            href={pathForLocale(locale, 'promotions')}
            className="text-xs tracking-widest uppercase text-ink-soft hover:text-ink"
          >
            ← {t('backToList')}
          </Link>
        </div>
      </div>
    </article>
  )
}
