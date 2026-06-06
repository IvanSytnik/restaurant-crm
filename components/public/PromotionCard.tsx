import Link from 'next/link'
import { type Locale } from '@/i18n/config'
import { pickTitle, pickDescription } from '@/lib/menu/i18n'
import { getPromotionStatus, type PromotionStatus } from '@/lib/promotions'
import { pathForLocale } from '@/lib/public/locale'
import { formatDateRange } from '@/lib/format'
import { PromotionStatusBadge } from './PromotionStatusBadge'

type Promo = {
  id: string
  slug: string
  titleDE: string
  titleEN: string | null
  titleUK: string | null
  descriptionDE: string | null
  descriptionEN: string | null
  descriptionUK: string | null
  imageUrl: string | null
  startDate: Date | string
  endDate: Date | string
  isActive: boolean
  isArchived: boolean
}

type Props = {
  promo: Promo
  locale: Locale
  labels: {
    active: string
    scheduled: string
    expired: string
    readMore: string
  }
}

export function PromotionCard({ promo, locale, labels }: Props) {
  const status: PromotionStatus = getPromotionStatus(promo)
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
  const href = pathForLocale(locale, `promotions/${promo.slug}`)

  return (
    <Link
      href={href}
      className="group block bg-cream border border-[var(--border)] hover:border-ink transition-colors"
    >
      <div className="aspect-[16/10] overflow-hidden bg-cream-soft">
        {promo.imageUrl ? (
          <img
            src={promo.imageUrl}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-ink-soft/40 font-display text-2xl">
            {title}
          </div>
        )}
      </div>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4 mb-3">
          <PromotionStatusBadge
            status={status}
            labelActive={labels.active}
            labelScheduled={labels.scheduled}
            labelExpired={labels.expired}
          />
          <span className="text-xs text-ink-soft">{dateRange}</span>
        </div>
        <h3 className="font-display text-2xl sm:text-3xl text-ink leading-tight">{title}</h3>
        {description && (
          <p className="mt-3 text-sm text-ink-soft line-clamp-3">{description}</p>
        )}
        <p className="mt-5 text-[11px] tracking-widest uppercase text-ink group-hover:text-accent transition-colors">
          {labels.readMore} →
        </p>
      </div>
    </Link>
  )
}
